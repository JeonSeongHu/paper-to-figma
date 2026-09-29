// Entry point of the figure kit. Bundled into the Figma plugin, and into kit/dist/kit.js for script mode.
import * as spec from "./spec.js";
import * as math from "./math.js";
import { createCore } from "./core.js";
import { createCharts } from "./charts.js";
import { createDiagram } from "./diagram.js";

export function createKit(figma) {
  const core = createCore(figma);
  const charts = createCharts(core);
  const diagram = createDiagram(core);

  // Build a figure from a JSON spec (docs/figure-spec.md). Only data-driven kinds live here; free-form diagrams are
  // scripts that call the kit directly.
  function renderSpec(s) {
    const root = build(s);
    // the drawn width can differ a little from the spec width (trimmed margins): the placement keeps the print scale
    const placement = s.placement && s.width ? Math.round(((s.placement * root.width) / s.width) * 100) / 100 : s.placement || 1;
    root.setSharedPluginData("p2f", "meta", JSON.stringify({ kind: s.kind === "radar" ? "radar" : "chart", placement }));
    return root;
  }
  function build(s) {
    if (s.version !== 1) throw new Error("figure spec version must be 1");
    if (s.kind === "chart-grid") return charts.chartFigure(s);
    if (s.kind === "radar") {
      const W = s.width || 700,
        H = s.height || 620;
      // a radar figure is a chart: sizes follow the chart roles at its sizing width (width / placement, chart units)
      const chartWidth = W / (s.placement || 1),
        diagramWidth = s.figureWidth || (chartWidth * spec.REF_WIDTH.diagram) / spec.REF_WIDTH.chart;
      const root = core.AL(s.name, "VERTICAL", { fill: "#FFFFFF", pad: 1, gap: 12, cross: "CENTER" });
      const r = charts.radar({ axes: s.axes, methods: s.methods, W, H, legendTitle: s.legend?.title, legendMode: s.legend?.placement || "corner", chartWidth, figureWidth: diagramWidth });
      root.appendChild(r.node);
      if (s.caption) root.appendChild(diagram.caption(s.caption, { ours: true, figureWidth: diagramWidth }));
      return root;
    }
    throw new Error(`unknown figure kind: ${s.kind}`);
  }

  return { spec, math, ...core, charts, diagram, renderSpec };
}

globalThis.createPaperKit = createKit;
