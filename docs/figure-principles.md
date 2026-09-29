# Figure principles

[한국어 번역](figure-principles.ko.md) (this English version is the reference; where the two differ, this one holds)

## How to read this

The document has two layers.

- **Principles (sections 1 to 5)** hold for any paper and any figure. Each principle has a rule, how to apply it, and cases. A case is a correction made to a real figure: it shows why the principle exists. A case is not copied to another figure; the decision is made again from the principle.
- **Defaults (section 6)** are the numbers and styles that implement the principles (text sizes, line widths, palette, fonts, word budgets). The kit (`kit/spec.js`) and the checks use them. A paper may change them; the report says why.

An agent reads this document before making figures. When a figure departs from a principle, the report names the principle and the reason.

## 1. Content: what goes in

### Principle 1. One figure answers one question, and its kind sets the unit of information

- **Rule:** Before drawing, write the question the figure answers in one sentence and decide its kind. Each kind carries a different unit of information; what does not fit that unit goes to another figure or to the caption.
- **Apply:** Use the table to decide what goes in and what stays out. When one idea appears in several figures, the teaser shows the idea, the overview the flow, and the detail figure the structure.

| Kind | Unit | Put in | Leave out |
|---|---|---|---|
| Teaser | One claim of the paper | The structural difference between the prior and the proposed approach; one key result if needed | Method jargon, repeat counts, submodule detail |
| Method overview | Modules and flow | Inputs and outputs, named modules, the flow; trained and frozen parts when training is part of the claim | Layer structure, loss formulas, hyperparameters |
| Method detail | Inside one module | Tensor shapes, operations, conditioning inputs, structures such as masks, a symbol legend | Other modules' detail, results |
| Result chart | One panel per metric | Every data point, axis titles and units, the direction that is better | Concept icons, trend lines not in the data |
| Summary comparison (radar and similar) | Many metrics at a glance | All compared methods and all metrics, the normalisation | Axes chosen to hide unfavourable metrics |
| Qualitative example | Real inputs and outputs | Inputs and outputs exactly as printed, one or two examples | Corrected outputs, invented examples |

- **Cases:**
  - A teaser labelled "×T denoise" and method terms, which read as if they applied to the whole figure; the labels were removed.
  - An attention mask was taken out of a teaser and drawn in a detail figure.

### Principle 2. The authors' own description of a figure is a requirement

- **Rule:** When the paper holds a figure placeholder or a sketch (a "to be drawn" box, a paragraph describing the layout and what the figure should show), treat it as the authors' requirements. Follow it, and report any part not followed with the reason.
- **Apply:**
  - `prepare` keeps the text inside each figure environment in `index.figures[].sketch`. Read it before planning.
  - Put the layout the sketch asks for (lanes, panels) and what it wants seen at a glance in the first line of the figure plan.
  - Numbers in a sketch that are examples ("e.g.") or whose table is still empty are not drawn (principle 7).
- **Case:** A placeholder described the layout and what the figure should show; the figure drawn instead was a single data path, and the behaviour over time the authors wanted to show was missing.

### Principle 3. Do not write what the drawing already shows

- **Rule:** A label adds only what the drawing cannot show. When a label and the drawing say the same thing, drop the label.
- **Apply:**
  - Several drawn tokens need no "256 patch tokens" label; the count goes to the caption. A short count label is used only when the count is the point of the figure.
  - A setting shared by all methods goes to the caption, not to the legend.
  - When several panels share one title, put it on the group and name each panel by what differs.
- **Cases:**
  - A "256 patch tokens" label repeated what the drawn tokens already showed.
  - A legend line held a setting shared by all methods; it moved to the caption.
  - Two panels of a bar chart, eight tasks each, carried the same title.

### Principle 4. Short labels; explanations go to the caption

- **Rule:** A diagram label is a noun phrase of one to four words. Sentences go to the caption. Each figure kind has a label word budget (section 6). A relation one would explain in a sentence is drawn as a visual code.
- **Apply:**
  - A missing link ("not an input", "not passed on") is either not drawn or drawn as a blocked arrow (`kit.diagram.blockedArrow`).
  - Optional inputs and fallback paths get a dashed outline or a dashed arrow (`element(..., { dashed: true })`), never "(optional)" or "if ... is not ready".
  - Settings such as rates and counts go to the caption, unless they are the point of the figure.
  - `lint` counts label words and flags labels over four words. Quoted examples in the monospaced face do not count.
