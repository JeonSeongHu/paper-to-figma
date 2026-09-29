// Size, stroke and colour specification for paper figures.
//
// The numbers were measured on paper figures the author approved in 2026-09, after many rounds of
// "the text is too small". Language models tend to shrink text until a figure fits; do not. Keep these
// sizes, and when a layout does not fit, remove content or widen the figure instead.
//
// Every size is defined at a reference width and scales with the figure width. A figure is placed at \linewidth in the
// paper, so a wider canvas makes every pixel smaller in print; scaling keeps the printed size constant.

export const REF_WIDTH = { diagram: 1498, chart: 1248 };

// Text sizes in px at the reference width.
export const TEXT = {
  diagram: {
    caption: 32, // panel captions under each panel, "(a) Baseline"
    block: 32, // the shared model block in a two-panel figure
    group: 30, // group titles above several panels ("Language", "Visual Understanding")
    module: 28, // named modules (Encoder, Decoder), the block in a three-panel figure
    header: 28, // column headers of a table-like figure ("Input", "Autoregressive")
    lane: 26, // lane and row labels ("Text latents", "Image latents")
    legend: 26, // figure legend text
    note: 22, // short annotations next to a mark ("t = 0", "Denoising steps")
    chip: 22, // monospaced prompt inside a chip ('"A red chair"')
    data: 20, // monospaced data text: questions, model answers
    token: 19, // word inside a 56 px token cell (0.34 of the cell)
    radarLabel: 18, // compact radar inside a teaser panel only (charts.radar({ compact: true })): the reading floor
    radarLegend: 16, // legend of a compact radar (secondary floor); a radar of its own uses the chart roles
  },
  chart: {
    group: 22, // group header over several panels
    title: 21, // panel title with its arrow ("FID ↓")
    axis: 19, // axis title ("Training tokens (B)")
    legend: 19,
    tick: 18, // tick numbers
  },
};

// Nobody should have to read text smaller than this share of the figure width (about 4.8 pt at 5.5 in).
export const FLOOR_PCT = 1.2;
// Secondary legends the author explicitly asked to shrink may go down to this share, never below.
export const SECONDARY_FLOOR_PCT = 1.05;

export const STROKE = {
  diagram: {
    flow: 2.8, // dashed data-flow tracks
    flowDash: [5, 8],
    head: [10, 12], // arrowhead length and full width
    arrow: 2.4, // solid arrow along an axis ("Denoising steps")
    arrowHead: 12,
    divider: 2.6, // vertical dashed line between panels
    dividerDash: [6, 9],
    rowDivider: 2, // horizontal dashed line between examples
    module: 1.6, // encoder and decoder outlines
    chip: 1.3, // prompt chips, answer boxes
    tile: 1.2, // latent tile outline
    hatchWidth: 5, // noisy-latent stripes, 45 degrees
    hatchPitch: 14,
  },
  chart: {
    line: 2.5,
    marker: 4.5, // circle radius
    markerRing: 1.4, // white ring around markers
    grid: 1.2,
    axis: 1.5,
    tickMark: 7,
    legendLine: 2.6,
    legendBox: 1.5,
  },
};

// Chart panel geometry at the chart reference scale. Keep plot areas in this range: lines are 2.5 px, and a plot area of
// 560 px made them look thin. A figure with one or two panels is placed at half width instead of stretching panels.
export const PANEL = { plotWidth: [160, 260], plotHeight: 180 };

// Corner radius in px. Three levels carry the hierarchy; do not invent in-between values.
export const RADIUS = { container: 16, lane: 12, block: 12, chip: 10, legend: 10, tile: 4, pill: "half" };

// Cell sizes of latent tiles and tokens at the diagram reference width.
export const CELL = { twoPanels: 56, threePanels: 40, gapTwoPanels: 17, gapThreePanels: 11 };

// Text width of an ICLR or NeurIPS page. pt = px * PRINT_WIDTH_PT / figure width.
export const PRINT_WIDTH_PT = 396;

// The two paper formats (docs/figure-principles.md, principle 13). placement is the share of \linewidth. A figure placed
// at up to 0.75 of \linewidth is a one-column figure (near square or a chubby rectangle); a wider one is a full-width
// figure (moderately wide). The ranges are approximate: an aspect within TOLERANCE of a bound still fits.
export const FORMAT = {
  column: { name: "one-column", maxPlacement: 0.75, aspect: [0.8, 1.7] },
  full: { name: "full-width", aspect: [1.8, 3.2] },
  tolerance: 0.05,
};
// Near the boundary (0.70..0.80 of \linewidth) the shape decides: a wide figure there is a full-width figure.
export const formatOf = (placement, aspect) => {
  if (aspect != null && placement > 0.7 && placement <= 0.8) return aspect >= 1.75 ? FORMAT.full : FORMAT.column;
  return placement <= FORMAT.column.maxPlacement ? FORMAT.column : FORMAT.full;
};
// Word budget of a diagram by figure type (labels in the sans face; quoted examples and data in the monospaced face do
// not count), measured on approved figures: a teaser about 23 words, a method overview about 33. A label is a noun phrase
// of at most LABEL_WORDS words; explanations go to the caption.
export const WORDS = { teaser: 25, overview: 40, detail: 50, qualitative: 30, diagram: 40 };
export const LABEL_WORDS = 4;

