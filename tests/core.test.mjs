import { test, expect } from "bun:test";
import path from "node:path";
import { niceTicks, fixedTicks, tickLabel, radarRatios, hatchPath, highestClearY, insideConvex } from "../kit/math.js";
import { textSize, printedPt, floorPx, mix, REF_WIDTH } from "../kit/spec.js";
import { prepare, texTables, mdTables, stripLineNumbers, textTables, textFigures, expandMacros, texText } from "../src/paper.mjs";
import { checkSpec, samePrinted, checkValue } from "../src/evidence.mjs";
import { gateSpec } from "../src/specgate.mjs";
import { lintFrame } from "../src/lint.mjs";
import { compatScript } from "../src/bridge.mjs";
import { autoLayout } from "../kit/layout.js";

const EX = path.join(import.meta.dir, "..", "examples", "anon-paper");

test("size spec scales with width and keeps printed size", () => {
  expect(textSize("diagram", "caption", 1498)).toBe(32);
  expect(textSize("chart", "tick", 1248)).toBe(18);
  expect(textSize("chart", "tick", 624)).toBe(9); // half the canvas, half the px: same print size at half placement
  expect(printedPt(32, 1498)).toBeCloseTo(8.46, 1);
  expect(floorPx(1498)).toBeCloseTo(17.98, 1);
});

test("mix blends with white and never returns transparency", () => {
  expect(mix("#197A8A", 0.12)).toBe("#E3EFF1");
  expect(mix("#000000", 1)).toBe("#000000");
  expect(mix("#000000", 0)).toBe("#FFFFFF");
});

test("ticks and labels", () => {
  const t = niceTicks(0.686, 1.418, 4);
  expect(t.ticks[0]).toBeLessThanOrEqual(0.686);
  expect(t.ticks.at(-1)).toBeGreaterThanOrEqual(1.418);
  expect(tickLabel(0.75, 0.25)).toBe("0.75"); // not 0.8
  expect(tickLabel(20, 20)).toBe("20");
  expect(fixedTicks(0.6, 1.4, 0.2).ticks).toEqual([0.6, 0.8, 1, 1.2, 1.4]);
});

test("radar ratios put the best method on the rim and invert lower-is-better axes", () => {
  expect(radarRatios([10, 20, 5], false)).toEqual([0.5, 1, 0.25]);
  expect(radarRatios([22.57, 14.53, 29.38], true).map((v) => +v.toFixed(3))).toEqual([0.644, 1, 0.495]);
  expect(() => radarRatios([1, NaN], false)).toThrow();
});

test("hatch stripes are cut polygons inside the tile", () => {
  const d = hatchPath(40);
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  expect(Math.min(...nums)).toBeGreaterThanOrEqual(1.2 - 1e-9);
  expect(Math.max(...nums)).toBeLessThanOrEqual(40 - 1.2 + 1e-9);
});

test("legend placement avoids labels and the ring", () => {
  const ring = [[100, 0], [200, 100], [100, 200], [0, 100]];
  expect(insideConvex(ring, 100, 100)).toBe(true);
  const y = highestClearY({ x: 150, y0: 260, w: 90, h: 40, rects: [{ x: 140, y: 150, w: 60, h: 20 }], poly: ring });
  expect(y).toBeGreaterThanOrEqual(170);
  expect(y).toBeLessThan(260);
});

test("TeX tables: header rows, multicolumn, formatting", () => {
  const src = String.raw`\begin{table}\caption{Main results \textbf{bold}}\label{tab:main}
\begin{tabular}{lcc}\toprule
 & \multicolumn{2}{c}{Accuracy} \\ \cmidrule(lr){2-3}
Method & A & B \\ \midrule
Ours & \textbf{81.2} & 70.1$\pm$0.3 \\
Base & 79.0 & \underline{71.5} \\ \bottomrule
\end{tabular}\end{table}`;
  const [t] = texTables(src);
  expect(t.caption).toBe("Main results bold");
  expect(t.label).toBe("tab:main");
  expect(t.columns[1]).toBe("Accuracy / A");
  expect(t.rows.map((r) => r.label)).toEqual(["Ours", "Base"]);
  expect(t.rows[0].cells[2]).toBe("70.1±0.3");
});

test("markdown tables and plain text from a review PDF", () => {
  const [t] = mdTables("Table 4: x\n\n| M | a |\n|---|---|\n| **Ours** | 1.5 |\n");
  expect(t.id).toBe("T4");
  expect(t.rows[0].cells).toEqual(["Ours", "1.5"]);
  const txt = stripLineNumbers("000 Title\n001 Table 2: Scores at 30B.\n002 Ours 24.4 27.3\n003 Base 23.6 15.9\n004\n");
  expect(txt).toContain("Table 2: Scores");
  const [u] = textTables(txt);
  expect(u.confidence).toBe("low");
  expect(u.rows[0].cells).toEqual(["Ours", "24.4", "27.3"]);
});

