// Every number drawn in a figure must come from the paper. This module checks the provenance of each value in a
// figure spec against the source index made by `prepare`, and returns a spec with plain numbers for the kit.
//
// A value is written as [value, source] or { value, source } (points as [x, y, source] or { x, y, source }).
// Sources:
//   "T1[row][column]"                         a table cell, row and column matched by their text (case-insensitive);
//                                             a bare number that names no row or column is a 0-based index
//   { table: "T1", row: "ELF", col: "PPL" }   the same, as an object; row and col may also be 0-based indices
//   { quote: "exact words from the paper" }   a clause of the paper that contains the value and the words that say
//                                             what it measures; a quote of numbers alone is reported as weak
//   { file: "work/p/extra.csv", note: "..." }  data outside the paper (e.g. a training log); reported as external
import { norm, cellNumber } from "./paper.mjs";

export function parseSource(src) {
  if (src == null) return null;
  if (typeof src === "object") return src;
  const m = String(src).match(/^\s*(T[\d.]+)\s*\[(.+?)\]\s*\[(.+?)\]\s*$/);
  if (m) return { table: m[1], row: m[2], col: m[3] };
  if (/^\s*quote:/i.test(src)) return { quote: String(src).replace(/^\s*quote:\s*/i, "") };
  throw new Error(`unreadable source "${src}"; use T1[row][column] or { quote: ... }`);
}

function decimals(text) {
  const m = String(text).replace(/,/g, "").match(/[-+]?\d+(?:\.(\d+))?/);
  return m && m[1] ? m[1].length : 0;
}
// Equal at the precision printed in the paper: 22.57 matches 22.57, 22.6 matches 22.57 only if the paper printed 22.6.
export function samePrinted(value, printed) {
  const n = cellNumber(printed);
  if (n == null) return false;
  const tol = 0.5 * Math.pow(10, -decimals(printed)) + 1e-9;
  return Math.abs(Number(value) - n) <= tol;
}

// A row is found by its label, by several of its cells joined with " | " ("Anchor Tokens (ours) | Loss") when labels
// repeat, or by a 0-based index. An ambiguous label is an error rather than a guess.
const asIndex = (key) => (typeof key === "number" ? key : /^\s*\d+\s*$/.test(String(key)) ? Number(key) : null);
function findRow(table, key) {
  if (typeof key === "number") return table.rows[key];
  const parts = String(key).split("|").map(norm).filter(Boolean);
  const cellsOf = (r) => r.cells.map(norm);
  let hits = table.rows.filter((r) => parts.every((p) => cellsOf(r).includes(p)));
  if (!hits.length && parts.length === 1) hits = table.rows.filter((r) => norm(r.label).startsWith(parts[0]));
  if (hits.length > 1) throw new Error(`row "${key}" matches ${hits.length} rows in ${table.id}; add another cell, e.g. "${hits[0].label} | ${hits[0].cells[1]}"`);
  if (!hits.length && asIndex(key) != null) return table.rows[asIndex(key)];
  return hits[0];
}
function findCol(table, key) {
  if (typeof key === "number") return key;
  const k = norm(key);
  let i = table.columns.findIndex((c) => norm(c) === k);
  if (i < 0) i = table.columns.findIndex((c) => norm(c).split(" / ").includes(k));
  if (i < 0 && k) {
    const hits = table.columns.map((c, j) => (j > 0 && norm(c).includes(k) ? j : -1)).filter((j) => j >= 0);
    if (hits.length > 1) throw new Error(`column "${key}" matches ${hits.length} columns in ${table.id} (${hits.map((j) => table.columns[j]).join("; ")}); use the full name or the 0-based index`);
    if (hits.length) i = hits[0];
  }
  if (i < 0 && asIndex(key) != null) i = asIndex(key);
  return i;
}

