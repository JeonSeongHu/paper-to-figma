import { test, expect } from "bun:test";
import { startRelay } from "../src/relay.mjs";
import { connectPaired, connectTalkToFigma } from "../src/bridge.mjs";

// Both transports on real local sockets. Errors are caught with try/catch rather than expect().rejects, under which
// Bun did not deliver a socket's answer before the request timed out.
const failure = async (promise) => {
  try {
    await promise;
    return "";
  } catch (e) {
    return e.message;
  }
};

test("paired transport joins the relay and gets the relay's answer", async () => {
  const relay = await startRelay(0);
  try {
    const c = await connectPaired({ endpoint: `ws://127.0.0.1:${relay.port}`, channel: "test-pairing-code" });
    // no plugin is connected, so the relay itself answers the request
    expect(await failure(c.request("document", {}, 5000))).toContain("Figma plugin not connected");
    c.close();
  } finally {
    relay.stop();
  }
});

// A stand-in for the Talk to Figma relay and plugin: it confirms the join, and answers a script with 42 when
// answers(code) is true, or never, like a plugin that is stuck.
function fakeTalkToFigma(answers) {
  return Bun.serve({
    hostname: "localhost",
    port: 0,
    fetch(req, srv) {
      return srv.upgrade(req) ? undefined : new Response("WebSocket only", { status: 400 });
    },
    websocket: {
      message(ws, raw) {
        const m = JSON.parse(String(raw));
        if (m.type === "join") ws.send(JSON.stringify({ type: "system", message: `Joined channel: ${m.channel}`, channel: m.channel }));
        else if (m.message?.command === "execute_code" && answers(m.message.params.code)) ws.send(JSON.stringify({ type: "broadcast", message: { id: m.message.id, result: { success: true, result: 42 } }, sender: "peer", channel: m.channel }));
      },
    },
  });
}

test("talk-to-figma transport runs a script after the checks", async () => {
  const server = fakeTalkToFigma(() => true);
  try {
    const warnings = [];
    const c = await connectTalkToFigma({ port: server.port, channel: "test-channel", warn: (m) => warnings.push(m) });
    expect(await c.request("script", { code: "return 1;", args: {} }, 5000)).toBe(42);
    expect(warnings).toEqual([]);
    c.close();
  } finally {
    server.stop(true);
  }
});

test("talk-to-figma transport warns about stopped timers and still runs the script", async () => {
  // a plugin whose delayed timers never fire: it answers everything except a script that waits on setTimeout
  const server = fakeTalkToFigma((code) => !code.includes("setTimeout"));
  try {
    const warnings = [];
    const c = await connectTalkToFigma({ port: server.port, channel: "test-channel", timerCheck: 300, warn: (m) => warnings.push(m) });
    expect(await c.request("script", { code: "return 1;", args: {} }, 5000)).toBe(42);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("timer did not fire");
    c.close();
  } finally {
    server.stop(true);
  }
});

test("talk-to-figma transport reports a stuck plugin within the font check's limit", async () => {
  const server = fakeTalkToFigma(() => false);
  try {
    const c = await connectTalkToFigma({ port: server.port, channel: "test-channel", fontCheck: 300 });
    const t0 = Date.now();
    const message = await failure(c.request("script", { code: "return 1;", args: {} }, 4000));
    expect(message).toContain("Bring the Figma window to the front");
    expect(Date.now() - t0).toBeLessThan(2000);
    c.close();
  } finally {
    server.stop(true);
  }
});
