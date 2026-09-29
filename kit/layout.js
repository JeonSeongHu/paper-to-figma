// Automatic layout for data figures. The agent may leave width, placement, columns, legend placement and panel height
// out of a spec; this fills them in from the content and records why. Anything the spec sets is kept.
//
// The target is the geometry of the approved charts: plot areas about 230 x 180 px at the chart reference scale (160 at
// the least for line panels; bar panels need room for their value labels), at most five panel columns, at most three
// rows, one legend, and a shape that fits one of the two paper formats (FORMAT in spec.js). Every arrangement of rows is
// tried; the one with the fewest rows that fits a format wins. A figure that is too wide for its format may get plots up
// to 40% taller (a wide bar panel of many categories), never narrower text.
import { REF_WIDTH, PANEL, FORMAT, formatOf, aspectMiss } from "./spec.js";

const ML = 46,
  MR = 10,
  MT = 34,
  MB = 54,
  MB1 = 30,
  MB0 = 12,
  GAP = 10,
  GG = 23,
  ROW_GAP = 18,
  HEADER = 46,
  LEGEND_ROW = 54,
  LEGEND_LINE = 30,
  MAX_COLS = 5,
  MAX_ROWS = 3,
  MIN_PLACEMENT = 0.25,
  LINE_TARGET = 230;

// Target plot width of one panel. Line panels keep the approved width. Bar panels give every bar room for its value
// label (the widest printed value at the value-label size, plus a gap) and every category room for its name; text is
// never shrunk to fit.
const CHAR = 0.56; // average glyph width of Google Sans Flex as a share of the font size
export function panelTarget(p, nMethods) {
  if (p.type !== "bar") return LINE_TARGET;
  const cats = p.categories?.length || 1,
    per = Math.max(1, p.series?.length || nMethods);
  const values = (p.series || []).flatMap((s) => (s.values || []).map((v) => String(Array.isArray(v) ? v[0] : v && typeof v === "object" ? v.value : v)));
  const valueSize = 18 * 0.85,
    tickSize = 18;
  const bar = Math.max(24, Math.max(...values.map((v) => v.length), 1) * CHAR * valueSize + 8);
  const catName = Math.max(...(p.categories || [""]).map((c) => String(c).length)) * CHAR * tickSize + 16;
  const slot = Math.max((per * bar) / 0.78, catName);
  // at most the plot of a full-width figure with one panel
  return Math.min(REF_WIDTH.chart - 2 - ML - MR, Math.max(LINE_TARGET, Math.ceil(cats * slot)));
}
// The narrowest plot a panel can take: line panels down to the approved minimum, bar panels only their target.
const panelMin = (p, nMethods) => (p.type === "bar" ? panelTarget(p, nMethods) : PANEL.plotWidth[0]);

// Height of one panel at the reference scale, as charts.js draws it.
const hasCategoryNames = (p) => (p.categories || []).some((c) => String(c).trim());
function panelHeight(p, ph, lowest, xTitle) {
  if (p.type === "bar") return MT + ph + (hasCategoryNames(p) ? MB1 : MB0) + (lowest && (p.xTitle ?? xTitle) ? 26 : 0);
  return MT + ph + (lowest ? MB : MB1);
}

// Lines a boxed legend wraps onto: items fill a line of the figure width in order (title first).
function legendLines(items, width) {
  let lines = 1,
    used = 24;
  for (const w of items) {
    if (used + w > width && used > 24) {
      lines++;
      used = 24;
    }
    used += w + 16;
  }
  return lines;
}

// Size of the figure for given columns per group and one plot width (the kit gives every panel the same width), at
// the reference scale: the canvas size when the figure is placed at width / REF_WIDTH.chart of \linewidth.
function measure(groups, cols, plot, { ph, xTitle, legendBottom, legendWidth }) {
  const width = 2 + (groups.length - 1) * GG + groups.reduce((a, g, i) => a + cols[i] * (ML + plot + MR) + (cols[i] - 1) * GAP, 0);
  const rows = Math.max(...groups.map((g, i) => Math.ceil(g.panels.length / cols[i])));
  let body = 0;
  for (let r = 0; r < rows; r++) {
    const inRow = groups.flatMap((g, i) => g.panels.slice(r * cols[i], (r + 1) * cols[i]).map((p, j) => panelHeight(p, ph, r * cols[i] + j + cols[i] >= g.panels.length, xTitle)));
    body += Math.max(MT + ph + MB0, ...inRow) + (r ? ROW_GAP : 0);
  }
  const legend = legendBottom ? LEGEND_ROW + (legendLines(legendWidth, width) - 1) * LEGEND_LINE : 0;
  const height = 2 + HEADER + body + legend;
  return { width, height, rows, aspect: width / height };
}