- **Case:** A reviewed teaser and overview carried 23 and 33 label words. The same kinds of figure made without the rule carried 68 and 61, including sentence labels such as "not an input of the policy", "supervision only, never passed to ..." and "if no query is ready".

### Principle 5. Show the real thing, and name parts by their role

- **Rule:** Show the real object instead of a placeholder label; quote examples and task names exactly as the paper prints them. Name diagram parts by their role (VLM, action expert, image encoder), not by model; model names go to the caption and the text.
- **Apply:**
  - Put the instruction the paper quotes, in the monospaced face, where a placeholder would say "Language instruction".
  - When the paper gives no example, keep the label; never invent one (principle 7).
  - Model names appear in four cases only: method names in result charts and tables (readers must tell methods apart), the proposed method's name, a model whose identity is part of the claim (the same architecture with a different backbone), and when the user asks.
  - Method names are written as the paper writes them; no new abbreviations.
- **Cases:**
  - An overview used a placeholder label where the paper quoted a real instruction.
  - A diagram named its backbone and its baseline policy by model name instead of by role.

### Principle 6. Draw what can be drawn

- **Rule:** Draw inputs and intermediate representations so that their kind shows in their shape. Use text only for names a drawing cannot carry.
- **Apply:** Use the vector icons of `kit.diagram.icon`. Emoji characters are rasterised or dropped in PDFs (principle 21).

| What | Drawing |
|---|---|
| One image, an observation | the `image` icon, or the paper's own image |
| Several views or frames | `frames` (stacked frames) |
| A demonstration video | `film` (a film strip) |
| Time, age, delay | `clock` |
| Robot state, proprioception | `arm` |
| History, memory | `memory` (a storage cylinder) |
| An instruction | a chip with the quoted example; the `text` icon only when there is no example |
| Tokens, latents | a stack of squares (`tokenStack`) |

- **Case:** Four inputs drawn as identical text chips did not show which was an image, an instruction or a history, and a time embedding was a text box as large as a module.

### Principle 7. Every fact in a figure comes from the paper as printed

- **Rule:** Numbers, model outputs, benchmark inputs and examples are written as the paper prints them. Nothing is invented; what looks wrong is reported, not fixed.
- **Apply:**
  - Every value in a spec cites its source (a table cell or a quoted clause), and `check` compares it at the printed precision. Values are printed as the paper prints them.
  - Numbers inside a diagram (a result panel in a teaser) are a spec too, passed with `script --spec`.
  - Unfavourable results stay. A normalised view comes with the absolute values (a table or the caption).
  - Data from outside the paper is marked `external` with its source.
  - An interpretation by the agent is labelled as such, never presented as a requirement.
  - Information left out of the drawing (error bars too small to see) is reported as left out.
- **Cases:**
  - A model output with a grammar error stayed as printed, with a note suggesting another example.
  - A point removed from a plot on a co-author's advice was removed from the plotted data only; the source data kept it.

## 2. Encoding: how it is shown

### Principle 8. One visual variable, one meaning

- **Rule:** Decide for each figure what colour, shape, line style, symbol and position mean. No variable carries two meanings, and one meaning keeps one code across the whole paper. Charts and diagrams share one palette.
- **Apply:**
  - Decide first what colour stands for (methods, modalities, or emphasis) and make it readable inside the figure (principle 12).
  - Position is a visual variable too. When an axis means time, everything along it means a moment; an order that is not time (what a context window holds, processing stages) is not laid out on the same axis.
  - `check` records the colour of each method in `work/<paper>/palette.json`. A diagram declares its colour meanings with `kit.diagram.meaning(colour, meaning)`, and `verify` compares them with the charts.
  - Shapes follow one vocabulary: rounded rectangles for named modules, trapezoids for encoders and decoders, small squares for tokens, square-cornered rectangles for tensors and images.
  - Line styles have one meaning each: a thick solid arrow for the main flow, dashed lines for conditioning inputs and optional paths, a dashed line ending in ✕ for a blocked link.
  - Colours that point at locations (red, blue) are used only for locations and blocked links, and differ from the colour maps of any images (viridis and similar).
