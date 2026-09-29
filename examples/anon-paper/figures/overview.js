// Method overview of the synthetic Anchor Tokens paper (examples/anon-paper/paper.md, section 2).
// Format: full width, moderately wide (about 2:1 to 3.2:1). Granularity of a method overview: named modules, inputs
// and outputs. Hierarchy: the anchor selector is the one level-1 element (the contribution); the other modules are
// level 2; inputs are level 3 and drawn as icons. Frozen and trained parts: only the rarer state (frozen) is marked.
// The token counts (256 -> 32 -> 8) go in the figure caption; the drawing shows
// fewer tokens after the selector and needs no count labels. Tokens are stacked across the flow (vertically, since
// the flow runs left to right) so the stacks match the module height and the figure does not grow sideways.
// Every label below appears in section 2; the instruction is quoted verbatim from it.
// Run: bun src/cli.mjs script examples/anon-paper/figures/overview.js --args '{"page": "Figures"}'
const FW = 1498; // sizes are taken for a full-width figure of this width
const NAME = "Anchor Tokens / method overview";
const { AL, add, T, TM, arrow, rel, absolute } = kit;
const D = kit.diagram,
  S = kit.spec;
const Z = kit.sizes("diagram", FW);
const OURS = D.palette("ours"),
  FROZEN = D.palette("baseline"),
  PLAIN = { deep: S.NEUTRAL.muted, mid: "#D1D5DB", ink: S.NEUTRAL.ink, stroke: S.NEUTRAL.line, lane: "#F5F6F8", hatchSolid: "#D1D5DB" };
const ARROW = { color: S.NEUTRAL.line, width: S.STROKE.diagram.arrow, head: S.STROKE.diagram.arrowHead };
const H = 170; // module height = height of a six-token stack
const TOK = 24;
const hArrow = () => arrow(46, { orient: "h", ...ARROW });
const up = (h) => arrow(h, { orient: "v", ...ARROW });
const note = (s, color = S.NEUTRAL.sub) => T(s, Z.note, { color });

// camera image: an image icon (the paper shows no example image)
const picture = D.icon("image", { size: 72, figureWidth: FW });
const encoder = D.trapezoid("Image\nencoder", FROZEN, "enc", 150, H, FW, "v");
const selector = D.keyBlock("Anchor\nselector", 190, H, OURS, FW);
const policy = D.block("Policy\ntransformer", 200, H, FW, { fontRole: "module" });
const head = D.moduleBox("Action\nhead", 140, H, PLAIN, FW);
const main = D.flowRow(
  [
    encoder,
    hArrow(),
    D.tokenStack(6, FROZEN, { size: TOK, figureWidth: FW }),
    hArrow(),
    selector,
    hArrow(),
    D.tokenStack(3, OURS, { size: TOK, figureWidth: FW }),
    hArrow(),
    policy,
    hArrow(),
    head,
    hArrow(),
    D.tokenStack(8, PLAIN, { size: 18, gap: 3, figureWidth: FW }),
  ],
  { gap: 6, name: "pipeline" },
);
// top padding leaves room for the badges pinned on the top-right corners of the modules
const root = AL(NAME, "VERTICAL", { fill: "#FFFFFF", pad: [2 + 0.5 * S.BADGE.size, 2, 2, 2], gap: 0, cross: "MIN" });
root.appendChild(main);
const spacer = kit.spacer(10, 10);
root.appendChild(spacer);

// every input enters from below, into the module that reads it: the camera image into the image encoder, the
// instruction (quoted from the paper) through the frozen text encoder into the selector, the state into the policy.
// The inputs form one row under the modules and the main flow stays one straight line.
const underEnc = add(AL("image path", "VERTICAL", { gap: 6, cross: "CENTER" }), up(34), D.captioned(picture, "Camera image", { figureWidth: FW }));
const instr = add(
  AL("instruction", "HORIZONTAL", { w: 300, pad: [10, 14, 10, 14], fill: "#FFFFFF", stroke: PLAIN.stroke, sw: S.STROKE.diagram.chip, r: S.RADIUS.chip }),
  TM('"pick up the cup and put it on the plate"', Z.data, { color: S.NEUTRAL.ink, w: 272, align: "CENTER" }),
);
const textEnc = D.trapezoid("Text encoder", FROZEN, "enc", 200, 64, FW, "v");
const underSel = add(AL("instruction path", "VERTICAL", { gap: 6, cross: "CENTER" }), up(34), textEnc, up(26), instr);
// the paper gives no example state: an icon with its name
const state = D.icon("arm", { size: 56, figureWidth: FW, label: "Proprioceptive state" });
const underPol = add(AL("state path", "VERTICAL", { gap: 6, cross: "CENTER" }), up(34), state);
const encBox = rel(encoder, root),
  selBox = rel(selector, root),
  polBox = rel(policy, root),
  mainBox = rel(main, root);
const under = [
  [underEnc, encBox],
  [underSel, selBox],
  [underPol, polBox],
];
for (const [path, box] of under) absolute(root, path, Math.max(0, box.x + box.w / 2 - path.width / 2), box.y + box.h + 2);
const bottom = Math.max(...under.map(([p]) => p.y + p.height));
spacer.resize(10, bottom - (mainBox.y + mainBox.h) + 2);

// every module's state goes in; only the rarer one (the two frozen encoders) gets a badge, and the legend shows that
// one symbol under the action head, the one module without an input below it
const states = D.pinStates(root, [{ node: encoder, state: "frozen" }, { node: textEnc, state: "frozen" }, { node: selector, state: "trained" }, { node: policy, state: "trained" }, { node: head, state: "trained" }], FW);
if (states.legend) {
  const headBox = rel(head, root);
  absolute(root, states.legend, Math.min(root.width - states.legend.width - 2, headBox.x + headBox.w / 2 - states.legend.width / 2), Math.round((headBox.y + headBox.h + bottom - states.legend.height) / 2));
}
if (root.width > FW) throw new Error(`overview is ${Math.round(root.width)} px wide, over the declared ${FW}: remove a stage or use two rows; do not shrink the text`);
const aspect = root.width / root.height;
if (aspect > 3.2) throw new Error(`overview is ${aspect.toFixed(2)}:1, too wide for a full-width figure (2..3.2)`);
return await kit.place(root, { pageName: args.page, name: NAME, x: args.x, y: args.y, declaredWidth: FW, type: "overview" });
