# Figure spec

Data figures (charts and radars) are written as JSON and drawn by the kit. Method diagrams and teasers are scripts
(see [kit-api.md](kit-api.md)). Leave the layout out and the kit chooses it ([figure-principles.md](figure-principles.md), principles 13 and 18, and the defaults in section 6); set a field only to override.

## Values and their sources

Every number carries its source in the paper. `bun src/cli.mjs check` compares it with the printed value at the printed
precision and refuses unsourced, different or weakly sourced values.

| Source | Meaning |
|---|---|
| `"T1[Full tokens][Pick cup]"` | Table T1, the row whose cells include "Full tokens", the column "Pick cup" |
| `"T2[Anchor Tokens (ours) \| Loss][80k]"` | When row labels repeat, name several cells of the row joined with `\|` |
| `"T1[Full tokens][1]"`, `{ "table": "T1", "row": 0, "col": 3 }` | Row or column by 0-based index (a bare number that names no row or column) |
| `{ "quote": "runs at 23 ms per step" }` | A clause of the paper that contains the value and says what it measures. A quote of numbers alone (`"30"`, `"25.3 24.8"`) also matches axis ticks and stray labels, so it is reported as `weak` and fails the check |
| `{ "file": "work/p/log.csv", "note": "training log" }` | Data outside the paper: reported as external |

Table ids come from `bun src/cli.mjs prepare`: `T<n>` from the caption "Table n", otherwise by order. Tables parsed from
plain text (a PDF extraction) are marked low confidence; check those rows against the PDF. Their column names are taken
from the last header line when it has a name for every number column (`columnsGuessed`); arrows such as ↑↓ are usually
lost in PDF text. A row label may include the text of a multirow cell of the next column; the row is still found by the
start of its label.

Points are `[x, y, source]`, bar values and radar values are `[value, source]`.

## chart-grid

```json
{
  "version": 1,
  "kind": "chart-grid",
  "name": "Figure 3 / training curves",
  "methods": [
    { "id": "ours", "label": "Anchor Tokens (ours)", "ours": true },
    { "id": "full", "label": "Full tokens" },
    { "id": "random", "label": "Random pruning" }
  ],
  "x": { "title": "Training steps (thousands)", "ticks": [10, 20, 40, 80] },
  "groups": [
    { "title": "Training progress", "panels": [
      { "title": "Mean success rate (%)", "better": "higher",
        "series": { "ours": [[10, 31.5, "T2[Anchor Tokens (ours) | Success][10k]"]], "full": [], "random": [] } }
    ] }
  ],
  "legend": { "title": "optional" }
}
```

| Field | Default (auto layout) | Notes |
|---|---|---|
| `methods[].color` | from the paper's palette (below) | ours keeps the accent `#197A8A`; a baseline may not use it |
| `width`, `placement` | from the panels and the formats | `placement` is the share of `\linewidth` in the paper; sizes follow print size |
| `groups[].columns` | fewest rows (at most three) with at most five columns whose shape fits a paper format | 1..5 |
| `legend.placement` | `cell` if a one-column group has an empty cell, else `bottom` | `none` for a single method; bar charts get square swatches |
| `panelHeight` | 180, up to 40 % taller when no arrangement fits a format otherwise | |
| `x` | required with line panels | bar panels label their own categories; a single unnamed category `[""]` draws no category row |
| panel `better` | required | `higher` or `lower`; the title shows ↑ or ↓ |
| panel `tight` | off | 2.5 % margin and five ticks, for a zoomed y axis |
| panel `log` | off | `{ "lo": 10, "hi": 140, "ticks": [10, 20, 50, 100] }`; say so in the caption |
| panel `breakAbove`, `bandTicks` | off | broken axis: values above the break go to a 50 px band |
| panel `range` | automatic | `[lo, hi, step]` when the automatic step prints awkward labels |
| panel `type: "bar"` | line | `categories` and `series: [{ "method": id, "values": [[v, source], ...] }]`; axis from zero; values printed as in the paper |
| panel `status: "todo"` | | a panel waiting for data: reported, not drawn |

### Colours across the figures of a paper

`check` keeps `work/<paper>/palette.json`, the record of which method each saturated colour stands for (principle 8):

- the accent means ours, in every figure and for every variant of ours;
- sand goes to the first method that takes it and then means that method in every figure; no other method gets it;
- grays are context: inside a figure they go from dark to light in the order the methods are listed, and they may
  stand for different methods in different figures.

A spec may set a colour; `check` warns when it gives one method two colours or one saturated colour two methods.
Bars in each category and the legend follow the same order: ours first, then the order of `methods`.

## radar

```json
{
  "version": 1,
  "kind": "radar",
  "name": "Figure 1c / summary",
  "methods": [ { "id": "ours", "label": "Ours", "ours": true }, { "id": "b", "label": "Baseline" } ],
  "axes": [
    { "label": "Success", "better": "higher", "values": { "ours": [71.4, "T1[Anchor Tokens (ours)][Mean]"], "b": [64.9, "T1[Full tokens][Mean]"] } },
    { "label": "Latency", "better": "lower", "values": { "ours": [23, "T3[Anchor Tokens (ours)][Latency (ms)]"], "b": [61, "T3[Full tokens][Latency (ms)]"] } }
  ],
  "legend": { "title": "Token strategy" }
}
```

Each axis is divided by its best method (inverted for lower-is-better axes); the best method sits on the rim and the
origin is zero. Keep the axes where ours is not the best, and state the normalisation in the caption. The legend box
goes to the bottom corner that clears every label and the rim.
