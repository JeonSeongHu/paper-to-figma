import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function within(root, file) {
  const rel = path.relative(root, file);
  return rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
}

// Read a file the agent names. Paths are repository-relative and must stay inside work/ or examples/.
export async function safeRead(relative, { roots = ["work", "examples"], encoding = "utf8", maxBytes = 24 * 1024 * 1024 } = {}) {
  if (typeof relative !== "string" || path.isAbsolute(relative)) throw Error("Use a repository-relative path");
  const full = await fs.realpath(path.resolve(ROOT, relative));
  if (!roots.some((dir) => within(path.join(ROOT, dir), full))) throw Error(`File must be inside ${roots.join("/ or ")}/; symlink escapes are rejected`);
  const stat = await fs.stat(full);
  if (!stat.isFile() || stat.size > maxBytes) throw Error(`Expected a file of at most ${maxBytes} bytes`);
  return fs.readFile(full, encoding);
}

// Create an output directory inside work/ or .private/ and refuse links that leave the repository.
export async function outputDir(relative) {
  const full = path.resolve(ROOT, relative);
  if (!within(path.join(ROOT, "work"), full) && !within(path.join(ROOT, ".private"), full)) throw Error("Output must stay in work/ or .private/");
  let ancestor = full;
  while (true) {
    try {
      const real = await fs.realpath(ancestor);
      if (!within(ROOT, real) && real !== ROOT) throw Error("Output directory escapes repository");
      break;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      ancestor = path.dirname(ancestor);
    }
  }
  await fs.mkdir(full, { recursive: true });
  return full;
}

// Connection settings: .private/connection.json from `bun run setup`, overridable by environment variables.
//   P2F_TRANSPORT=talk-to-figma P2F_CHANNEL=<channel shown by Talk to Figma> [P2F_PORT=3055]
export async function settings() {
  let file = {};
  try {
    file = JSON.parse(await fs.readFile(path.join(ROOT, ".private", "connection.json"), "utf8"));
  } catch {}
  const env = process.env;
  const cfg = { transport: env.P2F_TRANSPORT || file.transport || "paired", ...file };
  if (env.P2F_TRANSPORT) cfg.transport = env.P2F_TRANSPORT;
  if (env.P2F_CHANNEL) cfg.channel = env.P2F_CHANNEL;
  if (env.P2F_PORT) cfg.port = Number(env.P2F_PORT);
  if (cfg.transport === "paired" && !cfg.channel) throw Error("No pairing code. Run bun run setup, or set P2F_TRANSPORT=talk-to-figma and P2F_CHANNEL.");
  return cfg;
}