test("evidence: exact at printed precision, refuses unsourced and wrong values", async () => {
  expect(samePrinted(22.57, "22.57")).toBe(true);
  expect(samePrinted(22.6, "22.57")).toBe(false);
  expect(samePrinted(22.57, "22.6")).toBe(true);
  const { index, text } = await prepare(path.join(EX, "paper.md"));
  const spec = {
    version: 1,
    kind: "radar",
    name: "t",
    methods: [{ id: "a", label: "A", ours: true }, { id: "b", label: "B" }],
    axes: [
      { label: "Pick", better: "higher", values: { a: [84.0, "T1[Anchor Tokens (ours)][Pick cup]"], b: [81, "T1[Full tokens][Pick cup]"] } },
      { label: "Loss", better: "lower", values: { a: [0.219, "T2[Anchor Tokens (ours) | Loss][80k]"], b: 0.247 } },
      { label: "Speed", better: "lower", values: { a: [23, { quote: "runs at 23 ms per step" }], b: [61, "T2[Full tokens][80k]"] } },
    ],
  };
  const r = checkSpec(spec, { index, text });
  const by = Object.fromEntries(r.report.map((x) => [x.where, x.status]));
  expect(by["Pick / a"]).toBe("ok");
  expect(by["Pick / b"]).toBe("mismatch"); // the paper prints 80.0
  expect(by["Loss / a"]).toBe("ok");
  expect(by["Loss / b"]).toBe("unsourced");
  expect(by["Speed / a"]).toBe("ok");
  expect(by["Speed / b"]).toBe("mismatch"); // "Full tokens" matches two rows in T2
  expect(r.pass).toBe(false);
  expect(r.clean.axes[1].values.b).toBe(0.247);
});

test("gate: arrows, one ours, bars from zero, no log with a break", () => {
  const bad = {
    version: 1,
    kind: "chart-grid",
    name: "x",
    methods: [{ id: "a", label: "A", ours: true }, { id: "b", label: "B", ours: true }, { id: "c", label: "C", color: "#197A8A" }],
    x: { title: "t", ticks: [1, 2] },
    groups: [{ title: "g", panels: [{ title: "p", series: { a: [[1, 2]] } }, { title: "q", better: "higher", type: "bar", categories: ["c"], range: [5, 10, 1], series: [{ method: "a", values: [6] }] }, { title: "r", better: "lower", log: { lo: 1, hi: 10, ticks: [1, 10] }, breakAbove: 5, series: { a: [[1, 2]] } }] }],
  };
  const g = gateSpec(bad);
  expect(g.ok).toBe(false);
  const all = g.errors.join("\n");
  expect(all).toContain("only one method can be ours");
  expect(all).toContain("uses the accent colour");
  expect(all).toContain('better must be "higher" or "lower"');
  expect(all).toContain("bar axes start at zero");
  expect(all).toContain("not both");
});

test("lint: reading floor, Inter, arrow glyph font, transparency", () => {
  const data = {
    width: 1498,
    height: 600,
    nodes: [
      { type: "TEXT", name: "tiny", path: "", segments: [{ text: "Encoder", size: 12, family: "Google Sans Flex", style: "Medium" }] },
      { type: "TEXT", name: "legend item", path: "radar legend / item", segments: [{ text: "Ours", size: 16, family: "Google Sans Flex", style: "Regular" }] },
      { type: "TEXT", name: "font", segments: [{ text: "Decoder", size: 28, family: "Inter", style: "Regular" }] },
      { type: "TEXT", name: "PPL ↓", segments: [{ text: "PPL ", size: 21, family: "Google Sans Flex", style: "Medium" }, { text: "↓", size: 21, family: "Google Sans Flex", style: "Medium" }] },
      { type: "RECTANGLE", name: "band", fills: [{ type: "SOLID", hex: "#EDF0F4", opacity: 0.92 }] },
      { type: "FRAME", name: "clip", clipsContent: true, fills: [] },
    ],
  };
  const r = lintFrame(data);
  const all = r.errors.join("\n");
  expect(all).toContain('"Encoder" is 12px');
  expect(all).not.toContain('"Ours"'); // secondary legend at 16 px is allowed
  expect(all).toContain("Inter");
  expect(all).toContain("arrow glyph");
  expect(all).toContain("92% fill");
  expect(r.warnings.join("\n")).toContain("clip their content");
});

