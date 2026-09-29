// Operations shared by the CLI and the MCP server.
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, settings } from "./files.mjs";
import { openBridge } from "./bridge.mjs";
import { gateSpec } from "./specgate.mjs";
import { checkSpec } from "./evidence.mjs";
import { autoLayout } from "../kit/layout.js";
import { OURS, SECOND, HOLE, DENSITY } from "../kit/spec.js";

export const slug = (s) => String(s).replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_|_$/g, "").slice(0, 80) || "figure";

export async function client() {
  return openBridge(await settings());
}
export async function loadSource(name) {
  if (!name) throw new Error("--paper N required (the name given to prepare)");
  const dir = path.join(ROOT, "work", slug(name));
  const index = JSON.parse(await fs.readFile(path.join(dir, "source-index.json"), "utf8"));
  const text = await fs.readFile(path.join(dir, "source.txt"), "utf8");
  return { dir, index, text };
}
// One colour, one meaning across the whole paper (docs/figure-principles.md, principles 8 and 9). work/<paper>/palette.json
// records which method each saturated colour stands for. The accent always means "ours" (any of our variants). The
// second colour (sand) belongs to the first method that takes it and never to another one. Grays are context: inside a
// figure they go from dark to light in the order the methods are listed, and they may mean different methods in
// different figures.
const RAMP = ["#4B5563", "#6B7280", "#9AA2AD", "#C3C8CF", "#DDE1E6"];
const PICK = { 1: [1], 2: [1, 3], 3: [1, 2, 3], 4: [0, 1, 2, 3], 5: [0, 1, 2, 3, 4] };
const isGray = (c) => RAMP.includes(c.toUpperCase()) || /^#(BCC2CA|D5D9DE|E4E7EB)$/i.test(c);
export function assignColors(spec, palette) {
  const warnings = [];
  // colours a diagram of this paper gave a meaning to belong to that meaning too
  const owner = Object.fromEntries([
    ...Object.entries(palette["@diagram"] || {}).map(([c, e]) => [c.toUpperCase(), `${typeof e === "string" ? e : e.text} (diagram)`]),
    ...Object.entries(palette).filter(([, c]) => typeof c === "string").map(([label, c]) => [c.toUpperCase(), label]),
  ]);
  const used = new Set();
  const grayQueue = [];
  for (const m of spec.methods || []) {
    const label = String(m.label);
    if (m.ours) {
      m.color ||= OURS.deep;
      used.add(m.color.toUpperCase());
      continue;
    }
    const want = m.color?.toUpperCase();
    if (want) {
      if (palette[label] && palette[label].toUpperCase() !== want && !(isGray(want) && isGray(palette[label]))) warnings.push(`colour: "${label}" is ${want} here but ${palette[label]} in another figure of this paper; one method keeps one colour`);
      if (want === OURS.deep.toUpperCase()) warnings.push(`colour: "${label}" is not ours but uses the accent`);
      else if (owner[want] && owner[want] !== label && !isGray(want)) warnings.push(`colour: ${want} means "${owner[want]}" in another figure of this paper, "${label}" here; one colour keeps one meaning`);
    } else if (palette[label] && !used.has(palette[label].toUpperCase())) m.color = palette[label];
    else if (!owner[SECOND.deep.toUpperCase()] && !used.has(SECOND.deep.toUpperCase())) m.color = SECOND.deep;
    else {
      grayQueue.push(m);
      continue;
    }
    used.add(m.color.toUpperCase());
    if (!isGray(m.color) && !palette[label]) {
      palette[label] = m.color;
      owner[m.color.toUpperCase()] ??= label;
    }
  }
  const free = RAMP.filter((g) => !used.has(g));
  const picks = PICK[Math.min(grayQueue.length, 5)] || [];
  grayQueue.forEach((m, i) => (m.color = (free.length === RAMP.length ? RAMP[picks[i]] : free[Math.min(i, free.length - 1)]) || RAMP.at(-1)));
  if (grayQueue.length > 5) warnings.push(`${grayQueue.length} gray methods: grays repeat; label the bars or lines directly or split the figure`);
  return warnings;
}