export function checkValue(value, source, { index, text }) {
  if (source == null) return { status: "unsourced", value };
  let s;
  try {
    s = parseSource(source);
  } catch (e) {
    return { status: "error", value, message: e.message };
  }
  if (s.file) return { status: "external", value, source: s, message: "value is not in the paper; state its origin in the caption or text" };
  if (s.quote) {
    const inPaper = norm(text).includes(norm(s.quote));
    const inQuote = (s.quote.replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?/g) || []).some((q) => samePrinted(value, q));
    if (!inPaper) return { status: "mismatch", value, source: s, message: "quote not found in the paper" };
    if (!inQuote) return { status: "mismatch", value, source: s, message: "value not in the quote" };
    // a quote must tie the value to what it measures: numbers alone ("30", "25.3 24.8") also match axis ticks and
    // stray labels, so they do not count as a source
    const words = (s.quote.match(/[A-Za-z][A-Za-z-]+/g) || []).length;
    if (words < 3) return { status: "weak", value, source: s, message: "the quote has fewer than three words; quote the clause that says what the value measures" };
    return { status: "ok", value, source: s };
  }
  const table = index.tables.find((t) => t.id === s.table || t.label === s.table);
  if (!table) return { status: "mismatch", value, source: s, message: `table ${s.table} not found` };
  let row;
  try {
    row = findRow(table, s.row);
  } catch (e) {
    return { status: "mismatch", value, source: s, message: e.message };
  }
  if (!row) return { status: "mismatch", value, source: s, message: `row "${s.row}" not in ${table.id}` };
  let c;
  try {
    c = findCol(table, s.col);
  } catch (e) {
    return { status: "mismatch", value, source: s, message: e.message };
  }
  const printed = row.cells[c];
  if (c < 0 || printed == null) return { status: "mismatch", value, source: s, message: `column "${s.col}" not in ${table.id}` };
  if (!samePrinted(value, printed)) return { status: "mismatch", value, source: s, printed, message: `paper prints ${printed}` };
  return { status: "ok", value, source: s, printed, confidence: table.confidence };
}

const split = (v) => {
  if (Array.isArray(v)) return { value: v[0], source: v[1] };
  if (v && typeof v === "object" && "value" in v) return { value: v.value, source: v.source ?? v.src };
  return { value: v, source: undefined };
};

// Walk a spec: check every value, collect a report, return the spec with plain numbers.
export function checkSpec(spec, source) {
  const report = [];
  const note = (where, r) => report.push({ where, ...r });
  const clean = structuredClone(spec);
  if (spec.kind === "chart-grid") {
    clean.groups.forEach((g, gi) =>
      g.panels.forEach((p, pi) => {
        const where = `${g.title} / ${p.title}`;
        if (p.status === "todo") {
          note(where, { status: "todo", message: p.todo || "panel waits for data" });
          return;
        }
        if (p.type === "bar")
          p.series.forEach((s) => {
            s.values = s.values.map((v, ci) => {
              const { value, source: src } = split(v);
              const r = checkValue(value, src, source);
              note(`${where} / ${s.method} / ${p.categories[ci]}`, r);
              // bar labels print the value as the paper prints it (80.0, not 80)
              return r.status === "ok" && r.printed != null ? { value, label: String(r.printed).trim() } : value;
            });
          });
        else
          for (const [id, pts] of Object.entries(p.series))
            p.series[id] = pts.map((pt) => {
              const [x, y, src] = Array.isArray(pt) ? pt : [pt.x, pt.y, pt.source ?? pt.src];
              note(`${where} / ${id} / x=${x}`, checkValue(y, src, source));
              return [x, y];
            });
      }),
    );
    clean.groups.forEach((g) => (g.panels = g.panels.filter((p) => p.status !== "todo")));
  } else if (spec.kind === "radar") {
    clean.axes.forEach((a) => {
      for (const [id, v] of Object.entries(a.values)) {
        const { value, source: src } = split(v);
        note(`${a.label} / ${id}`, checkValue(value, src, source));
        a.values[id] = value;
      }
    });
  }
  const count = (st) => report.filter((r) => r.status === st).length;
  const summary = { ok: count("ok"), mismatch: count("mismatch"), weak: count("weak"), unsourced: count("unsourced"), external: count("external"), error: count("error"), todo: count("todo") };
  const lowConfidence = report.filter((r) => r.confidence === "low").length;
  return { clean, report, summary, lowConfidence, pass: summary.mismatch + summary.weak + summary.unsourced + summary.error === 0 };
}