test("compat scripts embed the kit and the parameters", () => {
  const s = compatScript("/*KIT*/", "build", { spec: { name: "a" }, page: "p" });
  expect(s.startsWith("/*KIT*/")).toBe(true);
  expect(s).toContain("kit.renderSpec(__p.spec)");
  expect(compatScript("", "chunk", { key: "k", index: 2 })).toContain('"index":2');
});

test("auto layout: approved grid for 1/4/4 panels, half width for two panels", () => {
  const P = (t) => ({ title: t, better: "higher", series: { a: [[1, 1]] } });
  const M = [{ id: "a", label: "A", ours: true }, { id: "b", label: "B" }];
  const big = autoLayout({ version: 1, kind: "chart-grid", name: "x", methods: M, x: { ticks: [1, 2] }, groups: [{ title: "L", panels: [P(1)] }, { title: "U", panels: [P(1), P(2), P(3), P(4)] }, { title: "G", panels: [P(1), P(2), P(3), P(4)] }] });
  expect(big.spec.groups.map((g) => g.columns)).toEqual([1, 2, 2]);
  expect(big.spec.placement).toBe(1);
  expect(big.spec.legend.placement).toBe("cell");
  const two = autoLayout({ version: 1, kind: "chart-grid", name: "y", methods: M, x: { ticks: [1, 2] }, groups: [{ title: "T", panels: [P(1), P(2)] }] });
  expect(two.spec.groups[0].columns).toBe(2);
  expect(two.spec.placement).toBeGreaterThan(0.4);
  expect(two.spec.placement).toBeLessThan(0.55);
  expect(two.spec.legend.placement).toBe("bottom");
  const kept = autoLayout({ version: 1, kind: "chart-grid", name: "z", width: 900, methods: M, x: { ticks: [1, 2] }, groups: [{ title: "T", columns: 1, panels: [P(1), P(2)] }] });
  expect(kept.spec.width).toBe(900);
  expect(kept.decisions[0]).toContain("kept");
});

test("lint: figure formats (full width 2..3.2, one column 0.8..1.7)", () => {
  const frame = (w, h) => ({ width: w, height: h, nodes: [{ type: "TEXT", name: "t", segments: [{ text: "Encoder", size: 28, family: "Google Sans Flex", style: "Medium" }] }] });
  expect(lintFrame(frame(1438, 295)).warnings.join("\n")).toContain("too wide for a full-width figure");
  expect(lintFrame(frame(1105, 393)).warnings.join("\n")).not.toContain("aspect");
  expect(lintFrame(frame(586, 403), { kind: "chart", placement: 0.47 }).info.format).toBe("one-column");
  expect(lintFrame(frame(900, 300), { kind: "chart", placement: 0.5 }).warnings.join("\n")).toContain("too wide for a one-column figure");
});

// Regressions found by the self-test on an anonymous paper (PDF text).
const bars = (title, vals) => ({ title, type: "bar", better: "higher", categories: [""], series: vals.map((v, i) => ({ method: "abc"[i], values: [v] })) });
const M3 = [{ id: "a", label: "Anchor Tokens (ours)", ours: true }, { id: "b", label: "Full tokens" }, { id: "c", label: "Random pruning" }];

test("auto layout: bar-only figures fit a paper format or ask for a split", () => {
  const vg = autoLayout({ version: 1, kind: "chart-grid", name: "vg", methods: M3, groups: [{ title: "G", panels: [bars("A", [71.2, 63.4, 58.9]), bars("B", [0.6812, 0.7511, 0.7803]), bars("C", [41.3, 52.7, 60.8]), bars("D", [16.2, 21.9, 18.4])] }] });
  expect(vg.spec.groups[0].columns).toBe(2);
  expect(vg.spec.placement).toBeLessThan(0.55);
  expect(vg.warnings).toEqual([]);
  expect(gateSpec(vg.spec).errors).toEqual([]); // no x axis needed for bars
  const b4 = (t) => [bars(t + 1, [0.6812, 0.7511, 0.7803]), bars(t + 2, [1, 2, 3]), bars(t + 3, [1, 2, 3]), bars(t + 4, [1, 2, 3])];
  const all = autoLayout({ version: 1, kind: "chart-grid", name: "all", methods: M3, groups: [{ title: "L", panels: [bars("P", [1, 2, 3])] }, { title: "U", panels: b4("u") }, { title: "G", panels: b4("g") }] });
  expect(all.spec.placement).toBeLessThanOrEqual(1);
  expect(all.warnings.join(" ")).toContain("split the figure");
});

