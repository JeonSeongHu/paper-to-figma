# Kit API for figure scripts

A figure script is the body of an async function run inside Figma with `figma`, `kit` and `args` in scope. It returns a
JSON value, usually the result of `kit.place`. Run it with `bun src/cli.mjs script file.js --args '{"page": "Figures"}'`
(the plugin needs "Allow scripts"). If the script throws, every node it created is removed.

Declare the figure width first and take every size from it; if the result grows past it, throw instead of shrinking text.
Pass the declared width to `kit.place`: a figure narrower than it keeps its print size when placed at
`width / declaredWidth` of `\linewidth`. `place` stores that placement and the kind on the frame, so `lint` and `verify`
judge the figure at its printed size without `--placement`.

```js
const FW = 1498; // sizes of a full-width diagram
const Z = kit.sizes("diagram", FW); // { caption: 32, block: 32, module: 28, lane: 26, note: 22, data: 20, ... }
// ... build ...
if (root.width > FW) throw new Error("too wide: remove a stage or use two rows; do not shrink text");
const aspect = root.width / root.height;
if (aspect > 3.2) throw new Error(`aspect ${aspect.toFixed(2)}: stack tokens across the flow or break the flow into rows`);
return await kit.place(root, { pageName: args.page, name: "Figure 2 / method overview", declaredWidth: FW, type: "overview" });
// -> { w, h, aspect, latexWidth: "0.74\linewidth", kind: "diagram", ... }
```

Most diagram parts take the declared width as their last argument (`figureWidth`, `fw`); it scales strokes, radii and
text roles. Leave it out only for a full-width figure at the reference width 1498.

## Core (`kit.*`)

| Function | Use |
|---|---|
| `AL(name, "HORIZONTAL" \| "VERTICAL", { w, h, fill, stroke, sw, dash, gap, pad, r, main, cross })` | auto-layout frame; never clips |
| `add(parent, ...children)` | append and return the parent |
| `T(text, size, { style, color, align, w, mono })` | text; ↑↓ switch to Roboto; `w` wraps at a width |
| `textWidth(text, size, o)` | width of a text before placing it (for sizing boxes around labels) |
| `TM(text, size, o)` | monospaced data text (prompts, questions, model outputs) |
| `svg(markup, name)` | vector from SVG; refuses `opacity`, `fill-opacity`, `stroke-opacity` |
| `rect(w, h, fill, radius)`, `box(name, w, h)`, `spacer(w, h)` | shapes and empty frames |
| `arrow(length, { orient: "right" \| "up" \| "down" \| "left", color, width, head, dashed })` | straight arrow with a filled head ("h" and "v" are right and up) |
| `dashedLine(length, "v" \| "h", { width, dash })` | divider between panels or examples |
| `absolute(parent, node, x, y)`, `rel(node, ref)` | overlays positioned from measured geometry; works in auto-layout frames and plain frames |
| `sizes(kind, width)`, `strokes(kind, width)` | the size spec at a figure width |
| `spec.mix(hex, alpha)` | an opaque tint (no transparency anywhere) |
| `place(root, { pageName, name, x, y, declaredWidth, placement, kind, type })` | put the figure on a page; a frame with the same name is replaced in place; stores placement, kind, type (`teaser`, `overview`, `detail`, `qualitative`: the word budget) and the colour meanings on the frame |
| `preloadImages(node)` | wait for images before an export |

## Diagram parts (`kit.diagram.*`)

| Function | Use |
|---|---|
| `palette("ours" \| "second" \| "baseline")` | role colours, all opaque |
| `element(label, level, m, { w, h, fw, dashed, sub })` | a labelled element at hierarchy level 1 (claim: accent fill, block-size text; one per figure), 2 (method: accent outline, module size) or 3 (context: gray outline, note size). `dashed` for an optional input or a fallback path; `sub` a second short line |
| `icon(kind, { size, color, fw, label, dashed })` | vector icon for an input or a representation: `image`, `frames` (views or frames), `film` (demonstration video), `clock` (time, age, delay), `arm` (robot state), `memory` or `stack` (a storage cylinder: memory, history), `text` (an instruction when the paper gives no example). With `label`, the label sits right under it; `dashed` puts icon and label in a dashed box (an optional input) |
| `blockedArrow(length, { orient: "right" \| "up" \| "down" \| "left", fw })` | a dashed gray arrow ending in a red cross: the information does not reach the next element |
| `timeline(length, { ticks: [{ x, label }], label, fw })` | a time axis: gray line with an arrowhead, a tick and a name at every event (x from the axis start), the axis name at the end. Put it next to the events; lanes line up on it (same x, same moment) |
| `span(width, { label, m, height, fw, dashed })` | a duration on a time axis (how long a computation takes, how old a value is): a flat rounded bar with an optional short name inside |
| `meaning(colour, text)` | declare what a colour stands for in this diagram; verify compares it with the colours the paper's charts give to methods |
| `flowRow(items, { gap })` | a row of stages and arrows lined up on the stages' centres, captions hanging below |
| `captioned(node, caption, { fw, side: "bottom" \| "top" })` | a stage with a caption right next to it; `flowRow` aligns on the node |
| `keyBlock(label, w, h, m, fw)` | the contribution: the one accent-filled block of the figure |
| `block(label, w, h, fw, { fontRole })` | the shared model block (neutral band) |
| `moduleBox(label, w, h, m, fw)` | an outlined module |
| `trapezoid(label, m, "enc" \| "dec", w, h, fw, "v" \| "h")` | encoder or decoder; grows to fit its label |
| `tile(kind, m, size)`, `tileRow(kinds, m, size, gap)` | latent tiles: `clean`, `noisy` (hatched, no clipping), `empty` |
| `token(word, m, size)` | a word token |
| `tokenStack(n, m, { size, orient })` | tokens stacked across the flow (vertical in a left-to-right figure); no caption repeating the count |
| `tokenStrip(count, label, m, { size, show })` | a row of tiles with a caption; only when the count is the point of the figure |
| `pinBadge(root, module, "frozen" \| "trained", fw)` | snowflake or flame badge on the module's top-right corner (the drawn corner for trapezoids) |
| `pinStates(root, [{ node, state: "frozen" \| "trained" }], fw)` | give it every module's state: only the rarer state gets badges; returns `{ marked, legend }` with a legend of that one symbol (null when all states are the same) |
| `badgeLegend(fw, { kinds })` | the frozen / trained legend, for an empty corner of the figure; `kinds` limits it to the symbols used |
| `chip(text, m, fw, { w, align })` | a prompt chip in the monospaced face; line breaks in the text are kept, `w` wraps |
| `lane(parent, x, y, w, h, m)` | a tinted lane behind a column |
| `flowTracks(parent, segs)` | dashed input-to-output tracks with arrowheads |
| `caption(text, { ours })` | panel caption "(b) ..." |
| `symbolLegend(items)` | legend of diagram symbols |

## Charts (`kit.charts.*`)

`linePanel`, `barPanel`, `legend`, `group` and `radar` are the parts `renderSpec` uses; call them directly only when a
chart has to sit inside a diagram (for example a radar as panel (c) of a teaser).

Numbers drawn inside a diagram come from a checked spec like any chart. Write the spec (figure-spec.md) and run the
script with it; the spec must pass `check`, and the script receives the checked spec, with plain numbers and the
paper's colours, as `args.spec`:

```bash
bun src/cli.mjs script work/p/teaser.js --spec work/p/figures/teaser-result.json --paper p --page Figures
```

```js
const panel = kit.renderSpec(args.spec); // or read args.spec.axes / args.spec.groups and draw your own marks
```