// Fill in the layout the spec leaves out, then gate and check it. The resolved spec is saved next to the report.
export async function checkFile(specPath, paper) {
  const raw = JSON.parse(await fs.readFile(specPath, "utf8"));
  const { spec, decisions, warnings } = autoLayout(raw);
  const source = await loadSource(paper);
  const palettePath = path.join(source.dir, "palette.json");
  const palette = JSON.parse(await fs.readFile(palettePath, "utf8").catch(() => "{}"));
  const colourWarnings = assignColors(spec, palette);
  await fs.writeFile(palettePath, JSON.stringify(palette, null, 1));
  const gate = gateSpec(spec);
  gate.warnings.unshift(...warnings, ...colourWarnings);
  const ev = checkSpec(spec, source);
  const out = path.join(source.dir, `check-${slug(spec.name)}.json`);
  await fs.writeFile(out, JSON.stringify({ layout: decisions, gate, evidence: { summary: ev.summary, lowConfidence: ev.lowConfidence, report: ev.report } }, null, 2));
  await fs.writeFile(path.join(source.dir, `resolved-${slug(spec.name)}.json`), JSON.stringify(spec, null, 1));
  return { spec, decisions, gate, ev, out };
}
// Checks of a diagram that need the render or the paper: an empty region larger than a module (principle 17), and the
// colours the diagram gave a meaning to against the colours the paper's charts give to methods (principle 8).
export async function diagramReview(data, judged, qa, paperDir) {
  const warnings = [];
  if (judged.kind !== "diagram") return warnings;
  if (data.meta?.type !== "qualitative" && qa.largest_hole_px && qa.largest_hole_share >= HOLE.area) {
    const [x, y, w, h] = qa.largest_hole_px;
    warnings.push(`empty region ${w} x ${h} px at (${x}, ${y}), ${(qa.largest_hole_share * 100).toFixed(1)}% of the figure; close it (a comparison panel keeps no slot for a part only the other panel has) or put something that belongs there`);
  }
  if (data.meta?.type !== "qualitative" && qa.coverage != null && qa.coverage < DENSITY.minCoverage)
    warnings.push(`only ${(qa.coverage * 100).toFixed(0)}% of the figure is near an element (approved figures about 50%): the space is spread thin. Close gaps between repeated units, shorten long connectors, or put information (durations, names) in the space`);
  const meanings = data.meta?.meanings || {};
  if (Object.keys(meanings).length && paperDir) {
    const file = path.join(paperDir, "palette.json");
    const palette = JSON.parse(await fs.readFile(file, "utf8").catch(() => "{}"));
    // palette["@diagram"][hex] = { text, frame }: a frame may change its own declaration; another frame may not
    const diagram = (palette["@diagram"] ||= {});
    const frame = data.name;
    for (const [hex, entry] of Object.entries(diagram)) if (typeof entry === "string") diagram[hex] = { text: entry, frame: "" };
    for (const [hex, text] of Object.entries(meanings)) {
      if (hex === OURS.deep.toUpperCase()) continue; // the accent means ours everywhere
      const method = Object.entries(palette).find(([label, c]) => typeof c === "string" && c.toUpperCase() === hex)?.[0];
      const prev = diagram[hex];
      if (method) warnings.push(`colour ${hex} means "${text}" in this diagram but the method "${method}" in the charts of this paper; one colour keeps one meaning`);
      else if (prev && prev.text !== text && prev.frame && prev.frame !== frame) warnings.push(`colour ${hex} means "${text}" here but "${prev.text}" in "${prev.frame}"; one colour keeps one meaning (change one of the two declarations)`);
      else diagram[hex] = { text, frame };
    }
    await fs.writeFile(file, JSON.stringify(palette, null, 1));
  }
  return warnings;
}

// The print size and role sizes a frame is judged at: an explicit value, else what kit.place stored on the frame when it
// was built (exact for the drawn width), else the spec.
export async function judgedAs(data, { placement, kind, specPath } = {}) {
  let fromSpec = {};
  if (specPath) {
    const s = autoLayout(JSON.parse(await fs.readFile(specPath, "utf8"))).spec;
    fromSpec = { placement: s.placement, kind: s.kind === "radar" ? "radar" : "chart" };
  }
  return { placement: placement ?? data.meta?.placement ?? fromSpec.placement ?? 1, kind: kind ?? data.meta?.kind ?? fromSpec.kind ?? "diagram" };
}
export function runQa(pdf, outDir) {
  const py = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
  const r = spawnSync(py, [path.join(ROOT, "scripts", "pdf_qa.py"), pdf, "--hole-side", String(HOLE.side), ...(outDir ? ["--out", outDir] : [])], { encoding: "utf8" });
  if (r.error) throw new Error(`cannot run ${py}: ${r.error.message}`);
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error("pdf_qa.py failed: " + (r.stderr || r.stdout).slice(0, 400));
  }
}