export function autoChartLayout(input) {
  const spec = structuredClone(input);
  const decisions = [],
    warnings = [];
  if (!spec.groups && Array.isArray(spec.panels)) {
    spec.groups = [{ title: spec.groupTitle || "", panels: spec.panels }];
    delete spec.panels;
    decisions.push("panels without groups were put in one group");
  }
  const groups = spec.groups || [];
  const panels = groups.flatMap((g) => g.panels);
  const n = panels.length;
  const methods = spec.methods || [];
  const nMethods = methods.length;
  const ph = spec.panelHeight ?? PANEL.plotHeight;
  const xTitle = spec.x?.title;
  const manual = spec.width != null && groups.every((g) => g.columns != null);
  if (manual) {
    decisions.push("width and columns set by the spec; layout kept");
  } else if (n) {
    const target = Math.max(...panels.map((p) => panelTarget(p, nMethods))),
      least = Math.max(...panels.map((p) => panelMin(p, nMethods)));
    const colsFor = (r) => groups.map((g) => (g.columns != null ? g.columns : Math.max(1, Math.ceil(g.panels.length / r))));
    // an empty cell (a one-column group shorter than the others) takes the legend; otherwise it goes under the panels
    const legendBottomFor = (cols) => {
      if (nMethods <= 1 || (spec.legend?.placement && spec.legend.placement !== "bottom")) return false;
      const rows = Math.max(...groups.map((g, i) => Math.ceil(g.panels.length / cols[i])));
      return !groups.some((g, i) => cols[i] === 1 && g.panels.length < rows);
    };
    const legendWidth = [...(spec.legend?.title ? [spec.legend.title.length * CHAR * 19] : []), ...methods.map((m) => 37 + String(m.label || "").length * CHAR * 19)];
    const options = [];
    let seen = "";
    for (let r = 1; r <= n; r++) {
      const cols = colsFor(r);
      if (cols.join() === seen) continue;
      seen = cols.join();
      if (cols.reduce((a, c) => a + c, 0) > MAX_COLS) continue;
      const ctx = { ph, xTitle, legendBottom: legendBottomFor(cols), legendWidth };
      let m = measure(groups, cols, target, ctx),
        plot = target,
        placement = spec.placement ?? Math.max(MIN_PLACEMENT, Math.ceil((m.width / REF_WIDTH.chart) * 100) / 100);
      // a figure narrower than the smallest placement gets wider plots, not a placement below it
      if (spec.placement == null && m.width < MIN_PLACEMENT * REF_WIDTH.chart) {
        plot += (MIN_PLACEMENT * REF_WIDTH.chart - m.width) / cols.reduce((a, c) => a + c, 0);
        m = measure(groups, cols, plot, ctx);
      }
      // too wide at the comfortable plot width: full width with plots narrowed toward the approved minimum
      if (spec.placement == null && placement > 1) {
        const atLeast = measure(groups, cols, least, ctx);
        if (atLeast.width <= REF_WIDTH.chart) {
          plot = least + (REF_WIDTH.chart - atLeast.width) / cols.reduce((a, c) => a + c, 0);
          m = measure(groups, cols, plot, ctx);
          placement = 1;
        }
      }
      const fmt = formatOf(placement, m.aspect);
      let miss = aspectMiss(m.aspect, fmt),
        rowPh = ph;
      if (miss > 0 && m.aspect > fmt.aspect[1] && spec.panelHeight == null) {
        const taller = ph + (m.width / fmt.aspect[1] - m.height) / m.rows;
        if (taller <= ph * 1.4) {
          rowPh = Math.ceil(taller);
          m = measure(groups, cols, plot, { ...ctx, ph: rowPh });
          miss = aspectMiss(m.aspect, fmt);
        }
      }
      options.push({ cols, ...m, plot, ph: rowPh, placement, fmt, miss, fits: placement <= 1 && miss === 0 && m.rows <= MAX_ROWS });
    }
    // taller plots are the last resort: first any arrangement that fits at the approved plot height
    const fit = options.find((o) => o.fits && o.ph === ph) || options.find((o) => o.fits);
    const inWidth = options.filter((o) => o.placement <= 1).sort((a, b) => a.miss - b.miss || a.rows - b.rows)[0];
    const pick = fit || inWidth || options.sort((a, b) => a.placement - b.placement)[0];
    groups.forEach((g, i) => (g.columns ??= pick.cols[i]));
    if (pick.ph !== ph) {
      spec.panelHeight = pick.ph;
      decisions.push(`plots ${pick.ph} px tall instead of ${ph} so the figure keeps a ${pick.fmt.name} shape`);
    }
    const placement = Math.min(1, pick.placement);
    spec.placement = placement;
    spec.width ??= Math.round(placement * REF_WIDTH.chart);
    decisions.push(
      `${n} panel(s) in ${groups.length} group(s): ${pick.rows} row(s), columns ${pick.cols.join("/")}; ${pick.fmt.name} figure ` +
        `(about ${pick.aspect.toFixed(2)}:1) placed at ${placement} of \\linewidth, ${spec.width} px wide; plot width about ${Math.round(pick.plot)} px at reference scale`,
    );
    if (!fit && pick.placement > 1)
      warnings.push(
        `the panels need ${pick.placement} of \\linewidth even at their narrowest; they were narrowed further, so labels may crowd. ` +
          `Split the figure by what it measures (one figure per group of metrics) instead of shrinking text`,
      );
    else if (!fit && pick.rows > MAX_ROWS)
      warnings.push(`the only arrangement that fits the width has ${pick.rows} rows; split the figure by what it measures (one figure per group of metrics)`);
    else if (!fit)
      warnings.push(
        `no arrangement of rows fits a paper format (one-column about ${FORMAT.column.aspect.join("..")}:1 up to ${FORMAT.column.maxPlacement} of \\linewidth, ` +
          `full-width about ${FORMAT.full.aspect.join("..")}:1); the closest is ${pick.aspect.toFixed(2)}:1. Consider splitting or merging figures`,
      );
  }
  spec.panelHeight ??= PANEL.plotHeight;
  spec.legend ||= {};
  if (!spec.legend.placement) {
    const rows = Math.max(...groups.map((g) => Math.ceil(g.panels.length / (g.columns || 1))));
    const cell = groups.find((g) => (g.columns || 1) === 1 && g.panels.length < rows);
    if (nMethods <= 1) spec.legend.placement = "none";
    else if (cell) spec.legend.placement = "cell";
    else spec.legend.placement = "bottom";
    decisions.push(
      spec.legend.placement === "cell" ? `legend in the empty cell under "${cell.title || "the first group"}"` : spec.legend.placement === "none" ? "one method: no legend" : "legend in a box under the panels (no empty cell)",
    );
  }
  return { spec, decisions, warnings };
}

export function autoRadarLayout(input) {
  const spec = structuredClone(input);
  const decisions = [];
  if (spec.width == null) {
    spec.placement ??= 0.5;
    spec.width = Math.round(spec.placement * 1248);
    spec.height ??= Math.round(spec.width * 0.9);
    decisions.push(`radar ${spec.width} x ${spec.height} px placed at ${spec.placement} of \\linewidth`);
  }
  spec.legend ||= {};
  spec.legend.placement ||= "corner";
  if (spec.legend.placement === "corner") decisions.push("legend box in the bottom corner that clears every label and the rim");
  return { spec, decisions, warnings: [] };
}

export function autoLayout(spec) {
  if (spec.kind === "chart-grid") return autoChartLayout(spec);
  if (spec.kind === "radar") return autoRadarLayout(spec);
  return { spec, decisions: [], warnings: [] };
}
