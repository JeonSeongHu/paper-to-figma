// Checks a figure spec before anything is drawn: structure, and the design rules a spec can break.
import { SERIES, OURS, REF_WIDTH } from "../kit/spec.js";
import { panelTarget } from "../kit/layout.js";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const valueOf = (v) => (Array.isArray(v) ? v[0] : v && typeof v === "object" && "value" in v ? v.value : v);

export function gateSpec(spec) {
  const errors = [],
    warnings = [];
  const E = (m) => errors.push(m),
    W = (m) => warnings.push(m);
  if (spec?.version !== 1) E("version must be 1");
  if (typeof spec?.name !== "string" || !spec.name.trim()) E("name required (it becomes the Figma frame name)");
  if (spec.kind === "chart-grid") gateChart(spec, E, W);
  else if (spec.kind === "radar") gateRadar(spec, E, W);
  else E(`unknown kind ${spec?.kind}; expected chart-grid or radar (free-form diagrams are scripts)`);
  return { ok: errors.length === 0, errors, warnings };
}

function gateMethods(ms, E, W) {
  if (!Array.isArray(ms) || ms.length < 1) return E("methods required");
  if (ms.length > 5) W(`${ms.length} methods: more than five colours are hard to tell apart; label lines directly or split the figure`);
  const ids = new Set();
  for (const m of ms) {
    if (!m.id || ids.has(m.id)) E(`method id missing or repeated: ${m.id}`);
    ids.add(m.id);
    if (!m.label) E(`method ${m.id}: label required`);
    if (m.color && !/^#[0-9a-fA-F]{6}$/.test(m.color)) E(`method ${m.id}: colour must be #RRGGBB`);
  }
  const ours = ms.filter((m) => m.ours);
  if (ours.length > 1) E("only one method can be ours (one accent colour per figure)");
  if (!ours.length) W("no method is marked ours; the accent colour will go to the first method");
  if (ours[0]?.color && ours[0].color.toUpperCase() !== OURS.deep && !ours[0].colorReason) W(`ours is ${ours[0].color}, not the accent ${OURS.deep}; add colorReason if this is deliberate`);
  for (const m of ms) if (!m.ours && m.color && m.color.toUpperCase() === OURS.deep) E(`baseline ${m.id} uses the accent colour`);
}

function gateChart(spec, E, W) {
  const width = spec.width ?? REF_WIDTH.chart;
  const sizingWidth = width / (spec.placement ?? 1);
  if (!isNum(width) || width < 300 || sizingWidth < 700 || sizingWidth > 2400) E("width / placement must be 700..2400 px (the canvas width a full-width figure of the same print size would have)");
  gateMethods(spec.methods, E, W);
  const ids = new Set((spec.methods || []).map((m) => m.id));
  // bar panels label their own categories; only line panels share the x axis of the spec
  const hasLines = (spec.groups || []).some((g) => (g.panels || []).some((p) => p.type !== "bar" && p.status !== "todo"));
  if (hasLines) {
    if (!spec.x || !Array.isArray(spec.x.ticks) || spec.x.ticks.length < 2 || !spec.x.ticks.every(isNum)) E("x.ticks: at least two numbers");
    else if (spec.x.ticks.some((t, i) => i && t <= spec.x.ticks[i - 1])) E("x.ticks must increase");
    if (!spec.x?.title) W("x.title missing: every axis needs a title with its unit");
  }
  const place = spec.legend?.placement || "bottom";
  if (!["bottom", "cell", "none"].includes(place)) E("legend.placement: bottom, cell or none");
  if (!Array.isArray(spec.groups) || !spec.groups.length) return E("groups required");
  const nPanels = spec.groups.reduce((a, g) => a + (g.panels?.length || 0), 0);
  if (nPanels > 12) W(`${nPanels} panels: consider splitting the figure`);
  for (const g of spec.groups) {
    if (!g.title) W("a group without a title: say what the panels measure together");
    if (!(Number.isInteger(g.columns || 1) && (g.columns || 1) >= 1 && (g.columns || 1) <= 5)) E(`group ${g.title}: columns must be 1..5`);
    for (const p of g.panels || []) {
      const where = `${g.title} / ${p.title}`;
      if (!p.title) E(`${g.title}: panel title required`);
      if (!["higher", "lower"].includes(p.better)) E(`${where}: better must be "higher" or "lower" (the title shows the arrow)`);
      if (p.status === "todo") continue;
      if (p.type === "bar") {
        if (!Array.isArray(p.categories) || !p.categories.length) E(`${where}: categories required`);
        if (p.range && p.range[0] !== 0) E(`${where}: bar axes start at zero`);
        for (const s of p.series || []) {
          if (!ids.has(s.method)) E(`${where}: unknown method ${s.method}`);
          if ((s.values || []).length !== (p.categories || []).length) E(`${where}: ${s.method} needs one value per category`);
        }
        continue;
      }
      if (!p.series || typeof p.series !== "object") {
        E(`${where}: series required`);
        continue;
      }
      const ys = [];
      for (const [id, pts] of Object.entries(p.series)) {
        if (!ids.has(id)) E(`${where}: unknown method ${id}`);
        if (!Array.isArray(pts) || !pts.length) E(`${where}: ${id} has no points`);
        for (const pt of pts || []) {
          const [x, y] = Array.isArray(pt) ? pt : [pt.x, pt.y];
          if (!isNum(x) || !isNum(valueOf(y))) E(`${where}: ${id} has a non-numeric point`);
          else ys.push(valueOf(y));
          if (isNum(x) && spec.x?.ticks && (x < spec.x.ticks[0] || x > spec.x.ticks.at(-1))) E(`${where}: x=${x} outside the x ticks`);
        }
      }
      if (p.log) {
        if (ys.some((y) => y <= 0)) E(`${where}: a log axis needs positive values`);
        if (!Array.isArray(p.log.ticks) || p.log.ticks.length < 2) E(`${where}: log.ticks required (e.g. [10, 20, 50, 100])`);
        if (ys.some((y) => y < p.log.lo || y > p.log.hi)) E(`${where}: values outside log.lo..log.hi`);
        W(`${where}: log axis; mention it in the caption`);
      }
      if (p.breakAbove != null) {
        const above = ys.filter((y) => y > p.breakAbove).length;
        if (!above) W(`${where}: breakAbove ${p.breakAbove} but no value is above it; drop the break`);
        if (above > ys.length / 2) W(`${where}: most values are above the break; move the break up`);
      }
      if (p.log && p.breakAbove != null) E(`${where}: use a log axis or a broken axis, not both`);
    }
  }
  // Plot areas of the approved charts are 160..260 px wide at the chart reference scale, with 2.5 px lines. Wider panels
  // make the lines look thin; a figure with few panels gets narrower (placement < 1), not wider panels.
  const placement = spec.placement ?? 1;
  if (!(placement >= 0.25 && placement <= 1)) E("placement must be 0.25..1 (share of \linewidth)");
  else if (Array.isArray(spec.groups) && spec.groups.length) {
    const k = width / placement / REF_WIDTH.chart;
    const cols = spec.groups.reduce((a, g) => a + (g.columns || 1), 0);
    const fixed = 2 + (spec.groups.length - 1) * 23 * k + spec.groups.reduce((a, g) => a + (g.columns || 1) * 56 * k + ((g.columns || 1) - 1) * 10 * k, 0);
    const pwRef = (width - fixed) / cols / k;
    if (hasLines && pwRef > 300) W(`line panels would be ${Math.round(pwRef)} px wide at reference scale (approved: 160..260); lines will look thin. Narrow the figure (e.g. width ${Math.round(width * 230 / pwRef)} at the same placement, or placement ${Math.max(0.25, +(placement * 230 / pwRef).toFixed(2))}) instead of stretching panels`);
    if (pwRef < 140) W(`panels would be ${Math.round(pwRef)} px wide at reference scale; tick labels will crowd. Use fewer columns or a wider figure`);
    // value labels on bars need their printed width; a narrower panel staggers or overlaps them
    const nMethods = (spec.methods || []).length;
    for (const g of spec.groups)
      for (const p of g.panels || [])
        if (p.type === "bar" && p.status !== "todo" && pwRef < panelTarget(p, nMethods) * 0.9)
          W(`${g.title} / ${p.title}: value labels need a plot about ${panelTarget(p, nMethods)} px wide at reference scale, the panel gets ${Math.round(pwRef)}; they will stagger or overlap. Use fewer columns per row or split the figure`);
  }
  // the same title on several panels says nothing new: one group title, and panels named by what differs
  const titles = spec.groups.flatMap((g) => (g.panels || []).map((p) => p.title));
  for (const t of new Set(titles)) if (titles.filter((x) => x === t).length > 1) W(`${titles.filter((x) => x === t).length} panels titled "${t}"; put the shared title on the group and name each panel by what differs`);
  if (place === "cell" && !spec.groups.some((g) => (g.columns || 1) === 1 && g.panels.length < Math.max(...spec.groups.map((x) => Math.ceil(x.panels.length / (x.columns || 1)))))) W("legend.placement cell: no one-column group has an empty cell; the legend goes to the bottom");
}

function gateRadar(spec, E, W) {
  gateMethods(spec.methods, E, W);
  if (!Array.isArray(spec.axes) || spec.axes.length < 3) return E("a radar needs at least three axes");
  if (spec.axes.length > 10) W("more than ten axes are hard to read");
  const ids = (spec.methods || []).map((m) => m.id);
  for (const a of spec.axes) {
    if (!a.label) E("axis label required");
    if (!["higher", "lower"].includes(a.better)) E(`${a.label}: better must be "higher" or "lower"`);
    for (const id of ids) if (!isNum(valueOf(a.values?.[id]))) E(`${a.label}: value for ${id} missing`);
  }
  W("radar: each axis is scaled by the best method; say so in the caption and keep axes where ours is not the best");
}