test("evidence: numeric column index, weak quotes", () => {
  const index = { tables: [{ id: "T1", columns: ["", "Loss"], rows: [{ label: "Anchor Tokens", cells: ["Anchor Tokens", "31.20"] }] }] };
  const text = "Anchor tokens reach a validation loss of 31.20 at 80k steps.";
  expect(checkValue(31.2, "T1[Anchor Tokens][1]", { index, text }).status).toBe("ok");
  expect(checkValue(31.2, { quote: "31.20" }, { index, text }).status).toBe("weak");
  expect(checkValue(31.2, { quote: "reach a validation loss of 31.20" }, { index, text }).status).toBe("ok");
});

test("plain text: captions across blank lines, column names from the header line", () => {
  const src = "Figure 2: A shared transformer de-\n\nnoises latents (left), and visual\n\ngeneration (right).\n\n\nBody text.\n\nTable 1: Results. See Sec. 3.1 for\n\ndetails.\n\nSetting        Split  Loss  Acc\n\nBase          12.50 61.20\n\nOurs        10.40 64.80\n";
  expect(textFigures(src)[0].caption).toBe("Figure 2: A shared transformer denoises latents (left), and visual generation (right).");
  const [t] = textTables(src);
  expect(t.caption).toBe("Table 1: Results. See Sec. 3.1 for details.");
  expect(t.columns).toEqual(["", "Loss", "Acc"]);
  expect(t.rows.map((r) => r.label)).toEqual(["Base", "Ours"]);
});

test("lint: a radar is held to chart sizes", () => {
  const frame = (size) => ({ width: 626, height: 564, meta: { kind: "radar", placement: 0.5 }, nodes: [{ type: "TEXT", name: "Recall", segments: [{ text: "Recall", size, family: "Google Sans Flex", style: "Regular" }] }] });
  expect(lintFrame(frame(21), { kind: "radar", placement: 0.5 }).warnings.join("\n")).not.toContain("largest text");
  expect(lintFrame(frame(15), { kind: "radar", placement: 0.5 }).warnings.join("\n")).toContain("largest text is 15px");
  expect(lintFrame(frame(21), { kind: "radar", placement: 0.5 }).info.format).toBe("one-column");
});

test("TeX: the paper's own macros survive (method names, TODO markers)", () => {
  const src = String.raw`\newcommand{\todo}[1]{\textcolor{red}{\textbf{[TODO: #1]}}}
\newcommand{\pp}{\textsc{AnchorNet}}
\caption{\pp-9B at 50\,\% vs.\ others; \pp{} works. \todo{fill \pp numbers}}`;
  expect(texText(expandMacros(src))).toBe("AnchorNet-9B at 50 % vs. others; AnchorNet works. [TODO: fill AnchorNet numbers]");
});

test("TeX tables: makecell headers, citation keys and row colours", () => {
  const src = String.raw`\begin{table}\caption{R}\begin{tabular}{lcc}\toprule
Method & \makecell{Bin\\Fill} & Avg. \\ \midrule
Base~\citep{smith2024base} & 1.0 & 2.0 \\
\rowcolor{gray!15} Ours & 3.0 & 4.0 \\ \bottomrule
\end{tabular}\end{table}`;
  const [t] = texTables(src);
  expect(t.columns).toEqual(["Method", "Bin Fill", "Avg."]);
  expect(t.rows.map((r) => r.label)).toEqual(["Base", "Ours"]);
});

test("evidence: an ambiguous partial column name is refused, never the label column", async () => {
  const { checkValue } = await import("../src/evidence.mjs");
  const index = { tables: [{ id: "T1", columns: ["Method", "Avg. 1x", "Avg. 10x"], rows: [{ label: "A", cells: ["A", "1.0", "2.0"] }] }] };
  expect(checkValue(1, "T1[A][Avg.]", { index, text: "" }).message).toContain("matches 2 columns");
  expect(checkValue(2, "T1[A][10x]", { index, text: "" }).status).toBe("ok");
});

test("colours: one method keeps one colour across the figures of a paper", async () => {
  const { assignColors } = await import("../src/ops.mjs");
  const palette = {};
  const a = { methods: [{ id: "o", label: "Ours", ours: true }, { id: "b", label: "Strong" }, { id: "c", label: "Weak" }] };
  expect(assignColors(a, palette)).toEqual([]);
  expect(a.methods[1].color).toBe("#A98548");
  const b = { methods: [{ id: "o", label: "Ours v2", ours: true }, { id: "d", label: "Other" }, { id: "b", label: "Strong" }] };
  assignColors(b, palette);
  expect(b.methods[2].color).toBe("#A98548"); // Strong keeps sand
  expect(b.methods[1].color).not.toBe("#A98548"); // Other does not take it
  const c = { methods: [{ id: "x", label: "Else", color: "#A98548" }] };
  expect(assignColors(c, palette).join(" ")).toContain("one colour keeps one meaning");
});

