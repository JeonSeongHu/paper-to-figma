// Charts drawn as native Figma vectors and text: line panels (linear, log or broken axis), grouped bars, a radar, and
// a grid of panel groups with one legend. Ported from reviewed figures (2026-09).
import * as S from "./spec.js";
import { niceTicks, fixedTicks, tickLabel, radarRatios, highestClearY } from "./math.js";

export function createCharts(core) {
  const { AL, add, box, T, svg, rect, absolute, sizes, strokes } = core;

  // Chart geometry at the chart reference width (1248); everything scales with the figure width.
  const geom = (k) => ({ ML: 46 * k, MR: 10 * k, MT: 34 * k, MB: 54 * k, MB1: 30 * k, GAP: 10 * k, GG: 23 * k, BAND: 50 * k, BGAP: 22 * k });

  const pointsOf = (arr) =>
    arr
      .map((p) => (Array.isArray(p) ? { x: +p[0], y: +p[1] } : { x: +p.x, y: +p.y }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .sort((a, b) => a.x - b.x);

  function marker(color, x, y, st) {
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${st.marker}" fill="${color}" stroke="#FFFFFF" stroke-width="${st.markerRing}"/>`;
  }

  // One line panel. series: [{ id, color, ours, points: [[x, y], ...] }]
  // opts: width (figure width, for scaling), pw, ph, xTicks, xTitle, noXTitle, tight, log {lo, hi, ticks}, breakAbove,
  // bandTicks, range [lo, hi, step], clip, better ("higher" | "lower")
  function linePanel(title, series, opts = {}) {
    const W = opts.width || S.REF_WIDTH.chart,
      k = W / S.REF_WIDTH.chart,
      Z = sizes("chart", W),
      st = strokes("chart", W),
      G = geom(k);
    const pw = opts.pw || 238 * k,
      ph = opts.ph || 180 * k,
      { ML, MR, MT } = G;
    const MB = opts.noXTitle ? G.MB1 : G.MB;
    const f = box(title, ML + pw + MR, MT + ph + MB);
    const XT = opts.xTicks,
      t0 = XT[0],
      t1 = XT[XT.length - 1];
    const X = (t) => ML + ((t - t0) / (t1 - t0)) * pw;
    const brk = opts.breakAbove,
      clip = opts.clip;
    const mainTop = brk != null ? MT + G.BAND + G.BGAP : MT,
      mainH = MT + ph - mainTop;
    const inMain = (v) => (brk == null || v <= brk) && (clip == null || v <= clip);
    const vals = [],
      outl = [];
    for (const s of series) for (const p of s.points) (inMain(p.y) ? vals : outl).push(p.y);
    if (!vals.length) throw new Error(`panel "${title}" has no data in the main range`);
    let ny;
    if (opts.range) ny = fixedTicks(...opts.range);
    else {
      const mn = Math.min(...vals),
        mx = Math.max(...vals),
        pv = (mx - mn) * (opts.tight ? 0.025 : 0.1) || 1;
      ny = niceTicks(mn - pv, mx + pv, opts.tight ? 5 : 4);
    }
    let Y = (v) => mainTop + mainH - ((v - ny.lo) / (ny.hi - ny.lo)) * mainH;
    let yTicks = ny.ticks.map((t) => [t, tickLabel(t, ny.step)]);
    if (opts.log) {
      const L = Math.log,
        { lo, hi, ticks } = opts.log;
      Y = (v) => mainTop + mainH - ((L(v) - L(lo)) / (L(hi) - L(lo))) * mainH;
      yTicks = ticks.map((t) => [t, String(t)]);
    }
    if (brk != null) yTicks = yTicks.filter(([t]) => t <= brk + 1e-9);
    let YB = null,
      bTicks = [];
    if (outl.length && brk != null) {
      const bmn = Math.min(...outl),
        bmx = Math.max(...outl),
        pad = (bmx - bmn) * 0.06 + 1e-9;
      const bLo = bmn - pad,
        bHi = bmx + pad;
      YB = (v) => MT + G.BAND - ((v - bLo) / (bHi - bLo)) * G.BAND;
      bTicks = opts.bandTicks || [...new Set([Math.round(bmn / 10) * 10, Math.round(bmx / 10) * 10])];
    }
    let d = "";
    for (const [t] of yTicks) d += `<path d="M${ML} ${Y(t).toFixed(2)} H${ML + pw}" stroke="${S.NEUTRAL.grid}" stroke-width="${st.grid}"/>`;
    for (const t of bTicks) d += `<path d="M${ML} ${YB(t).toFixed(2)} H${ML + pw}" stroke="${S.NEUTRAL.grid}" stroke-width="${st.grid}"/>`;
    d += `<path d="M${ML} ${MT} V${MT + ph}" stroke="${S.NEUTRAL.axis}" stroke-width="${st.axis}"/>`;
    let lines = "",
      marks = "";
    const ordered = [...series.filter((s) => !s.ours), ...series.filter((s) => s.ours)]; // ours on top
    for (const s of ordered) {
      let path = "";
      for (let i = 0; i < s.points.length - 1; i++) {
        const a = s.points[i],
          b = s.points[i + 1],
          ma = inMain(a.y),
          mb = inMain(b.y);
        if (ma && mb) path += `M${X(a.x).toFixed(2)} ${Y(a.y).toFixed(2)} L${X(b.x).toFixed(2)} ${Y(b.y).toFixed(2)} `;
        else if (!ma && !mb) {
          if (brk != null) path += `M${X(a.x).toFixed(2)} ${YB(a.y).toFixed(2)} L${X(b.x).toFixed(2)} ${YB(b.y).toFixed(2)} `;
        } else {
          const [hi, lo] = ma ? [b, a] : [a, b];
          if (clip != null) {
            const at = X(hi.x) + ((hi.y - clip) / (hi.y - lo.y)) * (X(lo.x) - X(hi.x));
            path += `M${at.toFixed(2)} ${Y(clip).toFixed(2)} L${X(lo.x).toFixed(2)} ${Y(lo.y).toFixed(2)} `;
          } else path += `M${X(hi.x).toFixed(2)} ${YB(hi.y).toFixed(2)} L${X(lo.x).toFixed(2)} ${Y(lo.y).toFixed(2)} `;
        }
      }
      if (path) lines += `<path d="${path}" stroke="${s.color}" stroke-width="${st.line}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      for (const p of s.points) {
        if (!inMain(p.y) && clip != null) continue;
        marks += marker(s.color, X(p.x), inMain(p.y) ? Y(p.y) : YB(p.y), st);
      }
    }
    d += lines;
    if (brk != null) {
      // axis break: a white wavy band cuts the axis and every line at one place, drawn with two thin gray waves
      const yc = MT + G.BAND + G.BGAP / 2,
        x0 = ML - 7 * k,
        x1 = ML + pw + 3 * k,
        wl = 7 * k,
        amp = 2 * k;
      const wave = (y) => {
        let p = `M${x0.toFixed(2)} ${y.toFixed(2)}`;
        for (let x = x0; x < x1 - 1e-6; x += wl) p += ` q${(wl / 4).toFixed(2)} ${(-amp).toFixed(2)} ${(wl / 2).toFixed(2)} 0 t${(wl / 2).toFixed(2)} 0`;
        return p;
      };
      d += `<path d="${wave(yc)}" stroke="#FFFFFF" stroke-width="${7 * k}" fill="none"/>`;
      for (const dy of [-3.5 * k, 3.5 * k]) d += `<path d="${wave(yc + dy)}" stroke="#9CA3AF" stroke-width="${1.1 * k}" fill="none"/>`;
    }
    d += marks;
    d += `<path d="M${ML} ${MT + ph} H${ML + pw}" stroke="${S.NEUTRAL.axis}" stroke-width="${st.axis}"/>`;
    for (const t of XT) d += `<path d="M${X(t).toFixed(2)} ${MT + ph} V${MT + ph - st.tickMark}" stroke="${S.NEUTRAL.axis}" stroke-width="${st.axis}" stroke-linecap="round"/>`;
    const Wd = ML + pw + MR,
      Hd = MT + ph + 4 * k;
    const plot = svg(`<svg width="${Wd.toFixed(2)}" height="${Hd.toFixed(2)}" viewBox="0 0 ${Wd.toFixed(2)} ${Hd.toFixed(2)}" fill="none">${d}</svg>`, "plot");
    f.appendChild(plot);
    plot.x = 0;
    plot.y = 0;
    const put = (str, size, color, x, y, anchor, style) => {
      const t = T(str, size, { color, style });
      f.appendChild(t);
      t.x = anchor === "right" ? x - t.width : anchor === "center" ? x - t.width / 2 : x;
      t.y = y - t.height / 2;
      return t;
    };
    const arrowGlyph = opts.better === "lower" ? " ↓" : opts.better === "higher" ? " ↑" : "";
    put(title + arrowGlyph, Z.title, S.NEUTRAL.title, ML + pw / 2, 14 * k, "center", "Medium");
    for (const [t, lab] of yTicks) put(lab, Z.tick, S.NEUTRAL.tick, ML - 7 * k, Y(t), "right");
    for (const t of bTicks) put(String(t), Z.tick, S.NEUTRAL.tick, ML - 7 * k, YB(t), "right");
    for (const t of XT) put(String(t), Z.tick, S.NEUTRAL.tick, X(t), MT + ph + 15 * k, "center");
    if (!opts.noXTitle && opts.xTitle) put(opts.xTitle, Z.axis, S.NEUTRAL.axisTitle, ML + pw / 2, MT + ph + 40 * k, "center");
    return f;
  }

  // Grouped bars with the value on each bar. The y axis starts at zero (a bar's length is its value).
  // cats: category labels; series: [{ id, color, ours, values: [...] }]
  function barPanel(title, cats, series, opts = {}) {
    const W = opts.width || S.REF_WIDTH.chart,
      k = W / S.REF_WIDTH.chart,
      Z = sizes("chart", W),
      st = strokes("chart", W),
      G = geom(k);
    // a panel with one unnamed category (one bar per method) has no category row under the axis
    const named = cats.some((c) => String(c).trim()),
      xTitle = opts.noXTitle ? null : opts.xTitle;
    const pw = opts.pw || 238 * k,
      ph = opts.ph || 180 * k,
      { ML, MR, MT } = G,
      MB = (named ? G.MB1 : 12 * k) + (xTitle ? 26 * k : 0);
    const f = box(title, ML + pw + MR, MT + ph + MB);
    const all = series.flatMap((s) => s.values).filter(Number.isFinite);
    const ny = opts.range ? fixedTicks(...opts.range) : niceTicks(0, Math.max(...all) * 1.12, 4);
    const Y = (v) => MT + ph - ((v - ny.lo) / (ny.hi - ny.lo)) * ph;
    const slot = pw / cats.length,
      inner = slot * 0.78,
      bw = inner / series.length;
    let d = "";
    for (const t of ny.ticks) d += `<path d="M${ML} ${Y(t).toFixed(2)} H${ML + pw}" stroke="${S.NEUTRAL.grid}" stroke-width="${st.grid}"/>`;
    const labels = [];
    cats.forEach((c, ci) => {
      series.forEach((s, si) => {
        const v = s.values[ci];
        if (!Number.isFinite(v)) return;
        const x = ML + ci * slot + (slot - inner) / 2 + si * bw;
        d += `<rect x="${(x + 1).toFixed(2)}" y="${Y(v).toFixed(2)}" width="${(bw - 2).toFixed(2)}" height="${(Y(ny.lo) - Y(v)).toFixed(2)}" fill="${s.color}"/>`;
        labels.push([s.labels?.[ci] ?? (opts.format ? opts.format(v) : String(v)), x + bw / 2, Y(v) - 10 * k]);
      });
    });
    d += `<path d="M${ML} ${MT} V${MT + ph}" stroke="${S.NEUTRAL.axis}" stroke-width="${st.axis}"/><path d="M${ML} ${MT + ph} H${ML + pw}" stroke="${S.NEUTRAL.axis}" stroke-width="${st.axis}"/>`;
    const plot = svg(`<svg width="${(ML + pw + MR).toFixed(2)}" height="${(MT + ph + 2).toFixed(2)}" viewBox="0 0 ${(ML + pw + MR).toFixed(2)} ${(MT + ph + 2).toFixed(2)}" fill="none">${d}</svg>`, "plot");
    f.appendChild(plot);
    const put = (str, size, color, x, y, anchor, style) => {
      const t = T(str, size, { color, style });
      f.appendChild(t);
      t.x = anchor === "right" ? x - t.width : anchor === "center" ? x - t.width / 2 : x;
      t.y = y - t.height / 2;
      return t;
    };
    const arrowGlyph = opts.better === "lower" ? " ↓" : opts.better === "higher" ? " ↑" : "";
    put(title + arrowGlyph, Z.title, S.NEUTRAL.title, ML + pw / 2, 14 * k, "center", "Medium");
    for (const t of ny.ticks) put(tickLabel(t, ny.step), Z.tick, S.NEUTRAL.tick, ML - 7 * k, Y(t), "right");
    // value labels: never below the reading floor
    const vSize = Math.max(S.floorPx(W), Z.tick * 0.85);
    // value labels never shrink; when two neighbours would touch, every second label moves up one line
    const placed = labels.map(([s, x, y]) => put(s, vSize, S.NEUTRAL.ink, x, y, "center")).sort((a, b) => a.x - b.x);
    const touch = placed.some((t, i) => i && placed[i - 1].x + placed[i - 1].width + 3 * k > t.x);
    if (touch) placed.forEach((t, i) => i % 2 && (t.y -= t.height * 0.95));
    if (named) cats.forEach((c, ci) => put(c, Z.tick, S.NEUTRAL.tick, ML + ci * slot + slot / 2, MT + ph + 15 * k, "center"));
    if (xTitle) put(xTitle, Z.axis, S.NEUTRAL.axisTitle, ML + pw / 2, MT + ph + (named ? 42 : 24) * k, "center");
    return f;
  }

  // Legend. mode "row" (one line), "column" (one method per line). boxed adds a white box with a gray outline.
  // symbol "line" (a line with a marker) or "bar" (a filled square): the sample looks like the marks it explains.
  function legend(methods, { width = S.REF_WIDTH.chart, kind = "chart", mode = "row", boxed = true, title, size, symbol = "line" } = {}) {
    const k = width / S.REF_WIDTH[kind],
      st = strokes("chart", kind === "chart" ? width : (width * S.REF_WIDTH.chart) / S.REF_WIDTH.diagram);
    const fs = size || S.textSize(kind, "legend", width);
    const col = mode === "column";
    const box_ = AL(
      "legend",
      col ? "VERTICAL" : "HORIZONTAL",
      boxed
        ? { gap: col ? 12 * k : 16 * k, pad: col ? [12 * k, 14 * k, 13 * k, 14 * k] : [7 * k, 12 * k, 7 * k, 12 * k], fill: "#FFFFFF", stroke: S.NEUTRAL.rule, sw: st.legendBox, r: S.RADIUS.legend * k, cross: col ? "MIN" : "CENTER" }
        : { gap: col ? 8 * k : 16 * k, cross: col ? "MIN" : "CENTER" },
    );
    if (title) box_.appendChild(T(title, fs, { color: S.NEUTRAL.title, style: "SemiBold" }));
    const L = 30 * k,
      H = 16 * k;
    for (const m of methods) {
      const sample =
        symbol === "bar"
          ? rect(H, H, m.color, 2 * k, "sample")
          : svg(
              `<svg width="${L.toFixed(2)}" height="${H.toFixed(2)}" viewBox="0 0 ${L.toFixed(2)} ${H.toFixed(2)}" fill="none"><path d="M${(2 * k).toFixed(2)} ${(H / 2).toFixed(2)} H${(L - 2 * k).toFixed(2)}" stroke="${m.color}" stroke-width="${st.legendLine}" stroke-linecap="round"/>${marker(m.color, L / 2, H / 2, { marker: st.marker * 0.9, markerRing: st.markerRing })}</svg>`,
              "sample",
            );
      box_.appendChild(add(AL("item", "HORIZONTAL", { gap: 7 * k }), sample, T(m.label, fs, { color: "#222222" })));
    }
    return box_;
  }

  // A titled group of panels: title, a gray rule over the plot areas, then rows of panels.
  // trimLeft / trimRight: how much the outer panels of the figure were cut to their ink (the rule stays over the plots)
  function group(title, rows, { width, rowGap, colGap, cellW, trimLeft = 0, trimRight = 0 }) {
    const k = width / S.REF_WIDTH.chart,
      G = geom(k),
      Z = sizes("chart", width);
    const g = AL(title, "VERTICAL", { gap: 10 * k, cross: "MIN" });
    const head = AL("header", "VERTICAL", { w: cellW, pad: [0, G.MR - trimRight, 0, G.ML - trimLeft], gap: 6 * k, cross: "CENTER" });
    // a title wider than its panels wraps onto more lines; it never leaves the figure and never shrinks
    const inner = cellW - G.ML - G.MR + trimLeft + trimRight;
    let t = T(title, Z.group, { color: S.NEUTRAL.title, style: "SemiBold" });
    if (t.width > cellW) {
      t.remove();
      t = T(title, Z.group, { color: S.NEUTRAL.title, style: "SemiBold", w: Math.max(inner, cellW - 4 * k) });
    }
    add(head, t, rect(inner, 1.5 * k, S.NEUTRAL.rule, 0, "rule"));
    const body = AL("panels", "VERTICAL", { gap: rowGap, cross: "MIN" });
    for (const r of rows) body.appendChild(add(AL("row", "HORIZONTAL", { gap: colGap, cross: "MIN" }), ...r));
    return add(g, head, body);
  }

  // A chart figure from a spec (see docs/figure-spec.md). Returns the root frame, not yet placed on a page.
  function chartFigure(spec) {
    // placement: the share of \linewidth the figure takes in the paper. Sizes follow the printed size, so a figure
    // placed at half width gets the text of a full-width figure twice as wide (SW is that "sizing width").
    const W = spec.width || S.REF_WIDTH.chart,
      SW = W / (spec.placement || 1),
      k = SW / S.REF_WIDTH.chart,
      G = geom(k);
    const methods = spec.methods.map((m, i) => ({ ...m, color: m.color || S.SERIES[i] || S.NEUTRAL.muted }));
    const byId = Object.fromEntries(methods.map((m) => [m.id, m]));
    const groups = spec.groups;
    const rowsOf = (g) => Math.ceil(g.panels.length / (g.columns || 1));
    const nRows = Math.max(...groups.map(rowsOf));
    const legendSpec = spec.legend || { placement: "bottom" };
    const legendMethods = [...methods].sort((a, b) => (b.ours ? 1 : 0) - (a.ours ? 1 : 0));
    const symbol = groups.every((g) => g.panels.every((p) => p.type === "bar")) ? "bar" : "line";
    // the boxed legend may take an empty cell of a one-column group (left inset 20 px, centred on the plot area)
    let lg = null,
      legendGroup = -1;
    if (legendSpec.placement === "cell") {
      legendGroup = groups.findIndex((g) => (g.columns || 1) === 1 && g.panels.length < nRows);
      lg = legend(legendMethods, { width: SW, mode: "column", boxed: true, title: legendSpec.title, symbol });
    }
    const colsOf = (g) => g.columns || 1;
    const totalCols = groups.reduce((a, g) => a + colsOf(g), 0);
    const fixedW = 2 + (groups.length - 1) * G.GG + groups.reduce((a, g) => a + colsOf(g) * (G.ML + G.MR) + (colsOf(g) - 1) * G.GAP, 0);
    let pw = Math.floor((W - fixedW) / totalCols),
      pwL = pw;
    const INSET = 20 * k;
    if (lg && legendGroup >= 0) {
      pwL = Math.max(pw, Math.ceil(INSET + lg.width - G.ML));
      pw = Math.floor((W - fixedW - pwL) / (totalCols - 1));
    }
    const ph = (spec.panelHeight || 180) * k;
    const xTicks = spec.x?.ticks;
    const panelRows = groups.map((g, gi) => {
      const cols = colsOf(g),
        gpw = gi === legendGroup ? pwL : pw,
        rows = [];
      g.panels.forEach((p, pi) => {
        const r = Math.floor(pi / cols);
        // the x title goes only under the lowest panel of each column (or not at all above a legend cell)
        const opts = { width: SW, pw: gpw, ph, xTicks: p.xTicks || xTicks, xTitle: p.xTitle ?? spec.x?.title, noXTitle: pi + cols < g.panels.length || gi === legendGroup, better: p.better, tight: p.tight, log: p.log, breakAbove: p.breakAbove, bandTicks: p.bandTicks, range: p.range, clip: p.clip };
        let panel;
        // bars in each category follow the legend order (ours first), whatever order the spec lists them in
        const order = (s) => legendMethods.findIndex((m) => m.id === s.method);
        if (p.type === "bar") panel = barPanel(p.title, p.categories, [...p.series].sort((a, b) => order(a) - order(b)).map((s) => ({ ...byId[s.method], values: s.values.map((v) => (v && typeof v === "object" ? v.value : v)), labels: s.values.map((v) => (v && typeof v === "object" && v.label ? v.label : null)) })), opts);
        else
          panel = linePanel(
            p.title,
            Object.entries(p.series).map(([id, pts]) => {
              if (!byId[id]) throw new Error(`panel "${p.title}": unknown method ${id}`);
              return { ...byId[id], points: pointsOf(pts) };
            }),
            opts,
          );
        (rows[r] ||= []).push(panel);
      });
      return rows;
    });
    // the legend cell is as tall as the panels beside it, so it adds no empty band under the figure
    if (legendGroup >= 0) {
      const ri = panelRows[legendGroup].length;
      const beside = panelRows.flatMap((rows, gi) => (gi === legendGroup ? [] : rows[ri] || [])).map((p) => p.height);
      const h = Math.max(G.MT + lg.height, beside.length ? Math.max(...beside) : G.MT + ph + G.MB1);
      const cell = AL("legend cell", "HORIZONTAL", { w: G.ML + pwL + G.MR, h, pad: [G.MT, 0, 0, INSET], main: "MIN" });
      cell.appendChild(lg);
      panelRows[legendGroup].push([cell]);
    }
    // the outer columns end at their ink (the widest tick label on the left, the plot on the right), so the figure has
    // edge margins of a few px instead of the fixed axis margins
    const EDGE = 2 * k,
      last = groups.length - 1,
      isCell = (p) => p.name === "legend cell";
    const leftCol = panelRows[0].map((r) => r[0]);
    const rightCol = panelRows[last].filter((r) => r.length === colsOf(groups[last]) || isCell(r[0])).map((r) => r[r.length - 1]);
    // a panel holds text nodes and SVG frames as wide as the panel; the ink of an SVG frame is its vectors
    const parts = (p) => p.children.flatMap((c) => (c.type === "FRAME" && "children" in c ? c.children.map((v) => ({ x: c.x + v.x, w: v.width })) : [{ x: c.x, w: c.width }]));
    const inkL = (p) => (isCell(p) ? p.paddingLeft : Math.min(...parts(p).map((q) => q.x)));
    const inkR = (p) => (isCell(p) ? G.MR : p.width - Math.max(...parts(p).map((q) => q.x + q.w)));
    const trimL = Math.max(0, Math.floor(Math.min(...leftCol.map(inkL)) - EDGE));
    const trimR = Math.max(0, Math.floor(Math.min(...rightCol.map(inkR)) - EDGE));
    for (const p of leftCol) {
      if (isCell(p)) p.paddingLeft -= trimL;
      else
        for (const c of p.children) {
          if (c.type === "FRAME" && "children" in c) {
            for (const v of c.children) v.x -= trimL;
            c.resizeWithoutConstraints(c.width - trimL, c.height); // resize() would scale the vectors
          } else c.x -= trimL;
        }
      p.resizeWithoutConstraints(p.width - trimL, p.height);
    }
    for (const p of rightCol) {
      const w = p.width - trimR;
      if (!isCell(p)) for (const c of p.children) if (c.type === "FRAME" && c.x + c.width > w) c.resizeWithoutConstraints(w - c.x, c.height);
      p.resizeWithoutConstraints(w, p.height);
    }
    const built = groups.map((g, gi) => {
      const cols = colsOf(g),
        gpw = gi === legendGroup ? pwL : pw,
        tl = gi === 0 ? trimL : 0,
        tr = gi === last ? trimR : 0;
      return group(g.title, panelRows[gi], { width: SW, rowGap: 18 * k, colGap: G.GAP, cellW: cols * (G.ML + gpw + G.MR) + (cols - 1) * G.GAP - tl - tr, trimLeft: tl, trimRight: tr });
    });
    const root = AL(spec.name, "VERTICAL", { fill: "#FFFFFF", pad: 1, gap: 16 * k, cross: "CENTER" });
    const row = AL("groups", "HORIZONTAL", { gap: G.GG, cross: "MIN" });
    for (const b of built) row.appendChild(b);
    root.appendChild(row);
    // absorb rounding in the gaps between groups so the figure is exactly W wide (less the trimmed margins)
    if (groups.length > 1) row.itemSpacing = Math.max(12 * k, G.GG + (W - trimL - trimR - 2 - row.width) / (groups.length - 1));
    if (legendSpec.placement === "bottom") {
      const lg2 = legend(legendMethods, { width: SW, mode: "row", boxed: true, title: legendSpec.title, symbol });
      root.appendChild(lg2);
      // a legend wider than the panels wraps onto a second line instead of widening the figure
      if (lg2.width > row.width) {
        lg2.layoutWrap = "WRAP";
        lg2.primaryAxisSizingMode = "FIXED";
        lg2.counterAxisSpacing = 6 * k;
        lg2.resize(row.width, lg2.height);
        lg2.counterAxisSizingMode = "AUTO";
      }
    }
    return root;
  }

  // Radar of several methods over axes with different units. Each axis is scaled by its best method (see radarRatios).
  // axes: [{ label, better: "higher" | "lower", values: { methodId: number } }]
  // Returns a frame of width W and at most height H with the radar, its labels and (optionally) a boxed legend placed in
  // the bottom corner where it overlaps the radar area but touches no label and no ring.
  // A radar is a chart: its labels, lines and markers follow the chart roles at the chart sizing width (chartWidth; from
  // a diagram's figureWidth when a radar sits inside a diagram). compact keeps the small labels of a radar squeezed into
  // a teaser panel; it is for a radar inside another figure, never for a radar figure of its own.
  function radar({ axes, methods, W, H, legendTitle, legendMode = "corner", figureWidth = S.REF_WIDTH.diagram, chartWidth, compact = false }) {
    const cw = chartWidth ?? (figureWidth * S.REF_WIDTH.chart) / S.REF_WIDTH.diagram;
    const kc = cw / S.REF_WIDTH.chart;
    const k = compact ? figureWidth / S.REF_WIDTH.diagram : kc;
    const FS_AX = compact ? S.textSize("diagram", "radarLabel", figureWidth) : S.textSize("chart", "title", cw),
      FS_LEG = compact ? S.textSize("diagram", "radarLegend", figureWidth) : S.textSize("chart", "legend", cw),
      OFF = 8 * k;
    const st = strokes("chart", cw);
    const LN = compact
      ? { ours: 2.8 * k, other: 2.4 * k, marker: 4.5 * k, ring: 1.4 * k, grid: 1.2 * k, rim: 1.5 * k }
      : { ours: st.line * 1.2, other: st.line, marker: st.marker, ring: st.markerRing, grid: st.grid, rim: st.axis };
    const N = axes.length,
      ux = (i) => Math.sin((2 * Math.PI * i) / N),
      uy = (i) => -Math.cos((2 * Math.PI * i) / N);
    const ms = methods.map((m, i) => ({ ...m, color: m.color || S.SERIES[i] }));
    const ratio = axes.map((a) => radarRatios(ms.map((m) => a.values[m.id]), a.better === "lower"));
    const labs = axes.map((a) => T(`${a.label} ${a.better === "lower" ? "↓" : "↑"}`, FS_AX, { color: S.NEUTRAL.sub }));
    const ext = (R) => {
      let x0 = -R - 6,
        x1 = R + 6,
        y0 = -R - 6,
        y1 = R + 6;
      labs.forEach((t, i) => {
        const ax = (R + OFF) * ux(i),
          ay = (R + OFF) * uy(i),
          w = t.width,
          h = t.height;
        const lx = Math.abs(ux(i)) < 0.3 ? ax - w / 2 : ux(i) > 0 ? ax : ax - w;
        const ly = Math.abs(uy(i)) > 0.9 ? (uy(i) < 0 ? ay - h : ay) : ay - h / 2;
        x0 = Math.min(x0, lx);
        x1 = Math.max(x1, lx + w + 0.35 * FS_AX); // the Roboto arrow at the end of a label is wider than its text box
        y0 = Math.min(y0, ly);
        y1 = Math.max(y1, ly + h);
      });
      return { x0, x1, y0, y1 };
    };
    let lg = null;
    if (legendMode !== "none") {
      lg = AL("radar legend", "VERTICAL", { gap: 4 * k, pad: [8 * k, 12 * k, 9 * k, 12 * k], fill: "#FFFFFF", stroke: S.NEUTRAL.rule, sw: 1.2 * k, r: 8 * k, cross: "MIN" });
      if (legendTitle) lg.appendChild(T(legendTitle, FS_LEG, { color: S.NEUTRAL.title, style: "SemiBold" }));
      for (const m of [...ms].sort((a, b) => (b.ours ? 1 : 0) - (a.ours ? 1 : 0))) {
        const L = 30 * k,
          Hh = 14 * k;
        const smp = svg(`<svg width="${L}" height="${Hh}" viewBox="0 0 ${L} ${Hh}" fill="none"><path d="M${1.5 * k} ${Hh / 2} H${L - 1.5 * k}" stroke="${m.color}" stroke-width="${LN.other * 0.95}" stroke-linecap="round"/>${marker(m.color, L / 2, Hh / 2, { marker: LN.marker * 0.85, markerRing: LN.ring })}</svg>`, "sample");
        lg.appendChild(add(AL("item", "HORIZONTAL", { gap: 7 * k }), smp, T(m.label, FS_LEG, { color: S.NEUTRAL.ink })));
      }
    }
    const legendBelow = legendMode === "below" && lg ? lg.height + 8 * k : 0;
    let R = Math.floor(Math.min(W, H) / 2);
    while (R > 40) {
      const e = ext(R);
      if (e.x1 - e.x0 <= W - 4 && e.y1 - e.y0 + legendBelow <= H - 4) break;
      R -= 1;
    }
    const e = ext(R),
      FW = Math.ceil(e.x1 - e.x0),
      FH = Math.ceil(e.y1 - e.y0),
      cx = -e.x0,
      cy = -e.y0;
    const plot = box("radar", FW, FH);
    const pt = (i, r) => [cx + R * r * ux(i), cy + R * r * uy(i)];
    const poly = (r) => axes.map((_, i) => pt(i, r).map((v) => v.toFixed(2)).join(" ")).join(" L");
    const oi = ms.findIndex((m) => m.ours);
    // ours' area as an opaque tint drawn first, under the grid: a translucent fill turns solid in some PDF viewers
    let d = oi >= 0 ? `<path d="M${axes.map((_, i) => pt(i, ratio[i][oi]).map((v) => v.toFixed(2)).join(" ")).join(" L")} Z" fill="${S.mix(ms[oi].color, 0.12)}"/>` : "";
    for (const lv of [0.25, 0.5, 0.75]) d += `<path d="M${poly(lv)} Z" stroke="${S.NEUTRAL.grid}" stroke-width="${LN.grid}"/>`;
    for (let i = 0; i < N; i++) d += `<path d="M${cx.toFixed(2)} ${cy.toFixed(2)} L${pt(i, 1).map((v) => v.toFixed(2)).join(" ")}" stroke="${S.NEUTRAL.grid}" stroke-width="${LN.grid}"/>`;
    d += `<path d="M${poly(1)} Z" stroke="${S.NEUTRAL.axis}" stroke-width="${LN.rim}"/>`;
    let marks = "";
    const order = ms.map((m, i) => i).sort((a, b) => (ms[a].ours ? 1 : 0) - (ms[b].ours ? 1 : 0));
    for (const mi of order) {
      const m = ms[mi];
      d += `<path d="M${axes.map((_, i) => pt(i, ratio[i][mi]).map((v) => v.toFixed(2)).join(" ")).join(" L")} Z" stroke="${m.color}" stroke-width="${m.ours ? LN.ours : LN.other}" stroke-linejoin="round"/>`;
      axes.forEach((_, i) => {
        const [x, y] = pt(i, ratio[i][mi]);
        marks += marker(m.color, x, y, { marker: LN.marker, markerRing: LN.ring });
      });
    }
    plot.appendChild(svg(`<svg width="${FW}" height="${FH}" viewBox="0 0 ${FW} ${FH}" fill="none">${d}${marks}</svg>`, "radar plot"));
    labs.forEach((t, i) => {
      plot.appendChild(t);
      const ax = cx + (R + OFF) * ux(i),
        ay = cy + (R + OFF) * uy(i),
        w = t.width,
        h = t.height;
      t.x = Math.abs(ux(i)) < 0.3 ? ax - w / 2 : ux(i) > 0 ? ax : ax - w;
      t.y = Math.abs(uy(i)) > 0.9 ? (uy(i) < 0 ? ay - h : ay) : ay - h / 2;
    });
    const holder = box("radar block", W, H);
    holder.appendChild(plot);
    plot.x = Math.round((W - FW) / 2);
    plot.y = 0;
    let placed = "none";
    if (lg) {
      holder.appendChild(lg);
      const LW = lg.width,
        LH = lg.height,
        M = 6 * k;
      const rects = labs.map((t) => ({ x: plot.x + t.x - M, y: plot.y + t.y - M, w: t.width + 2 * M, h: t.height + 2 * M }));
      const ring = axes.map((_, i) => [plot.x + cx + (R + M) * ux(i), plot.y + cy + (R + M) * uy(i)]);
      let best = null;
      if (legendMode === "corner")
        for (const side of ["right", "left"]) {
          const x = side === "right" ? W - LW - 2 : 2;
          const y = highestClearY({ x, y0: H - LH - 2, w: LW, h: LH, rects, poly: ring, step: 2 });
          if (y != null && (!best || y < best.y)) best = { x, y, side };
        }
      // no free corner: draw again with the legend below, the radar shrunk so both fit inside W x H
      if (!best && legendMode === "corner") {
        holder.remove();
        return radar({ axes, methods, W, H, legendTitle, legendMode: "below", figureWidth, chartWidth, compact });
      }
      if (!best) best = { x: Math.round((W - LW) / 2), y: FH + 8 * k, side: "below" };
      lg.x = best.x;
      lg.y = best.y;
      placed = best.side;
      const bottom = Math.max(FH, best.y + LH);
      // everything stays inside the frame: a radar at its smallest size grows the frame instead of spilling out
      if (bottom > H) holder.resizeWithoutConstraints(W, bottom);
      const dy = Math.max(0, Math.round((H - bottom) / 2));
      plot.y += dy;
      lg.y += dy;
    } else plot.y = Math.round((H - FH) / 2);
    // a radar limited by the height leaves empty sides: the frame ends a few px outside the drawing
    const parts = holder.children,
      x0 = Math.min(...parts.map((n) => n.x)),
      x1 = Math.max(...parts.map((n) => n.x + n.width));
    if (x0 > 4 * k || W - x1 > 4 * k) {
      for (const n of parts) n.x -= x0 - 2 * k;
      holder.resizeWithoutConstraints(Math.ceil(x1 - x0 + 4 * k), holder.height);
    }
    return { node: holder, R, ratio, legend: placed };
  }

  return { linePanel, barPanel, legend, group, chartFigure, radar };
}