- **Cases:**
  - In one paper, sand meant a baseline method in the charts and a modality or an auxiliary input in the diagrams. Handing out colours per figure in list order also made sand mean a different method in each chart.
  - In a two-lane figure, horizontal position meant time in one lane and order inside a context window in the other, so a module that runs at every query looked as if it ran at the end of time.

### Principle 9. Three levels of visual hierarchy

- **Rule:** Every element belongs to one of three levels. A lower-level element is never larger, stronger or longer than a higher-level one. Emphasis goes only to what the figure argues for.

| Level | What | Shape | Text |
|---|---|---|---|
| 1 Claim | The key module or path of the proposed method; one per figure | Accent fill | Block size, SemiBold |
| 2 Method | The other parts of the proposed method | White with an accent outline, or a light fill | Module size, Medium |
| 3 Context | Inputs, baselines, fallback paths, shared parts | Gray, outline or dashed, icons | Note size |

- **Apply:**
  - Kit parts record their level (`element(label, level, ...)`; `keyBlock` is 1, `moduleBox` and `trapezoid` 2, `chip` and `icon` 3). `lint` compares text sizes across levels and warns when more than one element is level 1.
  - Area and length follow the hierarchy too. A level-3 element such as a blocked link or a fallback path never spans most of the figure: a blocked arrow is about one module gap long, and `lint` warns above 15% of the width.
  - Reference values such as human performance or a theoretical bound are context: draw them as a reference line with a short name, not as a bar, so that they never become the largest element.
  - In a comparison figure, the purpose decides how shared parts are coloured, and one figure never mixes the two ways:
    - **A figure that argues for the proposed method (a teaser):** the whole compared panel drops to level 3, shared parts included; the difference reads as a difference in emphasis.
    - **A neutral comparison or analysis:** shared parts keep one colour in every panel and only what differs changes; the difference reads as a difference in structure.
- **Cases:**
  - A teaser set a prior approach (a) beside the proposed one (b). Panel (a) went fully light gray and colour stayed in (b), because the figure argued for the proposed approach.
  - A fallback box and a time-embedding box (level 3) had the same text size and weight as the key projector (level 2), so the figure had no hierarchy.

### Principle 10. Only as many channels as it takes to tell methods apart

- **Rule:** Use the fewest channels (colour, line style, marker shape) that tell compared methods apart, and keep the chosen ones across the figure and the paper.
- **Apply:**
  - When colour alone differs clearly in lightness too (teal, sand, gray), use colour alone.
  - When colour is not enough (many methods, similar lightness), write names directly beside lines or bars.
  - Put the better direction (↑↓) in the title of every metric where direction matters.
- **Case:** Methods first differed by line style and marker shape as well as colour; the extra channels added nothing and were removed.

### Principle 11. A property every module has is marked on the rarer side only

- **Rule:** Mark a property that every module has (trained or frozen) only on the rarer side. When training is not part of the figure's claim, say it in the caption.
- **Apply:** Pass every module's state to `kit.diagram.pinStates(root, [{ node, state }], fw)`: it badges only the rarer state and returns a legend with that one symbol. Mostly trained: snowflakes on the frozen modules only. Mostly frozen: flames on the trained ones only. `lint` warns when one badge sits on more than half of the modules.
- **Case:** Five of six modules carried a flame and one a snowflake; the single snowflake carried the same information.

### Principle 12. Every code in a figure can be read in the figure

- **Rule:** Icons, colours, line styles, symbols and ellipses ("…") can be decoded from the figure itself. Name each one where it first appears, or put it in a legend. The caption explains; it does not decode symbols. This principle comes before cutting words (principle 4) and before drawing instead of writing (principle 6).
- **Apply:**
  - When a code repeats, name its first use only. An icon inside a module (a clock inside a call box) is named once too.
  - Two kinds of unnamed elements that differ only in look (gray cells and teal cells) both need a name or a legend entry.
  - Use "…" only where it is clear what continues (at the end of a row of repeated cells).
  - Code names are one or two words and count toward the word budget, but a name is never dropped to meet the budget; explanatory labels move to the caption instead.
  - `lint` flags an icon kind that has neither a name nor a legend entry.
  - When reviewing the render, cover the caption and read every code.
- **Case:** With only the rules to cut words and to draw icons applied, a reader could not tell from the figure that a clock inside a call box was a time embedding, or that gray cells were the default used when no input is ready. The label count was within its budget.

