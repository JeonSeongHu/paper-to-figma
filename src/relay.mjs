import http from "node:http";
import { WebSocketServer } from "ws";

export async function startRelay(port = 3057) {
  const channels = new Map();
  const allowed = (req) => {
    const origin = req.headers.origin;
    return (
      !origin ||
      origin === "null" ||
      /^https:\/\/([a-z0-9-]+\.)?figma\.com$/.test(origin)
    );
  };
  const server = http.createServer((req, res) => {
    res.writeHead(allowed(req) ? 200 : 403);
    res.end(
      "paper-to-figma bridge: local WebSocket only. No files or credentials are served.",
    );
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 32 * 1024 * 1024,
  });
  server.on("upgrade", (req, socket, head) => {
    if (!allowed(req)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
  });
  wss.on("connection", (ws) => {
    let channel, role;
    ws.on("error", () => {});
    ws.on("message", (data) => {
      let p;
      try {
        p = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!p || typeof p !== "object" || Array.isArray(p)) return;
      if (p.type === "join") {
        if (
          channel ||
          !/^[a-zA-Z0-9_-]{12,128}$/.test(p.channel || "") ||
          !["agent", "plugin"].includes(p.role)
        ) {
          ws.close(1008, "Invalid pairing");
          return;
        }
        const peers = channels.get(p.channel) || new Map();
        if (peers.has(p.role)) {
          ws.close(1008, "Pairing role already occupied");
          return;
        }
        channel = p.channel;
        role = p.role;
        peers.set(role, ws);
        channels.set(channel, peers);
        ws.send(JSON.stringify({ type: "joined" }));
        return;
      }
      const peers = channels.get(channel);
      if (!peers) return;
      if (
        !(
          (role === "agent" && p.type === "request") ||
          (role === "plugin" && p.type === "response")
        )
      )
        return;
      const target = peers.get(role === "agent" ? "plugin" : "agent");
      if (target?.readyState === 1) target.send(JSON.stringify(p));
      else if (p.type === "request")
        ws.send(
          JSON.stringify({
            type: "response",
            id: p.id,
            error:
              "Figma plugin not connected. Open the plugin and pair with this code.",
          }),
        );
    });
    ws.on("close", () => {
      const peers = channels.get(channel);
      if (peers?.get(role) === ws) peers.delete(role);
      if (peers?.size === 0) channels.delete(channel);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    port: server.address().port,
    stop() {
      for (const ws of wss.clients) ws.terminate();
      wss.close();
      server.closeAllConnections();
      server.close();
    },
  };
}
if (import.meta.main) {
  const relay = await startRelay(Number(process.env.P2F_PORT || 3057));
  console.log("paper-to-figma relay listening on 127.0.0.1:" + relay.port);
}
