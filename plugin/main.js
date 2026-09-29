// Figma plugin for paper-to-figma. Bundled to plugin/code.js with `bun run build:plugin`.
// Commands arrive from the paired local agent through the UI iframe. Scripts run only when the user ticks
// "Allow scripts" in the plugin window.
import { createKit } from "../kit/index.js";

const MAX_CHUNK = 3 * 1024 * 1024; // large exports come back in 3 MB slices; one 20 MB message froze the plugin

export function installPlugin(figma, html) {
  figma.showUI(html, { width: 380, height: 430 });
  let queue = Promise.resolve();
  let allowScripts = false;
  let kitReady = null;
  const exports = new Map();
  const kit = createKit(figma);
  const ensureKit = () => (kitReady ||= kit.init());

  async function node(id) {
    const n = await figma.getNodeByIdAsync(id);
    if (!n) throw new Error("Node not found: " + id);
    return n;
  }
  async function byName(name, pageName) {
    const pages = pageName ? figma.root.children.filter((p) => p.name === pageName) : [figma.currentPage];
    for (const p of pages) {
      await p.loadAsync();
      const n = p.children.find((c) => c.name === name);
      if (n) return n;
    }
    throw new Error(`No top-level frame named "${name}"`);
  }
  const target = (params) => (params.nodeId ? node(params.nodeId) : byName(params.name, params.page));

  // New nodes appear on the current page first. On a heavy page that is slow, so switch to the target page, and remove
  // whatever a failed build or script left behind.
  async function onPage(name) {
    if (!name || figma.currentPage.name === name) return;
    const p = figma.root.children.find((x) => x.name === name);
    if (!p) throw new Error(`page not found: ${name}`);
    await figma.setCurrentPageAsync(p);
  }
  async function guarded(fn) {
    const before = new Set(figma.currentPage.children.map((n) => n.id));
    try {
      return await fn();
    } catch (e) {
      for (const n of [...figma.currentPage.children]) if (!before.has(n.id)) n.remove();
      throw e;
    }
  }

  async function run(command, params) {
    if (command === "document")
      return {
        page: { id: figma.currentPage.id, name: figma.currentPage.name },
        pages: figma.root.children.map((p) => p.name),
        frames: figma.currentPage.children.map((n) => ({ id: n.id, name: n.name, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height })),
        allowScripts,
      };
    if (command === "fonts") return (await figma.listAvailableFontsAsync()).map((f) => f.fontName).filter((f) => !params.family || f.family.toLowerCase().includes(params.family.toLowerCase()));
    if (command === "inspect") return kit.inspect(await target(params));
    if (command === "build") {
      // data-driven figure from a validated spec; no code from the agent runs here
      await ensureKit();
      await onPage(params.page);
      return await guarded(async () => kit.place(kit.renderSpec(params.spec), { pageName: params.page, name: params.spec.name, x: params.x, y: params.y }));
    }
    if (command === "script") {
      if (!allowScripts) throw new Error('Scripts are off. Tick "Allow scripts" in the plugin window to let the agent run a figure script.');
      await ensureKit();
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction("figma", "kit", "args", params.code);
      const args = params.args || {};
      args.page ??= params.page;
      await onPage(args.page);
      return await guarded(() => fn(figma, kit, args));
    }
    if (command === "export") {
      const n = await target(params);
      if (!("exportAsync" in n)) throw new Error("Node cannot be exported");
      const format = params.format || "PDF";
      if (!["PNG", "PDF", "SVG"].includes(format)) throw new Error("Unsupported export format");
      const { images } = await kit.prepareExport(n); // images and fonts loaded, one warm-up render
      const settings = format === "PNG" ? { format, constraint: { type: "SCALE", value: params.scale || 2 } } : { format };
      const b64 = figma.base64Encode(await n.exportAsync(settings));
      const key = Math.random().toString(36).slice(2);
      exports.set(key, b64);
      return { key, format, nodeId: n.id, name: n.name, width: n.width, height: n.height, images, length: b64.length, chunks: Math.ceil(b64.length / MAX_CHUNK) };
    }
    if (command === "chunk") {
      const b64 = exports.get(params.key);
      if (!b64) throw new Error("Unknown export key");
      const i = params.index | 0;
      const data = b64.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK);
      if ((i + 1) * MAX_CHUNK >= b64.length) exports.delete(params.key);
      return { index: i, data };
    }
    throw new Error("Unknown command: " + command);
  }

  figma.ui.onmessage = (p) => {
    if (p?.type === "settings") {
      allowScripts = !!p.allowScripts;
      return;
    }
    if (p?.type !== "request" || typeof p.id !== "string") return;
    queue = queue.then(async () => {
      try {
        figma.ui.postMessage({ type: "response", id: p.id, result: await run(p.command, p.params || {}) });
      } catch (e) {
        figma.ui.postMessage({ type: "response", id: p.id, error: String(e?.message || e) });
      }
    });
  };
}

if (typeof figma !== "undefined") installPlugin(figma, __html__);