## 3. Layout

### Principle 13. Decide the format and aspect first

- **Rule:** A paper figure takes one of two formats, set by where it goes. Decide the format first and lay the content out inside its aspect ratio.

| Format | Where | Width : height |
|---|---|---|
| Full width | both columns of a two-column paper, the text width of a one-column paper | about 2:1 to 3.2:1 |
| One column | one column of a two-column paper, at most 0.75 of the text width of a one-column paper | about 1:1 to 1.7:1 |

- **Apply:**
  - When the figure is too wide, stack elements across the flow, drop repeated labels, or break the flow into two rows.
  - A chart with few panels gets a narrower figure, not wider panels; wider panels make lines and text look thin.
  - When no arrangement fits either format, split the figure by what it measures (one figure per group of metrics) instead of shrinking text.
  - `lint` checks the aspect.
- **Cases:**
  - An overview with its tokens laid out along the flow reached 4.9:1, too wide for a paper.
  - Two chart panels spread over the full width made their lines look thin.
  - Nine bar metrics in one figure left no room for their value labels; the figure was split by the paper's own grouping of the metrics.

### Principle 14. One direction, one straight line

- **Rule:** A figure's flow runs in one direction. The main flow lies on one straight line, and auxiliary inputs enter at right angles to it.
- **Apply:**
  - Choose the direction from the content: left to right for a pipeline of stages, bottom to top for an encoder–decoder structure where inputs become representations and then outputs, top to bottom for a hierarchy where a higher system conditions a lower one. When the figure has a time axis, time runs left to right and the information flow runs at right angles to it.
  - When the authors' sketch sets the direction, follow it (principle 2).
  - Repeated elements such as tokens or latents stack across the flow: vertically in a left-to-right figure (`kit.diagram.tokenStack`), matching the module height; horizontally in a bottom-to-top figure.
  - Auxiliary inputs (instructions, state) come into the main flow from below.
  - Arrows attach to the centres of the elements they connect.
- **Case:** A labelled row of tokens made an arrow point at the centre of "tokens plus label" rather than at the tokens, and the flow line broke. `kit.diagram.flowRow` aligns on each element itself.

### Principle 15. Draw a mechanism with its cause, and draw time when time matters

- **Rule:** When a figure shows a mechanism (what happens under which condition), draw the condition together with the result, so a reader can answer "why does this happen" from the drawing. When time is the variable that matters, make time a main axis of the figure.
- **Apply:**
  - Give every event on a time axis a tick and a name (queries t1, t2; calls 1, 2, 3). Draw durations as bars (`kit.diagram.span`). Keep the axis next to the events (`kit.diagram.timeline`).
  - The same horizontal position is the same moment in every lane; events across lanes line up vertically.
  - When the result depends on a condition, draw every case (a new value, a reused older value, a default when there is no value yet).
  - Structure that is not time (what goes into a context window) is drawn away from the time axis (principle 8).
  - The spacing between repeated units (time steps, calls) is set by what goes between them: compress it for schematic time; for proportional time, put information such as duration bars in the gaps (principle 17).
- **Case:** A figure of two asynchronous systems linked one output of the upper system to two calls of the lower one, but did not show the condition: the next output was still being computed, so the older one was reused. Time was a bare line at the bottom of the figure with no ticks, and the space between calls was empty. The authors' sketch had asked for this reuse pattern to be visible at a glance.

### Principle 16. Group with the Gestalt principles

- **Rule:** Readers group what is close, what shares a region, what looks alike and what one line connects. Make these four agree with the groups the figure means.
- **Apply:**
  - **Proximity:** a label sits right beside its element, no further away than half the gap between modules (`captioned`). Related elements sit close; separate groups sit apart.
  - **Common region:** the modules of one system or stage share one light region (`lane`). Only the proposed method's region gets a coloured background.
  - **Similarity:** the same role has the same shape and colour; different roles differ in shape or colour.
  - **Continuity:** the main flow is one thick straight line, auxiliary flows are thin and dashed, and flows do not cross.
- **Case:** An output label sat in a far corner away from the output cells, and nothing separated two systems, so only the text told which module belonged to which system.

### Principle 17. Align exactly, and spread space evenly

