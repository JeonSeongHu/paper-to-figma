// Connection to the Figma plugin. Two transports:
//   paired         this repository's relay (127.0.0.1:3057) and plugin, with a private pairing code (default)
//   talk-to-figma  an already running Talk to Figma relay (port 3055) whose plugin has an execute_code command;
//                  every command is sent as a script with the kit bundled in (kit/dist/kit.js)
import fs from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";
import { ROOT } from "./files.mjs";

const LOCAL = ["localhost", "127.0.0.1", "[::1]"];

function localUrl(endpoint) {
  const url = new URL(endpoint);
  if (url.protocol !== "ws:" || !LOCAL.includes(url.hostname)) throw new Error("Only local ws:// relay addresses are allowed");
  return url;
}

// Paired transport: request(command, params) -> result
export async function connectPaired({ endpoint = "ws://127.0.0.1:3057", channel, timeout = 180000 } = {}) {
  localUrl(endpoint);
  if (!/^[a-zA-Z0-9_-]{12,128}$/.test(channel || "")) throw new Error("Pairing code required (12..128 characters). Run bun run setup.");
  const ws = new WebSocket(endpoint);
  const pending = new Map();
  let readyResolve, readyReject;
  const ready = new Promise((res, rej) => ((readyResolve = res), (readyReject = rej)));
  const readyTimer = setTimeout(() => {
    readyReject(new Error("Relay connection timed out"));
    ws.close();
  }, 5000);
  ws.on("open", () => ws.send(JSON.stringify({ type: "join", channel, role: "agent" })));
  ws.on("message", (data) => {
    let p;
    try {
      p = JSON.parse(String(data));
    } catch {
      return;
    }
    if (p?.type === "joined") {
      clearTimeout(readyTimer);
      readyResolve();
      return;
    }
    if (p?.type !== "response") return;
    const item = pending.get(p.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(p.id);
    p.error ? item.reject(new Error(p.error)) : item.resolve(p.result);
  });
  ws.on("error", () => {
    clearTimeout(readyTimer);
    readyReject(new Error("Relay unavailable; run bun run relay"));
  });
  ws.on("close", () => {
    clearTimeout(readyTimer);
    readyReject(new Error("Relay closed"));
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error("Relay closed"));
    }
    pending.clear();
  });
  await ready;
  return {
    transport: "paired",
    request(command, params = {}, ms = timeout) {
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${command} timed out after ${ms} ms. A write may have completed; inspect the page before retrying.`));
        }, ms);
        pending.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify({ type: "request", id, command, params }));
      });
    },
    close: () => ws.close(),
  };
}

// Script bodies that emulate the plugin commands on top of execute_code.
const TARGET = `async function __target(p) {
  if (p.nodeId) { const n = await figma.getNodeByIdAsync(p.nodeId); if (!n) throw new Error("Node not found: " + p.nodeId); return n; }
  const pages = p.page ? figma.root.children.filter((x) => x.name === p.page) : [figma.currentPage];
  for (const pg of pages) { await pg.loadAsync(); const n = pg.children.find((c) => c.name === p.name); if (n) return n; }
  throw new Error('No top-level frame named "' + p.name + '"');
}`;
const GUARD = `async function __onPage(name) {
  if (!name || figma.currentPage.name === name) return;
  const p = figma.root.children.find((x) => x.name === name);
  if (!p) throw new Error("page not found: " + name);
  await figma.setCurrentPageAsync(p);
}
async function __guarded(fn) {
  const before = new Set(figma.currentPage.children.map((n) => n.id));
  try { return await fn(); } catch (e) { for (const n of [...figma.currentPage.children]) if (!before.has(n.id)) n.remove(); throw e; }
}`;
// New nodes appear on the current page first: switch to the target page (a heavy page makes builds slow) and remove
// whatever a failed build or script left behind.
export function compatScript(kitSource, command, params) {
  const P = JSON.stringify(params);
  const pre = `${kitSource}
const kit = globalThis.createPaperKit(figma);
const __p = ${P};
${TARGET}
${GUARD}
`;
  switch (command) {
    case "document":
      return `${pre}return { page: { id: figma.currentPage.id, name: figma.currentPage.name }, pages: figma.root.children.map((p) => p.name), frames: figma.currentPage.children.map((n) => ({ id: n.id, name: n.name, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height })), allowScripts: true };`;
    case "inspect":
      return `${pre}return kit.inspect(await __target(__p));`;
    case "build":
      return `${pre}await kit.init();
await __onPage(__p.page);
return await __guarded(async () => kit.place(kit.renderSpec(__p.spec), { pageName: __p.page, name: __p.spec.name, x: __p.x, y: __p.y }));`;
    case "script":
      return `${pre}await kit.init();
const args = __p.args || {};
args.page ??= __p.page;
await __onPage(args.page);
return await __guarded(async () => {
${params.code}
});`;
    case "export":
      return `${pre}const n = await __target(__p);\nconst { images } = await kit.prepareExport(n);\nconst fmt = __p.format || "PDF";\nconst b64 = figma.base64Encode(await n.exportAsync(fmt === "PNG" ? { format: fmt, constraint: { type: "SCALE", value: __p.scale || 2 } } : { format: fmt }));\nconst key = Math.random().toString(36).slice(2);\n(globalThis.__p2f ||= {})[key] = b64;\nreturn { key, format: fmt, nodeId: n.id, name: n.name, width: n.width, height: n.height, images, length: b64.length, chunks: Math.ceil(b64.length / ${3 * 1024 * 1024}) };`;
    case "chunk":
      return `const __p = ${P};\nconst b = (globalThis.__p2f || {})[__p.key];\nif (!b) throw new Error("Unknown export key");\nconst S = ${3 * 1024 * 1024}, i = __p.index | 0;\nconst data = b.slice(i * S, (i + 1) * S);\nif ((i + 1) * S >= b.length) delete globalThis.__p2f[__p.key];\nreturn { index: i, data };`;
    case "fonts":
      return `const __p = ${P};\nreturn (await figma.listAvailableFontsAsync()).map((f) => f.fontName).filter((f) => !__p.family || f.family.toLowerCase().includes(__p.family.toLowerCase()));`;
    default:
      throw new Error("Unknown command: " + command);
  }
}

// The kit bundle sent with every compat command. Rebuilt when a kit source file is newer than the bundle, so a stale
// bundle never draws a figure with old rules.
export async function kitBundle() {
  const dist = path.join(ROOT, "kit", "dist", "kit.js");
  const srcDir = path.join(ROOT, "kit");
  const newest = Math.max(...(await Promise.all((await fs.readdir(srcDir)).filter((f) => f.endsWith(".js")).map(async (f) => (await fs.stat(path.join(srcDir, f))).mtimeMs))));
  const built = await fs.stat(dist).then((st) => st.mtimeMs, () => 0);
  if (built < newest) {
    if (typeof Bun === "undefined") throw new Error("kit/dist/kit.js is older than kit/; run bun run build:kit");
    console.error("kit/ changed since the last bundle: rebuilding kit/dist/kit.js ...");
    const r = await Bun.build({ entrypoints: [path.join(srcDir, "index.js")], outdir: path.dirname(dist), naming: "kit.js", target: "browser", format: "iife" });
    if (!r.success) throw new Error("kit build failed: " + r.logs.map(String).join("; "));
  }
  return fs.readFile(dist, "utf8");
}

// Talk to Figma transport.
// Before the first command that draws or exports, two short requests check the plugin. The first loads the kit's
// fonts: a plugin that does not answer fails here within fontCheck ms instead of after the whole timeout. The second
// waits for a 1 ms timer. While the Figma window is covered by other windows or minimized, Chromium holds its delayed
// timers back, sometimes for many minutes. The kit does not wait on such timers, but a script that does (setTimeout,
// or more than five font loads awaited one after another) would hang, so when the timer has not fired within
// timerCheck ms, warn() says so and the command still runs.
export async function connectTalkToFigma({ port = 3055, channel, timeout = 180000, fontCheck = 15000, timerCheck = 2000, warn = console.error } = {}) {
  if (!channel) throw new Error("Talk to Figma channel required (shown in its plugin window)");
  const kitSource = await kitBundle();
  const endpoint = `ws://localhost:${port}`;
  localUrl(endpoint);
  const ws = new WebSocket(endpoint);
  const pending = new Map();
  let readyResolve, readyReject;
  const ready = new Promise((res, rej) => ((readyResolve = res), (readyReject = rej)));
  const readyTimer = setTimeout(() => readyReject(new Error("Talk to Figma relay did not answer")), 5000);
  ws.on("open", () => ws.send(JSON.stringify({ type: "join", channel })));
  ws.on("message", (data) => {
    let json;
    try {
      json = JSON.parse(String(data));
    } catch {
      return;
    }
    if (json.type === "system" && typeof json.message === "string" && json.message.startsWith("Joined channel")) {
      clearTimeout(readyTimer);
      readyResolve();
      return;
    }
    const msg = json.message;
    if (!msg || msg.command || !pending.has(msg.id)) return; // our own echo carries `command`
    if (!("result" in msg) && !("error" in msg)) return;
    const item = pending.get(msg.id);
    clearTimeout(item.timer);
    pending.delete(msg.id);
    msg.error ? item.reject(new Error(String(msg.error))) : item.resolve(msg.result?.result ?? msg.result);
  });
  ws.on("error", () => {
    clearTimeout(readyTimer);
    readyReject(new Error(`Talk to Figma relay unavailable on port ${port}`));
  });
  ws.on("close", () => {
    clearTimeout(readyTimer);
    readyReject(new Error("Talk to Figma relay closed"));
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error("Talk to Figma relay closed"));
    }
    pending.clear();
  });
  await ready;
  const send = (code, ms, timeoutMessage) => {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(timeoutMessage));
      }, ms);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, type: "message", channel, message: { id, command: "execute_code", params: { code, commandId: id } } }));
    });
  };
  let checked = false;
  return {
    transport: "talk-to-figma",
    async request(command, params = {}, ms = timeout) {
      if (!checked && ["build", "script", "export"].includes(command)) {
        const fonts = `${kitSource}\nawait globalThis.createPaperKit(figma).init();\nreturn true;`;
        await send(fonts, fontCheck, `Figma did not load the kit's fonts within ${fontCheck / 1000} s. Bring the Figma window to the front; if that does not help, close and reopen the plugin, then retry.`);
        const timers = await send("await new Promise((r) => setTimeout(r, 1));\nreturn true;", timerCheck, "").then(() => true, () => false);
        if (!timers) warn(`warning: Figma is holding back the plugin's timers (a 1 ms timer did not fire within ${timerCheck / 1000} s), as it does while its window is covered or minimized. The kit works without them, but a script that waits on setTimeout, or awaits more than five font loads one after another, would hang: bring Figma to the front or leave part of its window visible.`);
        checked = true;
      }
      return send(compatScript(kitSource, command, params), ms, `${command} timed out after ${ms} ms. A write may have completed; inspect the page before retrying.`);
    },
    close: () => ws.close(),
  };
}

export async function openBridge(config) {
  if (config.transport === "talk-to-figma") return connectTalkToFigma(config);
  return connectPaired(config);
}

// Export a node and reassemble the chunks into a Buffer. An export is read-only, so a timed-out one (Figma is sometimes
// slow right after a build) is tried once more.
export async function exportNode(client, target, { format = "PDF", scale } = {}) {
  let meta;
  try {
    meta = await client.request("export", { ...target, format, scale });
  } catch (e) {
    if (!/timed out/.test(e.message)) throw e;
    console.error("export timed out; trying once more");
    meta = await client.request("export", { ...target, format, scale });
  }
  let b64 = "";
  for (let i = 0; i < meta.chunks; i++) b64 += (await client.request("chunk", { key: meta.key, index: i })).data;
  if (b64.length !== meta.length) throw new Error(`export incomplete: ${b64.length} of ${meta.length} characters`);
  return { meta, bytes: Buffer.from(b64, "base64") };
}
