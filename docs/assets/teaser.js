// README teaser: the name in the code face, with parts from the kit scattered around it, out of focus.
// This is a README image, not a paper figure: blur, opacity and clipping are fine here (it is exported as PNG).
// All numbers are invented.
// Run:    bun src/cli.mjs script docs/assets/teaser.js --page "Figures"
// Export: bun src/cli.mjs export "paper-to-figma / teaser" --page "Figures" --format PNG --scale 2 --out docs/assets/teaser.png
const W = 1280,
  H = 640,
  FW = 1498;
const D = kit.diagram,
  C = kit.charts;
const ours = D.palette("ours"),
  sand = D.palette("second");
const METHODS = [
  { id: "a", label: "Ours", ours: true, color: "#197A8A" },
  { id: "b", label: "Base", color: "#A98548" },
  { id: "c", label: "Other", color: "#9AA2AD" },
];

const root = kit.box("paper-to-figma / teaser", W, H);
root.fills = kit.paint("#FFFFFF");
root.clipsContent = true; // parts may run off the edges

// a part: placed, scaled, turned a little, faded and blurred; parts far from the name are softer
function put(node, x, y, { scale = 1, blur = 3, fade = 0.5, turn = 0 } = {}) {
  root.appendChild(node);
  if (scale !== 1) node.rescale(scale);
  node.rotation = turn;
  node.x = x;
  node.y = y;
  node.opacity = fade;
  node.effects = [{ type: "LAYER_BLUR", radius: blur, visible: true }];
  return node;
}
const group = (name, dir, gap, ...kids) => kit.add(kit.AL(name, dir, { gap, cross: "CENTER" }), ...kids);

// charts drawn by the chart kit from small specs
const line = kit.renderSpec({
  version: 1,
  kind: "chart-grid",
  name: "line",
  width: 420,
  placement: 0.45,
  methods: METHODS,
  x: { title: "Training steps", ticks: [10, 20, 40, 80] },
  groups: [{ title: "Training", columns: 1, panels: [{ title: "Success (%)", better: "higher", series: { a: [[10, 31], [20, 52], [40, 65], [80, 71]], b: [[10, 35], [20, 50], [40, 60], [80, 65]], c: [[10, 22], [20, 41], [40, 52], [80, 58]] } }] }],
  legend: { placement: "none" },
});
const bars = kit.renderSpec({
  version: 1,
  kind: "chart-grid",
  name: "bars",
  width: 420,
  placement: 0.45,
  methods: METHODS,
  groups: [{ title: "Per task", columns: 1, panels: [{ title: "Success (%)", type: "bar", better: "higher", categories: ["Pick", "Stack", "Wipe"], series: [{ method: "a", values: [84, 58, 72] }, { method: "b", values: [80, 48, 66] }, { method: "c", values: [70, 40, 61] }] }] }],
  legend: { placement: "none" },
});
const radar = C.radar({
  axes: ["Success", "Speed", "Memory", "Recall", "Cost"].map((label, i) => ({ label, better: i === 4 ? "lower" : "higher", values: { a: [9, 8, 7, 9, 3][i], b: [7, 6, 8, 6, 5][i], c: [6, 7, 5, 5, 6][i] } })),
  methods: METHODS,
  W: 330,
  H: 300,
  legendMode: "none",
  figureWidth: FW,
}).node;

// diagram parts
const tiles = D.tileRow(["noisy", "noisy", "clean", "clean", "clean"], ours, 44, 10, FW);
const sandTiles = D.tileRow(["clean", "clean", "noisy"], sand, 44, 10, FW);
const encoder = D.trapezoid("Encoder", ours, "enc", 170, 120, FW, "h");
const blocks = group("blocks", "HORIZONTAL", 18, D.element("Planner", 1, ours, { fw: FW, sub: "pretrained VLM" }), kit.arrow(60, { color: ours.deep }), D.element("Policy", 2, ours, { fw: FW }));
const inputs = group("inputs", "HORIZONTAL", 28, D.icon("frames", { fw: FW, label: "Views" }), D.icon("film", { fw: FW, label: "Demo" }), D.icon("clock", { fw: FW, label: "Age" }));
const time = kit.add(kit.AL("time", "VERTICAL", { gap: 8, cross: "MIN" }), D.span(170, { label: "compute", fw: FW }), D.timeline(380, { ticks: [{ x: 0, label: "t1" }, { x: 170, label: "t2" }, { x: 320, label: "t3" }], fw: FW }));
const chip = D.chip('"pick up the cup"', ours, FW);
const stack = D.tokenStack(5, ours, { size: 30, figureWidth: FW });

put(line, 24, 18, { scale: 0.78, blur: 3, fade: 0.55, turn: -4 });
put(tiles, 470, 44, { blur: 2, fade: 0.6, turn: 3 });
put(radar, 930, 0, { scale: 0.85, blur: 4, fade: 0.5, turn: 5 });
put(encoder, 40, 262, { blur: 5, fade: 0.5, turn: -7 });
put(bars, 1045, 250, { scale: 0.62, blur: 3, fade: 0.55, turn: -3 });
put(inputs, 40, 470, { blur: 2, fade: 0.6, turn: 2 });
put(time, 360, 500, { blur: 3, fade: 0.55, turn: -2 });
put(chip, 800, 560, { blur: 2, fade: 0.6, turn: 3 });
put(blocks, 820, 440, { scale: 0.8, blur: 4, fade: 0.5, turn: -4 });
put(sandTiles, 280, 200, { scale: 0.8, blur: 5, fade: 0.45, turn: -8 });
put(stack, 1200, 470, { blur: 5, fade: 0.45, turn: 6 });
put(D.icon("arm", { fw: FW, size: 56 }), 800, 190, { blur: 5, fade: 0.45, turn: 8 });
put(D.icon("memory", { fw: FW, size: 52 }), 560, 150, { blur: 6, fade: 0.4, turn: -6 });
put(D.badge("frozen", FW, { size: 44 }), 690, 150, { blur: 4, fade: 0.55 });
put(D.badge("trained", FW, { size: 44 }), 250, 420, { blur: 4, fade: 0.55 });
put(D.blockedArrow(110, { fw: FW }), 600, 470, { blur: 4, fade: 0.5, turn: -5 });

// the name, sharp, on a soft white halo so it reads over the parts
const halo = kit.rect(900, 170, "#FFFFFF", 85, "halo");
root.appendChild(halo);
halo.x = (W - 900) / 2;
halo.y = (H - 170) / 2;
halo.effects = [{ type: "LAYER_BLUR", radius: 40, visible: true }];
const name = kit.TM("paper-to-figma", 96, { color: "#111827", style: "SemiBold" });
root.appendChild(name);
name.x = Math.round((W - name.width) / 2);
name.y = Math.round((H - name.height) / 2);

return await kit.place(root, { pageName: args.page, name: "paper-to-figma / teaser", x: args.x ?? 0, y: args.y ?? 16000 });