test("auto layout: a one-panel bar chart is never placed below a quarter of the line width", () => {
  const one = autoLayout({ version: 1, kind: "chart-grid", name: "one", methods: M3.slice(0, 2), groups: [{ title: "G", panels: [bars("A", [1, 2])] }] });
  expect(one.spec.placement).toBeGreaterThanOrEqual(0.25);
  expect(gateSpec(one.spec).errors).toEqual([]);
});

test("lint (diagrams): word budget, long and repeated labels, hierarchy, badges", () => {
  const t = (id, text, size, parentId, family = "Google Sans Flex") => ({ id, type: "TEXT", name: text, parentId, x: 10, y: 10, w: 50, h: 20, segments: [{ text, size, family, style: "Medium" }] });
  const nodes = [
    { id: "k", type: "FRAME", name: "Key", level: 1 },
    t("kt", "Planner", 32, "k"),
    { id: "m", type: "FRAME", name: "Projector", level: 2 },
    t("mt", "Projector", 28, "m"),
    { id: "c", type: "FRAME", name: "Fallback", level: 3 },
    t("ct", "Fallback", 30, "c"),
    t("s1", "supervision only, never passed on", 22),
    t("r1", "current observation and instruction", 22),
    t("r2", "current observation and instruction", 22),
    t("q", "pick up the cup and put it on the plate now please", 20, undefined, "Google Sans Code"),
    { id: "b1", type: "VECTOR", name: "b", badge: "trained" },
    { id: "b2", type: "VECTOR", name: "b", badge: "trained" },
    { id: "b3", type: "VECTOR", name: "b", badge: "trained" },
  ];
  const r = lintFrame({ width: 1400, height: 600, meta: { type: "teaser" }, nodes }, { kind: "diagram", placement: 0.95 });
  const w = r.warnings.join("\n");
  expect(r.info.words.count).toBe(16); // the quoted example does not count
  expect(w).toContain('"supervision only, never passed on" has 5 words');
  expect(w).toContain("appears 2 times");
  expect(w).toContain('"Fallback" have larger text (30px) than a method element (28px)');
  expect(w).toContain('3 "trained" badges on 2 modules');
  const long = lintFrame({ width: 1400, height: 600, meta: { type: "teaser" }, nodes: Array.from({ length: 30 }, (_, i) => t("w" + i, "alpha beta", 22)) }, { kind: "diagram", placement: 0.95 });
  expect(long.warnings.join("\n")).toContain("60 words in labels; a teaser figure uses about 25");
});

test("chart gate: the same title on several panels", () => {
  const P = (t) => ({ title: t, better: "higher", series: { a: [[1, 1]] } });
  const g = gateSpec({ version: 1, kind: "chart-grid", name: "t", methods: [{ id: "a", label: "A", ours: true }], x: { title: "x", ticks: [1, 2] }, groups: [{ title: "G", columns: 2, panels: [P("Success (%)"), P("Success (%)")] }] });
  expect(g.warnings.join("\n")).toContain('2 panels titled "Success (%)"');
});

test("lint (diagrams): every icon kind is named, missing links stay short", () => {
  const base = { width: 1400, height: 500, meta: { type: "overview" } };
  const nodes = [
    { id: "c1", type: "FRAME", name: "icon clock", icon: "clock", named: false, path: "invocation" },
    { id: "c2", type: "FRAME", name: "icon clock", icon: "clock", named: false, path: "invocation" },
    { id: "f1", type: "FRAME", name: "icon film", icon: "film", named: true, path: "inputs" },
    { id: "m1", type: "FRAME", name: "icon memory", icon: "memory", named: false, path: "legend / item" },
    { id: "b", type: "FRAME", name: "blocked arrow", blocked: 700, w: 700, h: 20 },
  ];
  const w = lintFrame({ ...base, nodes }, { kind: "diagram", placement: 1 }).warnings.join("\n");
  expect(w).toContain('icon "clock" appears 2 time(s) without a name');
  expect(w).not.toContain('icon "film"');
  expect(w).not.toContain('icon "memory"'); // named in a legend
  expect(w).toContain("blocked arrow 700 px long (50% of the width)");
});