- **Rule:** Elements are either exactly aligned or clearly apart; a near miss is the worst case. No empty region larger than a module stays inside a figure.
- **Apply:**
  - Text in a box is centred both ways. Connected boxes share a centre line even without text.
  - Auto layout enforces alignment; absolute positions are only for elements that must overlap (lanes, crossing lines, badges).
  - Use two gaps only: small inside a group, large between groups. Elements with the same role have the same size (lane widths, row heights).
  - A panel caption sits under the centre of its panel's content.
  - A comparison panel keeps no empty slot for a part that only the other panel has; shorten that row or move the shared parts.
  - Outer margins are minimal (1 to 3 px).
  - Repeated units are not spread at even intervals to fill the width. When width is left over, narrow the figure or put information in the space (principle 15).
  - `verify` finds the largest empty rectangle in the render and warns when both sides exceed 8% of the width and its area exceeds 3% of the figure (qualitative tables excepted). Thin lines (arrows, curves, axes) can cut empty space into pieces this test misses, so `verify` also measures coverage, the share of the figure within 1% of the width from any element: reviewed figures measured about 50%, and below 44% is a warning.
- **Cases:**
  - In a table-like figure where one answer spans several rows, a centred answer was 15 px off one row; stretching the answer box to the full row height made it read as a merged cell.
  - In a comparison teaser, the prior-approach panel kept an empty slot for a module only the proposed approach has, leaving large empty regions under the model and beside the inputs, and that panel's caption was off centre.
  - A figure that spread its time steps evenly over the full width passed the empty-region test but covered only 42% (reviewed figures about 50%); curves and arrows had cut the empty space into small pieces.

### Principle 18. Compare within one frame, and spend area on what differs

- **Rule:** Panels and cells that are compared share one grid, one set of axes and one order. Parts identical in both panels are drawn once or reduced to level 3 (small and gray), so that most of the area goes to what differs.
- **Apply:**
  - Chart panels in one figure share the x axis; the x title appears only under the lowest panel of each column.
  - Comparison panels share row heights and y positions.
  - Method order and colour are the same in every panel and in the legend, and bars follow the legend order.
  - A shared input is drawn once for both panels or reduced to icon size; a repeat mark (× N) appears once.
  - In a table-like figure, column headers align with the left edge of their column's content.
  - `lint` warns when a label of three or more words repeats.
- **Cases:**
  - Panels with different axis titles and tick spacings could not be compared at a glance.
  - A four-word input label repeated in both panels of a comparison.

### Principle 19. The legend sits inside the figure, near what it explains, clear of the data

- **Rule:** The legend is inside the figure so the eye does not travel. It sits in the panel or region of the elements it explains, and it overlaps no data, label or line.
- **Apply:**
  - Put it in a boxed empty cell or corner when there is one; otherwise in one row under the figure.
  - A legend for one panel's symbols never sits in another panel. Symbols used across panels get one row under the figure.
  - A legend never sits right beside another element, where it would read as that element's label (principle 16).
  - A secondary legend may be smaller, never below the reading floor (section 6).
  - The proposed method comes first, and the legend holds only symbols the figure uses.
- **Cases:**
  - A long legend row under a chart fitted into an empty cell of the chart instead.
  - A radar legend sits boxed in a corner, overlapping the radar area but no label and no ring.
  - One legend explained a dashed box in the other panel; another sat right beside an icon label and read as that icon's name.

## 4. Output

### Principle 20. Judge sizes at print size

- **Rule:** Judge text, lines and symbols at the size the paper prints them, not in canvas pixels. When space runs short, change the content or the layout, never shrink the text.
- **Apply:**
  - Sizes are shares of the figure width (section 6); a figure placed below full width is computed with its `placement`.
  - Text that must be read has a floor.
  - Lines and symbols scale with the element they sit on; a wide panel never gets a thin line.
- **Cases:**
  - Figures drawn by language models kept coming back with text too small to read at print size; the sizes in section 6 are where those corrections settled.
  - Small labels chosen for a radar squeezed into one teaser panel had become the radar default, so a radar drawn on its own put its axis names at the reading floor (15 px) with lines 20% thinner than other charts. A radar is a chart and uses the chart roles; the small sizes are an option for a radar inside a panel (`compact`).

### Principle 21. It looks the same in every viewer

