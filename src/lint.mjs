// Design checks on a built frame (the node list from the plugin's `inspect`). Rules come from docs/figure-principles.md.
import { FLOOR_PCT, SECONDARY_FLOOR_PCT, PRINT_WIDTH_PT, TEXT, REF_WIDTH, formatOf, aspectMiss, WORDS, LABEL_WORDS, LEVEL } from "../kit/spec.js";

const MONO = /Code|Mono/;
const wordsOf = (s) => String(s).match(/[A-Za-z0-9][A-Za-z0-9.+\-/']*/g) || [];
const labelText = (n) => (n.segments || []).filter((s) => !MONO.test(s.family)).map((s) => s.text).join("").trim();

// Checks that only make sense for method diagrams and teasers (docs/figure-principles.md, principles 4, 9, 11, 12 and 18).
function diagramChecks(data, texts, warnings, info) {
  // word budget and label length: labels are short noun phrases, explanations belong in the caption
  // names of events on a time axis (t1, n2) are part of the axis, not label words
  const labels = texts.map((n) => ({ n, text: labelText(n) })).filter((l) => l.text && !/time axis/i.test(l.n.path || ""));
  const words = labels.reduce((a, l) => a + wordsOf(l.text).length, 0);
  const type = data.meta?.type || "diagram",
    budget = WORDS[type] ?? WORDS.diagram;
  info.words = { count: words, budget, type };
  if (words > budget) warnings.push(`${words} words in labels; a ${type} figure uses about ${budget} or fewer (quoted examples in the monospaced face do not count). Draw inputs as icons, drop labels the drawing already says, move explanations to the caption`);
  for (const l of labels) if (wordsOf(l.text).length > LABEL_WORDS) warnings.push(`label "${l.text.replace(/\s+/g, " ").slice(0, 40)}" has ${wordsOf(l.text).length} words; a label is at most ${LABEL_WORDS} words. A missing link is a blocked arrow, an optional input a dashed outline, an explanation goes to the caption`);
  // the same long label twice: a part shared by both panels is drawn once, or small and gray
  const seen = {};
  for (const l of labels) {
    const key = l.text.replace(/\s+/g, " ").toLowerCase();
    if (wordsOf(key).length >= 3) seen[key] = (seen[key] || 0) + 1;
  }
  for (const [key, n] of Object.entries(seen)) if (n > 1) warnings.push(`label "${key.slice(0, 40)}" appears ${n} times; draw a part the panels share once, or small and gray`);
  // visual hierarchy: no lower level larger than a higher one, one level-1 element
  const kids = {};
  for (const n of data.nodes) if (n.parentId) (kids[n.parentId] ||= []).push(n);
  const textSize = (n) => {
    let best = 0;
    const walk = (x) => {
      if (x.type === "TEXT") best = Math.max(best, ...(x.segments || []).map((s) => s.size));
      for (const c of kids[x.id] || []) walk(c);
    };
    walk(n);
    return best;
  };
  const leveled = data.nodes.filter((n) => n.level).map((n) => ({ n, size: textSize(n) })).filter((x) => x.size);
  const at = (lv) => leveled.filter((x) => x.n.level === lv);
  if (at(1).length > 1) warnings.push(`${at(1).length} level-1 elements (${at(1).map((x) => x.n.name).join(", ")}); the accent fill marks the one key module or path`);
  for (const [lo, hi] of [[3, 2], [2, 1], [3, 1]]) {
    const top = at(hi);
    if (!top.length) continue;
    const floor = Math.min(...top.map((x) => x.size));
    const over = at(lo).filter((x) => x.size > floor);
    if (over.length) warnings.push(`${LEVEL[lo].name} element(s) ${over.map((x) => `"${x.n.name}"`).join(", ")} have larger text (${Math.max(...over.map((x) => x.size))}px) than a ${LEVEL[hi].name} element (${floor}px); lower levels are never larger`);
  }
  info.levels = { 1: at(1).length, 2: at(2).length, 3: at(3).length };
  // every icon kind is named somewhere in the figure: at its first use, or in a legend (principle 12)
  const icons = data.nodes.filter((n) => n.icon);
  for (const kind of new Set(icons.map((n) => n.icon))) {
    const same = icons.filter((n) => n.icon === kind);
    if (!same.some((n) => n.named || /legend/i.test(n.path || ""))) warnings.push(`icon "${kind}" appears ${same.length} time(s) without a name; label its first use (icon(..., { label })) or add it to a legend: a reader cannot tell what it stands for from the drawing`);
  }
  // a missing link is context (level 3): it stays short (principle 9)
  for (const n of data.nodes.filter((x) => x.blocked)) {
    const len = Math.max(n.w || 0, n.h || 0, n.blocked);
    if (len > 0.15 * data.width) warnings.push(`blocked arrow ${Math.round(len)} px long (${Math.round((len / data.width) * 100)}% of the width); a missing link is context: draw it about one module gap long`);
  }
  // state badges on most modules say little: mark only the rarer state
  const modules = data.nodes.filter((n) => n.level === 1 || n.level === 2).length;
  for (const kind of ["frozen", "trained"]) {
    const c = data.nodes.filter((n) => n.badge === kind).length;
    if (c >= 3 && c > modules / 2) warnings.push(`${c} "${kind}" badges on ${modules} modules; mark only the rarer state (kit.diagram.pinStates) or say it in the caption`);
  }
}

const ALLOWED_FONTS = ["Google Sans Flex", "Google Sans Code", "Roboto", "Pretendard", "Caveat"];
const ARROW = /[←-↓⇐-⇓]/;

// placement: the share of \linewidth the figure takes in the paper (0.5 for a half-width figure). Floors and printed sizes
// are judged at print size, so a half-width figure needs twice the px of a full-width one of the same canvas width.
// kind: "diagram", "chart" or "radar" (the main label roles differ).
export function lintFrame(data, { kind = "diagram", placement = 1, printWidthPt = PRINT_WIDTH_PT, secondary = /legend|radar/i } = {}) {
  const W = data.width / placement;
  const errors = [],
    warnings = [],
    info = {};
  const floor = (W * FLOOR_PCT) / 100,
    floor2 = (W * SECONDARY_FLOOR_PCT) / 100;
  const pt = (px) => Math.round(((px * printWidthPt) / W) * 10) / 10;
  const sizes = {};
  // n.path lists the ancestor names, so text inside a legend frame counts as secondary
  for (const n of data.nodes) {
    if (n.type !== "TEXT") continue;
    for (const s of n.segments || []) {
      if (!s.text.trim()) continue;
      const key = `${s.size}px ${s.family} ${s.style}`;
      (sizes[key] ||= { px: s.size, pt: pt(s.size), pct: +((s.size / W) * 100).toFixed(2), count: 0, sample: s.text.slice(0, 30) }).count++;
      if (s.family === "Inter") errors.push(`"${s.text.slice(0, 30)}" uses Inter; use Google Sans Flex`);
      else if (!ALLOWED_FONTS.includes(s.family)) warnings.push(`"${s.text.slice(0, 30)}" uses ${s.family}`);
      if (ARROW.test(s.text) && s.family !== "Roboto" && s.text.trim().length <= 2) errors.push(`arrow glyph in ${s.family} ("${n.name}"): it drops out of Figma PDFs; set the arrow to Roboto`);
      if (ARROW.test(s.text) && s.family !== "Roboto" && s.text.trim().length > 2) errors.push(`"${s.text.slice(0, 30)}" has an arrow glyph in ${s.family}; set the arrow character to Roboto`);
      const isSecondary = secondary.test(n.name) || secondary.test(n.path || "");
      if (s.size < floor2 || (s.size < floor && !isSecondary))
        errors.push(`"${s.text.slice(0, 30)}" is ${s.size}px = ${pt(s.size)} pt in print (${((s.size / W) * 100).toFixed(2)}% of the width); the floor is ${FLOOR_PCT}% (${Math.round(floor * 10) / 10}px)`);
    }
  }
  info.textSizes = Object.values(sizes).sort((a, b) => b.px - a.px);
  // the largest text should reach the main role sizes of the spec; a figure whose biggest label is small was shrunk
  const biggest = Math.max(0, ...info.textSizes.map((s) => s.px));
  const expect = kind === "chart" ? (TEXT.chart.title * W) / REF_WIDTH.chart : kind === "radar" ? (TEXT.diagram.radarLabel * W) / REF_WIDTH.diagram : (TEXT.diagram.module * W) / REF_WIDTH.diagram;
  if (biggest && biggest < expect * 0.9) warnings.push(`largest text is ${biggest}px; ${kind} figures of this width use about ${Math.round(expect)}px for their main labels (docs/figure-principles.md, size spec)`);
  for (const n of data.nodes) {
    if (n.opacity != null && n.opacity < 1) errors.push(`${n.type} "${n.name}" has opacity ${n.opacity}: viewers that ignore transparency draw it solid; blend the colour instead`);
    for (const f of n.fills || []) if (f.type === "SOLID" && f.opacity < 1) errors.push(`${n.type} "${n.name}" has a ${Math.round(f.opacity * 100)}% fill; use an opaque blended colour`);
  }
  // clipping frames become PDF soft masks as soon as a child reaches the edge
  const clip = data.nodes.filter((n) => n.clipsContent && ["FRAME", "COMPONENT", "INSTANCE"].includes(n.type));
  if (clip.length) warnings.push(`${clip.length} frame(s) clip their content (${clip.slice(0, 3).map((n) => n.name).join(", ")}); turn clipping off unless it is needed`);
  const radii = [...new Set(data.nodes.map((n) => n.cornerRadius).filter(Boolean).map((r) => Math.round(r)))].sort((a, b) => a - b);
  info.radii = radii;
  if (radii.length > 5) warnings.push(`${radii.length} corner radii (${radii.join(", ")}); keep three levels plus pills`);
  // overlapping text boxes
  const texts = data.nodes.filter((n) => n.type === "TEXT" && n.w > 0);
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i],
        b = texts[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
        oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 3 && oy > 3) warnings.push(`text "${a.name.slice(0, 24)}" overlaps "${b.name.slice(0, 24)}"`);
    }
  // text that leaves the figure is cut off in the PDF; text that leaves its box (a frame with a fill or an outline)
  // reads as a layout error
  // an arrow glyph (Roboto) is wider than its text box: at the right edge of the frame the PDF cuts it
  for (const n of texts) {
    const size = Math.max(0, ...(n.segments || []).map((g) => g.size));
    if (/[↑↓→←]\s*$/.test((n.segments || []).map((g) => g.text).join("")) && n.x + n.w > data.width - 0.35 * size) warnings.push(`text "${n.name.slice(0, 24)}" ends in an arrow at the right edge of the frame; the glyph is cut off in the PDF. Keep ${Math.round(0.35 * size)} px of space after it`);
  }
  const byId = Object.fromEntries(data.nodes.map((n) => [n.id, n]));
  for (const n of texts) {
    // a text box is taller than its glyphs (line height), so the vertical test allows a fifth of the font size
    const tol = Math.max(1, 0.2 * Math.max(0, ...(n.segments || []).map((g) => g.size)));
    if (n.x < -1 || n.y < -tol || n.x + n.w > data.width + 1 || n.y + n.h > data.height + tol) warnings.push(`text "${n.name.slice(0, 24)}" runs outside the frame; the PDF either cuts it off or grows past the frame, so the size and aspect checks are wrong`);
    const box = n.parentId && byId[n.parentId];
    if (box && box.boxed && (n.x < box.x - 1 || n.x + n.w > box.x + box.w + 1)) warnings.push(`text "${n.name.slice(0, 24)}" runs outside its box "${box.name.slice(0, 24)}"; widen the box or break the text`);
  }
  if (kind === "diagram") diagramChecks(data, texts, warnings, info);
  // two formats: a full-width figure is moderately wide, a one-column figure is near square or a chubby rectangle
  const aspect = data.width / data.height;
  const fmt = formatOf(placement, aspect);
  const [lo, hi] = fmt.aspect;
  info.aspect = +aspect.toFixed(2);
  info.format = fmt.name;
  const off = aspectMiss(aspect, fmt) > 0;
  if (off && aspect > hi) warnings.push(`aspect ${aspect.toFixed(2)}:1 is too wide for a ${info.format} figure (${lo}..${hi}); stack tokens across the flow, drop repeated labels, or break the flow into rows`);
  if (off && aspect < lo) warnings.push(`aspect ${aspect.toFixed(2)}:1 is too tall for a ${info.format} figure (${lo}..${hi})`);
  info.width = data.width;
  info.placement = placement;
  info.height = data.height;
  info.printScale = `${(printWidthPt / W).toFixed(3)} pt per px (placed at ${placement} of a ${printWidthPt} pt line width)`;
  return { ok: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)], info };
}