// Visual hierarchy (docs/figure-principles.md, principle 9). Every diagram element is one of three levels; a lower level
// is never larger or stronger than a higher one. Text roles are those of TEXT.diagram.
export const LEVEL = {
  1: { name: "claim", text: "block", style: "SemiBold" }, // the one key module or path of the proposed method: accent fill
  2: { name: "method", text: "module", style: "Medium" }, // other parts of the proposed method: accent outline or light fill
  3: { name: "context", text: "note", style: "Regular" }, // inputs, baselines, fallback paths, shared parts: gray, outline or dashed
};

// An empty region inside a diagram larger than this (both sides as a share of the figure width) reads as a hole.
export const HOLE = { side: 0.08, area: 0.03 };
// Share of a diagram within 1% of the width from any element. Approved method figures measured about 0.50; spread-out
// figures whose empty space is cut up by thin lines measured 0.42.
export const DENSITY = { minCoverage: 0.44 };

// How far an aspect ratio lies outside the format's range, as a share (0 inside the range or within the tolerance).
export function aspectMiss(aspect, fmt) {
  const [lo, hi] = fmt.aspect;
  const miss = aspect < lo ? lo / aspect - 1 : aspect > hi ? aspect / hi - 1 : 0;
  return miss <= FORMAT.tolerance ? 0 : miss;
}

export function scaleFor(kind, width) {
  if (!REF_WIDTH[kind]) throw new Error(`unknown figure kind: ${kind}`);
  return width / REF_WIDTH[kind];
}
// Text size for a role, scaled to the figure width and rounded to half a pixel.
export function textSize(kind, role, width) {
  const base = TEXT[kind]?.[role];
  if (base == null) throw new Error(`unknown text role ${kind}.${role}`);
  return Math.round(base * scaleFor(kind, width) * 2) / 2;
}
export function strokeWidth(kind, role, width) {
  const base = STROKE[kind]?.[role];
  if (typeof base !== "number") throw new Error(`unknown stroke role ${kind}.${role}`);
  return Math.round(base * scaleFor(kind, width) * 10) / 10;
}
export const printedPt = (px, width, printPt = PRINT_WIDTH_PT) => (px * printPt) / width;
export const floorPx = (width, pct = FLOOR_PCT) => (width * pct) / 100;

// Colours. One accent hue for "ours", one second hue for a second modality or a second method, grays for baselines.
export const NEUTRAL = {
  title: "#111111",
  ink: "#374151",
  sub: "#4B5563",
  muted: "#6B7280",
  tick: "#4B4B4B",
  axisTitle: "#333333",
  grid: "#E6E6E6",
  axis: "#CFCFCF",
  rule: "#BDBDBD",
  divider: "#CBD0D6",
  band: "#EDF0F4",
  line: "#AEB4BC",
  white: "#FFFFFF",
};
export const OURS = { deep: "#197A8A", mid: "#8FC4CE", stroke: "#A6D0D8", lane: "#EBF4F6", ink: "#136570", pill: "#D3E9ED", hatch: "#197A8A", hatchAlpha: 0.55 };
export const SECOND = { deep: "#A98548", mid: "#D9BD8A", stroke: "#DCC69C", lane: "#FAF5EC", ink: "#6E5527", hatch: "#A98548", hatchAlpha: 0.7 };
export const BASELINE = { deep: "#BCC2CA", mid: "#E4E7EB", stroke: "#D5D9DE", lane: "#F5F6F8", ink: "#6B7280", hatch: "#C3C8CF", hatchAlpha: 0.7 };
// Method colours in charts: ours in the accent, the first baseline in the second hue, the rest in grays.
export const SERIES = ["#197A8A", "#A98548", "#9AA2AD", "#6B7280", "#C3C8CF"];
// Frozen and trained parts: a snowflake and a flame badge (the usual convention). Vector icons, not emoji: emoji
// glyphs are rasterised or dropped in Figma PDF exports. Override per paper if the palette forbids these hues.
export const BADGE = { frozen: "#3B82C4", trained: "#E4572E", trainedInner: "#F6B26B", size: 28 };
// Red and blue only point at positions (a phrase and its region); they never colour a module.
export const CURSOR = { red: "#E5484D", blue: "#2F6FEB" };

// Blend a colour over white. Figures never use transparency: PDF viewers that ignore it paint the colour solid.
export function mix(hex, alpha, over = "#FFFFFF") {
  const c = (h, k) => parseInt(h.slice(k, k + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((k) => Math.round(c(over, k) + alpha * (c(hex, k) - c(over, k))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}