- **Rule:** The PDF looks the same in viewers that ignore transparency or masks, and every element lies inside the frame.
- **Apply:** The kit and `qa` guard against the pitfalls below. `qa` renders the PDF with transparency on and off and fails when the two differ; `lint` catches text outside the frame.

| Pitfall | Symptom | Guard |
|---|---|---|
| Clipping frames, masks, clipped SVG nodes | Figma writes soft masks, which some viewers draw as black boxes or ghosts | No clipping; hatch stripes are polygons cut to their cell |
| Translucent fills, group opacity | Viewers that ignore transparency paint them solid | Opaque colours pre-mixed with white (`kit.spec.mix`) |
| Images and fonts not yet loaded | Lavender placeholder fills, missing arrow glyphs | Load images and fonts and render once before exporting |
| Emoji characters | Rasterised or dropped | Vector icons (`kit.diagram.icon`) |
| Elements outside the frame | The PDF is cut, or grows past the frame and the size and aspect checks go wrong | Keep everything inside the frame |

## 5. Way of working

### Principle 22. Look at the render, and turn repeated corrections into checks

- **Rule:** Look at the render before reporting. A correction that came up once goes into a check or a kit default, so it does not come up again.
- **Apply:**
  - Open both renders of `verify` (normal and transparency off).
  - Check by eye what the checks cannot judge: proximity and grouping (principle 16), the meaning of the hierarchy (principle 9), model names (principle 5), agreement with the authors' sketch (principle 2), whether every code reads without the caption (principle 12), whether the drawing shows why the mechanism happens (principle 15), and whether wide space holds no information (principle 17).
  - Zero warnings does not end the work; the checks cannot know every problem, so the items above are judged on the render.
  - Fix what you find instead of listing it.
  - When the choice is a judgment call, make two or more variants and set them side by side.
  - When a check disagrees with a kit default, suspect the default first: find out whether it came from a decision made for one figure, and never loosen the check to match it. A radar text-size check was once loosened to match the kit default, and the small text stayed.

### Principle 23. Protect the user's work and context

- **Rule:** Change only what was asked, and protect the user's originals and anonymity.
- **Apply:**
  - A small correction changes only the element it names.
  - The user's originals are never overwritten, and deletions can be undone.
  - Collaborators' feedback and the agent's own interpretation are reported apart.
  - For a paper under double-blind review, files, frame names and public repositories carry nothing that identifies the authors or the paper.

## 6. Defaults

The values that implement the principles. The kit and the checks use them; a paper may change them with a stated reason.

### Sizes (principle 20)

Sizes are shares of the figure width W. The printed size is pt = px × 396 / W, where 396 pt is the 5.5 in text width of ICLR and NeurIPS. A figure placed below full width uses W ÷ `placement` instead of W. `kit.sizes(kind, W)` computes them.

**Diagrams (reference width 1498 px)**

| Role | px | Share of width | Print |
|---|---|---|---|
| Panel caption, level-1 element, model block of a two-panel figure | 32 | 2.14% | 8.5 pt |
| Group title | 30 | 2.00% | 7.9 pt |
| Level-2 module name, column header of a table-like figure | 28 | 1.87% | 7.4 pt |
| Lane and row label, legend | 26 | 1.74% | 6.9 pt |
| Level-3 label, short note, prompt chip | 22 | 1.47% | 5.8 pt |
| Data text (monospaced) | 20 | 1.34% | 5.3 pt |

**Charts (reference width 1248 px, four or five panels per row)**

| Role | px | Share of width | Print |
|---|---|---|---|
| Group title | 22 | 1.76% | 7.0 pt |
| Panel title, radar axis name | 21 | 1.68% | 6.7 pt |
| Axis title, legend | 19 | 1.52% | 6.0 pt |
| Tick label | 18 | 1.44% | 5.7 pt |

**Floor:** text that must be read is at least 1.2% of the width (about 4.8 pt); secondary legends may go down to 1.05%.

**Chart panels:** plot areas are 160 to 260 px wide and 180 px tall at the reference width.

### Label words (principle 4)

`kit.place(root, { type })` records the figure kind, and `lint` counts label words against these budgets. Quoted examples and data in the monospaced face do not count.

| Kind | Label word budget |
|---|---|
| Teaser | 25 |
| Method overview | 40 |
| Method detail | 50 |
| Qualitative example | 30 |
| Diagram of no stated kind | 40 |

A single label is at most four words.

### Lines and symbols (reference width 1498 px)

| Element | Value |
|---|---|
| Dashed flow track | 2.8 px, dash 5/8, arrowhead (length 10, width 12) |
| Solid arrow | 2.4 px, head 12 |
| Blocked link | gray dashed 2.4 px ending in a red ✕ |
| Outline of an optional input or fallback path | dashed, dash 7/5 |
| Vertical divider between panels / horizontal divider between examples | 2.6 px dash 6/9 / 2 px dash 6/9 |
| Module outline, chip outline | 1.6 px, 1.3 px |
| Noisy latent hatch | 5 px stripes, 14 px pitch, 45° |
| Latent cell | 56 px (two panels), 40 px (three panels), radius 4 |
| Icon | 44 px, level-3 gray strokes |
| Chart line, marker | 2.5 px, radius 4.5 with a 1.4 px white ring |
| Grid, axis, tick mark | 1.2 px `#E6E6E6`, 1.5 px `#CFCFCF`, 7 px inside the axis |
| Trained and frozen badges | flame and snowflake vector icons, 28 px, on the module's drawn top-right corner; rarer side only |

### Colour (principles 8 and 9)

| Role | Value |
|---|---|
| Proposed method (accent) | teal `#197A8A` (light `#8FC4CE`, lane `#EBF4F6`) |
| Second method or modality | sand `#A98548` (light `#D9BD8A`) |
| Compared methods, context | grays `#4B5563`, `#6B7280`, `#9AA2AD`, `#C3C8CF`, `#DDE1E6` |
| Locations, blocked links | red `#E5484D`, blue `#2F6FEB` |
| Text | `#374151`, secondary `#4B5563`, titles `#111111` |

- All figures of one paper share one palette. `check` records method colours in `work/<paper>/palette.json`, and `verify` compares diagram colour declarations (`kit.diagram.meaning`) with it. Sand means only the first method or meaning that takes it. Grays go from dark to light in list order within a figure.
- A paper may rule colours out (one paper excluded orange, purple and green).
- No transparency.

### Fonts and wording (principles 5 and 21)

- **Faces:** Google Sans Flex for labels, Google Sans Code for data text, Roboto for arrow glyphs. Never Inter as a fallback.
- **Weights:** Medium or heavier by default; Regular only for level-3 labels. Dark slate instead of pure black.
- **Captions and titles:** noun phrases. No partial accent colour inside caption text. No middle dots as separators.

### Chart style (principles 10 and 18)

- **Lines and ticks:** a solid line with round markers per method; ticks are short marks rising from the x axis; no vertical grid.
- **Y range:** fitted to the data (2.5% headroom) without crowding tick labels; bar charts start at zero.
- **Metrics with very different ranges:** a broken axis or a log axis, never both in one panel; a log axis is named in the caption.
- **Tick labels:** decimals follow the tick step.
- **Bar value labels:** when two would touch, every second one moves up a line.
- **Radar:** each axis is the ratio to its best method, lower-is-better axes inverted, origin at zero; axis names, legend, lines and markers use the chart roles.

### Automatic layout (principles 13, 18 and 19)

- **Charts:** `kit/layout.js` fills in what a spec leaves out.
  - It computes every arrangement from one row up and picks the one with the fewest rows that fits a format. A one-column figure is placed at 0.75 of the text width or less, and an aspect within 5% of a range still fits.
  - Plot areas aim at about 230 px wide; line panels may narrow to 160 px; bar panels never narrow below the room their value labels need.
  - At most five columns and three rows. Only when nothing fits do plots grow up to 40% taller; when that fails too, a warning says to split the figure.
  - An empty cell takes the legend, matched to the height of its neighbours; without one, the legend goes under the panels and wraps when wider than the figure. Bar charts get square legend swatches.
  - Outer columns are trimmed to their ink, about 2 px from the edge, and the placement is recomputed from the drawn width and stored on the frame.
- **Diagram scripts:** a script throws when the figure grows past its declared width (`FW`) or its format. `kit.place(root, { declaredWidth: FW, type })` returns the LaTeX width that keeps the print size and stores the width, kind and colour declarations on the frame, and `lint` and `verify` judge the figure by them.
