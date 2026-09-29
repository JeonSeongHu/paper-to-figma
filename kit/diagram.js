// Diagram parts for method figures and teasers: latent tiles, tokens, encoder/decoder trapezoids, the model block,
// prompt chips, lanes behind columns, dashed flow tracks with arrowheads, panel captions.
// Sizes follow kit/spec.js at the diagram reference width (1498); pass the figure width so parts scale with it.
import * as S from "./spec.js";
import { hatchPath } from "./math.js";

export function createDiagram(core) {
  const { AL, add, box, T, TM, svg, rect, textWidth } = core;

  // A colour role with every tone opaque. Hatch stripes are blended with white beforehand.
  function palette(role = "ours", overrides = {}) {
    const base = { ours: S.OURS, second: S.SECOND, baseline: S.BASELINE }[role] || role;
    const m = { ...base, ...overrides };
    return { ...m, hatchSolid: S.mix(m.hatch || m.deep, m.hatchAlpha ?? 0.6) };
  }
  const kOf = (figureWidth) => (figureWidth || S.REF_WIDTH.diagram) / S.REF_WIDTH.diagram;

  // Latent tile: "clean" is filled, "noisy" is white with 45-degree stripes cut to the tile (no clip frame),
  // "empty" keeps the slot.
  function tile(kind, m, size, figureWidth) {
    const k = kOf(figureWidth);
    const f = box(kind + "-latent", size, size);
    if (kind === "empty") return f;
    f.cornerRadius = S.RADIUS.tile * k;
    f.strokes = core.paint(m.deep);
    f.strokeWeight = S.STROKE.diagram.tile * k;
    f.strokeAlign = "INSIDE";
    if (kind === "clean") f.fills = core.paint(m.mid);
    else {
      f.fills = core.paint("#FFFFFF");
      const d = hatchPath(size, { width: S.STROKE.diagram.hatchWidth * k, pitch: S.STROKE.diagram.hatchPitch * k, inset: 1.2 * k });
      const h = svg(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"><path d="${d}" fill="${m.hatchSolid}"/></svg>`, "noise");
      f.appendChild(h);
      h.x = 0;
      h.y = 0;
    }
    return f;
  }
  function tileRow(kinds, m, size, gap, figureWidth) {
    const r = AL("latents", "HORIZONTAL", { gap });
    for (const kd of kinds) r.appendChild(tile(kd, m, size, figureWidth));
    return r;
  }
  // A word token: white cell with an outline and the word in the monospace face (data, not a label).
  function token(word, m, size, figureWidth, fontSize) {
    const k = kOf(figureWidth);
    const fs = fontSize || Math.round(size * 0.34 * 2) / 2;
    return add(AL("text-token", "VERTICAL", { w: size, h: size, fill: "#FFFFFF", stroke: m.deep, sw: S.STROKE.diagram.tile * k, r: S.RADIUS.tile * k }), TM(word, fs, { color: m.ink || S.NEUTRAL.muted }));
  }
  const corners = new WeakMap();
  // top-right vertex of a polygon path "M x y L x y ...": the highest point, rightmost among the highest
  function cornerOf(d) {
    const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }));
    return pts.reduce((best, p) => (p.x - p.y > best.x - best.y ? p : best)); // furthest towards the top right
  }
  // Encoder or decoder as a trapezoid. orient "v" (flow bottom to top): the encoder is wide at the bottom, the decoder
  // wide at the top. orient "h" (flow left to right): the encoder is wide on the left, the decoder wide on the right.
  function trapezoid(label, m, dir, width, height, figureWidth, orient = "v") {
    const k = kOf(figureWidth),
      fs = S.textSize("diagram", "module", figureWidth || S.REF_WIDTH.diagram);
    // the label must fit inside the narrow end; the shape grows, the text never shrinks
    const lines = String(label).split("\n");
    const tw = Math.max(...lines.map((l) => textWidth(l, fs, { style: "Medium" })));
    if (orient === "h") width = Math.max(width, Math.ceil(tw + 36 * k));
    else width = Math.max(width, Math.ceil((tw + 20 * k) / 0.7 + 10 * k));
    let d;
    if (orient === "h") {
      const tall = height - 2,
        short = Math.round(tall * 0.62),
        a = (height - tall) / 2,
        b = (height - short) / 2;
      const [left, right] = dir === "enc" ? [[a, height - a], [b, height - b]] : [[b, height - b], [a, height - a]];
      d = `M1 ${left[0]} L${width - 1} ${right[0]} L${width - 1} ${right[1]} L1 ${left[1]} Z`;
    } else {
      const wide = width - 10 * k,
        narrow = Math.round(wide * 0.7),
        a = (width - wide) / 2,
        b = (width - narrow) / 2;
      const [top, bot] = dir === "enc" ? [[b, width - b], [a, width - a]] : [[a, width - a], [b, width - b]];
      d = `M${bot[0]} ${height - 1} L${top[0]} 1 L${top[1]} 1 L${bot[1]} ${height - 1} Z`;
    }
    const f = AL(label, "VERTICAL", { w: width, h: height });
    // the drawn top-right corner, where a badge belongs (the bounding box corner can be far from the shape)
    corners.set(f, cornerOf(d));
    const s = svg(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none"><path d="${d}" fill="#FFFFFF" stroke="${m.deep}" stroke-width="${S.STROKE.diagram.module * k}" stroke-linejoin="round"/></svg>`, "trapezoid");
    f.appendChild(s);
    s.layoutPositioning = "ABSOLUTE";
    s.x = 0;
    s.y = 0;
    f.appendChild(T(label, fs, { color: m.ink, style: "Medium" }));
    return tagLevel(f, 2);
  }
  // The shared model block. Band colour is opaque (no fill opacity).
  function block(label, width, height, figureWidth, { fontRole = "block", color = S.NEUTRAL.ink } = {}) {
    const k = kOf(figureWidth);
    return tagLevel(add(AL(label, "VERTICAL", { w: width, h: height, fill: S.NEUTRAL.band, r: S.RADIUS.block * k }), T(label, S.textSize("diagram", fontRole, figureWidth || S.REF_WIDTH.diagram), { color, style: "Medium" })), 2);
  }
  // Prompt chip in the monospace face.
  // A prompt chip in the monospaced face. Text with line breaks keeps them; { w } wraps the text at a width.
  function chip(text, m, figureWidth, { w, align = "CENTER" } = {}) {
    const k = kOf(figureWidth),
      fs = S.textSize("diagram", "chip", figureWidth || S.REF_WIDTH.diagram);
    return tagLevel(add(AL("chip", "HORIZONTAL", { pad: [9 * k, 16 * k, 9 * k, 16 * k], fill: "#FFFFFF", stroke: m.stroke, sw: S.STROKE.diagram.chip * k, r: S.RADIUS.chip * k, cross: "CENTER" }), TM(text, fs, { color: S.NEUTRAL.ink, w, align })), 3);
  }
  // Rounded lane behind a column, as an absolute child of `parent`, spanning from y0 to y1.
  function lane(parent, x, y0, width, height, m, figureWidth, name = "lane") {
    const k = kOf(figureWidth);
    const r = rect(width, height, m.lane, S.RADIUS.lane * k, name);
    parent.insertChild(0, r);
    if (parent.layoutMode && parent.layoutMode !== "NONE") r.layoutPositioning = "ABSOLUTE";
    r.x = x;
    r.y = y0;
    return r;
  }
  // Dashed flow tracks from inputs (bottom) to outputs (top) with arrowheads at the output end.
  // segs: [{ x1, y1, x2, y2, color }] in the coordinates of `parent`; the tracks become one absolute vector.
  function flowTracks(parent, segs, figureWidth, index = 1) {
    const k = kOf(figureWidth),
      st = S.STROKE.diagram;
    const AH = st.head[0] * k,
      AW = (st.head[1] / 2) * k;
    const yMin = Math.min(...segs.map((s) => s.y2)) - 2,
      yMax = Math.max(...segs.map((s) => s.y1)) + 2;
    let paths = "";
    for (const s of segs) {
      const y1 = s.y1 - yMin,
        y2 = s.y2 - yMin,
        ye = y2 + AH + 3 * k;
      const dd = Math.abs(s.x1 - s.x2) < 0.5 ? `M${s.x1} ${y1} V${ye}` : `M${s.x1} ${y1} C${s.x1} ${y1 - (y1 - ye) * 0.5} ${s.x2} ${ye + (y1 - ye) * 0.5} ${s.x2} ${ye}`;
      paths += `<path d="M${s.x2} ${y2 + 1.5} L${s.x2 + AW} ${y2 + 1.5 + AH} L${s.x2 - AW} ${y2 + 1.5 + AH} Z" fill="${s.color}" stroke="${s.color}" stroke-width="${k}" stroke-linejoin="round"/>`;
      paths += `<path d="${dd}" stroke="${s.color}" stroke-width="${st.flow * k}" stroke-dasharray="${st.flowDash.map((v) => v * k).join(" ")}" stroke-linecap="round"/>`;
    }
    const W = parent.width;
    const n = svg(`<svg width="${W}" height="${yMax - yMin}" viewBox="0 0 ${W} ${yMax - yMin}" fill="none">${paths}</svg>`, "tracks");
    parent.insertChild(index, n);
    n.layoutPositioning = "ABSOLUTE";
    n.x = 0;
    n.y = yMin;
    return n;
  }
  // Panel caption: "(b) Our Method" in SemiBold ink for ours, Medium muted gray for a baseline panel.
  function caption(text, { ours = false, figureWidth } = {}) {
    return T(text, S.textSize("diagram", "caption", figureWidth || S.REF_WIDTH.diagram), { color: ours ? S.NEUTRAL.ink : S.NEUTRAL.muted, style: ours ? "SemiBold" : "Medium" });
  }
  // Legend row of diagram symbols: items = [{ icons: [node, ...], label }]
  function symbolLegend(items, figureWidth, { size } = {}) {
    const k = kOf(figureWidth),
      fs = size || S.textSize("diagram", "legend", figureWidth || S.REF_WIDTH.diagram);
    const row = AL("legend", "HORIZONTAL", { gap: 40 * k });
    for (const it of items) row.appendChild(add(AL("legend-item", "HORIZONTAL", { gap: 10 * k }), add(AL("icons", "HORIZONTAL", { gap: 5 * k }), ...it.icons), T(it.label, fs, { color: S.NEUTRAL.ink })));
    return row;
  }
  // A node with its caption underneath. flowRow lines rows up on the node, not on node + caption.
  const anchors = new WeakMap();
  // side: "bottom" (default) or "top"; flowRow still lines the row up on the node itself
  function captioned(node, caption, { gap = 8, figureWidth, fw, color = S.NEUTRAL.sub, side = "bottom" } = {}) {
    figureWidth ??= fw;
    const k = kOf(figureWidth);
    const t = typeof caption === "string" ? T(caption, S.textSize("diagram", "note", figureWidth || S.REF_WIDTH.diagram), { color }) : caption;
    const col = add(AL(node.name + " + caption", "VERTICAL", { gap: gap * k, cross: "CENTER", main: "MIN" }), ...(side === "top" ? [t, node] : [node, t]));
    anchors.set(col, node);
    return col;
  }
  // One row of a flow (stages and arrows). Every item is lined up so that the centre of its anchor (the node itself, or
  // the node of a captioned item) sits on one line, and arrows point at the nodes rather than at node + caption; the
  // near-miss alignment the principles call the worst case. Only the needed top padding is added, so the tallest node
  // touches the top of the row and no white band is left above it.
  function flowRow(items, { gap = 6, name = "flow" } = {}) {
    const row = AL(name, "HORIZONTAL", { gap, cross: "MIN" });
    const cells = items.map((it) => {
      const cell = AL("cell", "VERTICAL", { cross: "CENTER", main: "MIN" });
      cell.appendChild(it);
      row.appendChild(cell);
      return { cell, it, anchor: anchors.get(it) || it };
    });
    const centre = (c) => c.anchor.absoluteBoundingBox.y - c.cell.absoluteBoundingBox.y + c.anchor.height / 2;
    const top = Math.max(...cells.map(centre));
    for (const c of cells) c.cell.paddingTop = top - centre(c);
    return row;
  }
  // Tokens stacked across the flow: in a left-to-right figure the stack is vertical, so its height can match the modules
  // and the figure does not grow sideways. The drawing already says "a sequence"; add no caption that repeats it
  // ("256 patch tokens"). Give the count in the figure caption, or as a short label only when the count is the point.
  function tokenStack(n, m, { size, gap, figureWidth, kind = "clean", orient = "v", ellipsis = false } = {}) {
    const k = kOf(figureWidth),
      cell = size || 26 * k,
      g = gap ?? 5 * k;
    const st = AL(`${n} tokens`, orient === "v" ? "VERTICAL" : "HORIZONTAL", { gap: g, cross: "CENTER" });
    for (let i = 0; i < n; i++) st.appendChild(tile(kind, m, cell, figureWidth));
    if (ellipsis) st.appendChild(T(orient === "v" ? "⋮" : "⋯", cell * 0.9, { color: m.deep || S.NEUTRAL.muted }));
    return st;
  }
  // A few tiles standing for many tokens, with the count underneath ("256 patch tokens"). Draw at most `show` tiles:
  // the count is the information, the tiles only say "a sequence". The tiles sit on the row's centre line.
  function tokenStrip(count, label, m, { size, gap, show = 5, kind = "clean", figureWidth } = {}) {
    const k = kOf(figureWidth),
      cell = size || 30 * k,
      g = gap ?? 6 * k;
    const row = tileRow(Array(Math.min(show, count)).fill(kind), m, cell, g, figureWidth);
    row.name = `${count} tokens`;
    return captioned(row, label, { figureWidth });
  }
  // The contribution (level 1): the one block filled with the accent, white SemiBold text at the block size. Once per figure.
  function keyBlock(label, width, height, m, figureWidth) {
    const k = kOf(figureWidth);
    return tagLevel(add(AL(label, "VERTICAL", { w: width, h: height, fill: m.deep, r: S.RADIUS.block * k }), T(label, S.textSize("diagram", "block", figureWidth || S.REF_WIDTH.diagram), { color: "#FFFFFF", style: "SemiBold", w: width - 24 * k })), 1);
  }
  // A module drawn as an outlined box (white fill, role colour outline), e.g. a trained head.
  function moduleBox(label, width, height, m, figureWidth) {
    const k = kOf(figureWidth);
    return tagLevel(add(AL(label, "VERTICAL", { w: width, h: height, fill: "#FFFFFF", stroke: m.deep, sw: S.STROKE.diagram.module * k, r: S.RADIUS.block * k }), T(label, S.textSize("diagram", "module", figureWidth || S.REF_WIDTH.diagram), { color: m.ink, style: "Medium", w: width - 20 * k })), 2);
  }
  // Snowflake (frozen) or flame (trained) badge: the icon on a white disc with a thin outline, so it reads on filled
  // blocks too. Pin it to the top-right corner of a module with pinBadge.
  function badge(kind, figureWidth, { size, colors = {} } = {}) {
    const k = kOf(figureWidth),
      d = size || S.BADGE.size * k,
      c = d / 2;
    const disc = `<circle cx="${c}" cy="${c}" r="${c - 0.8 * k}" fill="#FFFFFF" stroke="${S.NEUTRAL.divider}" stroke-width="${1.2 * k}"/>`;
    let icon = "";
    if (kind === "frozen") {
      const col = colors.frozen || S.BADGE.frozen,
        r = d * 0.32,
        b = d * 0.1,
        sw = Math.max(1.4, d * 0.075);
      let p = "";
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i,
          ux = Math.sin(a),
          uy = -Math.cos(a);
        const ex = c + r * ux,
          ey = c + r * uy,
          mx = c + r * 0.55 * ux,
          my = c + r * 0.55 * uy;
        p += `M${c.toFixed(2)} ${c.toFixed(2)} L${ex.toFixed(2)} ${ey.toFixed(2)} `;
        for (const s2 of [-1, 1]) {
          const bx = Math.sin(a + (s2 * Math.PI) / 4),
            by = -Math.cos(a + (s2 * Math.PI) / 4);
          p += `M${mx.toFixed(2)} ${my.toFixed(2)} L${(mx + b * bx).toFixed(2)} ${(my + b * by).toFixed(2)} `;
        }
      }
      icon = `<path d="${p}" stroke="${col}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round"/>`;
    } else {
      const col = colors.trained || S.BADGE.trained,
        inner = colors.trainedInner || S.BADGE.trainedInner,
        u = d / 24; // flame drawn on a 24-unit grid
      const outer = `M${12 * u} ${4 * u} C${12.5 * u} ${7.5 * u} ${17 * u} ${9.5 * u} ${17 * u} ${14 * u} C${17 * u} ${17.3 * u} ${14.8 * u} ${20 * u} ${12 * u} ${20 * u} C${9.2 * u} ${20 * u} ${7 * u} ${17.6 * u} ${7 * u} ${14.6 * u} C${7 * u} ${12 * u} ${8.6 * u} ${10.6 * u} ${9.6 * u} ${9.4 * u} C${9.8 * u} ${11 * u} ${10.4 * u} ${12 * u} ${11.2 * u} ${12.4 * u} C${11 * u} ${9.6 * u} ${11.3 * u} ${6.6 * u} ${12 * u} ${4 * u} Z`;
      const core = `M${12 * u} ${12.6 * u} C${12.6 * u} ${14.2 * u} ${14.3 * u} ${15 * u} ${14.3 * u} ${16.8 * u} C${14.3 * u} ${18.2 * u} ${13.3 * u} ${19.2 * u} ${12 * u} ${19.2 * u} C${10.7 * u} ${19.2 * u} ${9.7 * u} ${18.2 * u} ${9.7 * u} ${16.9 * u} C${9.7 * u} ${15.3 * u} ${11.3 * u} ${14.3 * u} ${12 * u} ${12.6 * u} Z`;
      icon = `<path d="${outer}" fill="${col}"/><path d="${core}" fill="${inner}"/>`;
    }
    const n = svg(`<svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" fill="none">${disc}${icon}</svg>`, kind === "frozen" ? "frozen (snowflake)" : "trained (flame)");
    n.setSharedPluginData("p2f", "badge", kind);
    return n;
  }
  // Pin a badge to the top-right corner of `module`, as an absolute child of `root` (the badge overlaps the corner).
  function pinBadge(root, module, kind, figureWidth, opts = {}) {
    const b = badge(kind, figureWidth, opts);
    const m = core.rel(module, root);
    const c = corners.get(module);
    if (c) core.absolute(root, b, m.x + c.x - b.width * 0.5, m.y + c.y - b.height * 0.5);
    else core.absolute(root, b, m.x + m.w - b.width * 0.6, m.y - b.height * 0.4);
    return b;
  }
  // Legend for the two badges, e.g. placed in an empty corner of the figure.
  function badgeLegend(figureWidth, { size, labels = { frozen: "frozen", trained: "trained" }, kinds = ["frozen", "trained"] } = {}) {
    const k = kOf(figureWidth),
      fs = size || S.textSize("diagram", "note", figureWidth || S.REF_WIDTH.diagram);
    const row = AL("badge legend", "HORIZONTAL", { gap: 18 * k, cross: "CENTER" });
    for (const kind of kinds) {
      const b = badge(kind, figureWidth);
      b.setSharedPluginData("p2f", "badge", "");
      row.appendChild(add(AL(kind, "HORIZONTAL", { gap: 6 * k, cross: "CENTER" }), b, T(labels[kind], fs, { color: S.NEUTRAL.sub })));
    }
    return row;
  }
  const fits = (str, size, maxW, style) => textWidth(str, size, { style }) <= maxW;

  // --- Visual hierarchy (principle 9) --------------------------------------------------------------------------------
  // Every element is tagged with its level so lint can check that no lower level is larger or stronger than a higher one.
  const tagLevel = (node, level) => {
    node.setSharedPluginData("p2f", "level", String(level));
    return node;
  };
  // A labelled element at one of the three levels (S.LEVEL):
  //   1 claim    the one key module or path of the proposed method: accent fill, white text at the block size
  //   2 method   other parts of the proposed method: white box, role-colour outline, module-size text
  //   3 context  inputs, baselines, fallback paths, shared parts: white box, gray outline, note-size text
  // dashed: an optional input or a fallback path (the outline says "optional"; no "(optional)" label).
  // sub: a second, smaller line (a role, never a sentence).
  function element(label, level, m, { w, h, figureWidth, fw: fwOpt, dashed = false, sub, pad } = {}) {
    figureWidth ??= fwOpt;
    const k = kOf(figureWidth),
      fw = figureWidth || S.REF_WIDTH.diagram,
      L = S.LEVEL[level];
    if (!L) throw new Error(`level must be 1, 2 or 3, not ${level}`);
    const look =
      level === 1 ? { fill: m.deep } : level === 2 ? { fill: "#FFFFFF", stroke: m.deep, sw: S.STROKE.diagram.module * k } : { fill: "#FFFFFF", stroke: S.NEUTRAL.divider, sw: S.STROKE.diagram.chip * k };
    if (dashed) Object.assign(look, { stroke: look.stroke || S.NEUTRAL.divider, sw: look.sw || S.STROKE.diagram.chip * k, dash: [7 * k, 5 * k] });
    const P = pad ?? (level === 3 ? [8 * k, 14 * k, 8 * k, 14 * k] : [12 * k, 18 * k, 12 * k, 18 * k]);
    const f = AL(label, "VERTICAL", { ...(w ? { w } : {}), ...(h ? { h } : {}), pad: P, gap: 2 * k, r: (level === 3 ? S.RADIUS.chip : S.RADIUS.block) * k, ...look });
    const ink = level === 1 ? "#FFFFFF" : level === 2 ? m.ink || S.NEUTRAL.ink : S.NEUTRAL.sub;
    const tw = w ? { w: w - P[1] - P[3] } : {};
    f.appendChild(T(label, S.textSize("diagram", L.text, fw), { color: ink, style: L.style, ...tw }));
    if (sub) f.appendChild(T(sub, S.textSize("diagram", "note", fw), { color: level === 1 ? "#FFFFFF" : S.NEUTRAL.sub, ...tw }));
    return tagLevel(f, level);
  }

  // --- Icons (principle 6): what an input or a representation is, drawn instead of written -------------------------------
  // Vector only (an emoji character is rasterised or dropped in a PDF). kind: image, frames (several views or frames),
  // film (a demonstration video), clock (time, age, delay), arm (robot state, proprioception), text (an instruction when
  // the paper gives no example), stack (a memory or history of items).
  // dashed: an optional input; the icon (and its label) sit in a dashed box
  // labelSide: "bottom" (default), "top", "left" or "right"
  function icon(kind, { size, color = S.NEUTRAL.muted, fill = "#FFFFFF", figureWidth, fw, label, dashed = false, labelSide = "bottom" } = {}) {
    figureWidth ??= fw;
    const k = kOf(figureWidth),
      d = size || 44 * k,
      u = d / 24,
      sw = Math.max(1.2, 1.6 * u).toFixed(2),
      tint = S.mix(color, 0.18);
    const pic = (x, y, w, h, bg = fill) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${1.6 * u}" fill="${bg}" stroke="${color}" stroke-width="${sw}"/>` +
      `<circle cx="${x + w * 0.3}" cy="${y + h * 0.32}" r="${Math.min(w, h) * 0.1}" fill="${tint}"/>` +
      `<path d="M${x + w * 0.1} ${y + h * 0.86} L${x + w * 0.4} ${y + h * 0.5} L${x + w * 0.6} ${y + h * 0.7} L${x + w * 0.72} ${y + h * 0.58} L${x + w * 0.9} ${y + h * 0.86} Z" fill="${tint}"/>`;
    let body;
    if (kind === "image") body = pic(2 * u, 4 * u, 20 * u, 16 * u);
    else if (kind === "frames") body = pic(7 * u, 1.5 * u, 15 * u, 12 * u, S.mix(color, 0.08)) + pic(4.5 * u, 5.5 * u, 15 * u, 12 * u, S.mix(color, 0.04)) + pic(2 * u, 9.5 * u, 15 * u, 12 * u);
    else if (kind === "film") {
      body = `<rect x="${1.5 * u}" y="${4 * u}" width="${21 * u}" height="${16 * u}" rx="${1.6 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>`;
      for (let i = 0; i < 5; i++) body += `<rect x="${(3.2 + i * 3.9) * u}" y="${5.3 * u}" width="${1.8 * u}" height="${1.6 * u}" fill="${color}"/><rect x="${(3.2 + i * 3.9) * u}" y="${17.1 * u}" width="${1.8 * u}" height="${1.6 * u}" fill="${color}"/>`;
      for (let i = 0; i < 3; i++) body += `<rect x="${(3 + i * 6.3) * u}" y="${8.2 * u}" width="${5.4 * u}" height="${7.6 * u}" rx="${0.6 * u}" fill="${tint}"/>`;
    } else if (kind === "clock")
      body = `<circle cx="${12 * u}" cy="${12 * u}" r="${9.5 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/><path d="M${12 * u} ${6.5 * u} V${12 * u} L${16 * u} ${14.5 * u}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else if (kind === "arm")
      body =
        `<path d="M${4 * u} ${21 * u} H${12 * u}" stroke="${color}" stroke-width="${(2.2 * u).toFixed(2)}" stroke-linecap="round"/>` +
        `<path d="M${8 * u} ${20 * u} L${8 * u} ${13 * u} L${15 * u} ${7 * u} L${19.5 * u} ${10.5 * u}" stroke="${color}" stroke-width="${(2.2 * u).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M${19.5 * u} ${10.5 * u} L${21.5 * u} ${9 * u} M${19.5 * u} ${10.5 * u} L${21 * u} ${12.8 * u}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>` +
        [[8, 13], [15, 7]].map(([x, y]) => `<circle cx="${x * u}" cy="${y * u}" r="${1.9 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>`).join("");
    else if (kind === "text")
      body = `<rect x="${4 * u}" y="${2.5 * u}" width="${16 * u}" height="${19 * u}" rx="${1.6 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>` + [7, 10.5, 14, 17.5].map((y, i) => `<path d="M${7 * u} ${y * u} H${(i === 3 ? 13 : 17) * u}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`).join("");
    else if (kind === "stack" || kind === "memory") {
      // a storage cylinder: the usual sign for a memory or a history store
      const x0 = 4 * u,
        x1 = 20 * u,
        rx = 8 * u,
        ry = 2.8 * u;
      body =
        `<path d="M${x0} ${5 * u} V${19 * u} A${rx} ${ry} 0 0 0 ${x1} ${19 * u} V${5 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>` +
        `<ellipse cx="${12 * u}" cy="${5 * u}" rx="${rx}" ry="${ry}" fill="${tint}" stroke="${color}" stroke-width="${sw}"/>` +
        [10, 14.5].map((y) => `<path d="M${x0} ${y * u} A${rx} ${ry} 0 0 0 ${x1} ${y * u}" stroke="${color}" stroke-width="${sw}"/>`).join("");
    }
    else throw new Error(`unknown icon ${kind}`);
    const n = svg(`<svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" fill="none">${body}</svg>`, `icon ${kind}`);
    tagLevel(n, 3);
    // lint checks that every icon kind is named somewhere in the figure (its first use, or a legend)
    n.setSharedPluginData("p2f", "icon", kind);
    if (label) n.setSharedPluginData("p2f", "named", "1");
    let out = n;
    if (label && (labelSide === "left" || labelSide === "right")) {
      const t = T(label, S.textSize("diagram", "note", figureWidth || S.REF_WIDTH.diagram), { color: S.NEUTRAL.sub });
      out = add(AL(`${kind} + name`, "HORIZONTAL", { gap: 8 * k, cross: "CENTER" }), ...(labelSide === "left" ? [t, n] : [n, t]));
    } else if (label) out = captioned(n, label, { figureWidth, gap: 4, side: labelSide });
    if (!dashed) return out;
    const b = AL(`optional ${kind}`, "VERTICAL", { pad: [8 * k, 12 * k, 8 * k, 12 * k], r: S.RADIUS.chip * k, fill: "#FFFFFF", stroke: S.NEUTRAL.divider, sw: S.STROKE.diagram.chip * k, dash: [7 * k, 5 * k] });
    b.appendChild(out);
    return tagLevel(b, 3);
  }

  // An arrow that stops: the information does not reach the next element ("not an input", "never passed on"). A dashed
  // gray body and a cross instead of the head; say nothing more in the figure, the caption explains it.
  // orient: "right" (or "h"), "up" (or "v"), "down", "left"; the cross sits at the far end
  function blockedArrow(length, { orient = "h", color = S.NEUTRAL.muted, figureWidth, fw } = {}) {
    figureWidth ??= fw;
    if (orient === "right") orient = "h";
    if (orient === "up") orient = "v";
    if (orient === "down" || orient === "left") {
      const n = blockedArrow(length, { orient: orient === "down" ? "v" : "h", color, figureWidth });
      const f = core.box("blocked arrow " + orient, n.width, n.height);
      f.appendChild(n);
      n.rotation = 180;
      n.x = n.width;
      n.y = n.height;
      return f;
    }
    const k = kOf(figureWidth),
      st = S.STROKE.diagram,
      c = 7 * k,
      h = 2 * c + 4 * k,
      L = Math.max(length, 4 * c);
    const [w, hh] = orient === "h" ? [L, h] : [h, L];
    const mid = h / 2;
    const line = orient === "h" ? `M${1.5 * k} ${mid} H${L - 2.6 * c}` : `M${mid} ${L - 1.5 * k} V${2.6 * c}`;
    const [cx, cy] = orient === "h" ? [L - 1.2 * c, mid] : [mid, 1.2 * c];
    const cross = `M${cx - c * 0.8} ${cy - c * 0.8} L${cx + c * 0.8} ${cy + c * 0.8} M${cx - c * 0.8} ${cy + c * 0.8} L${cx + c * 0.8} ${cy - c * 0.8}`;
    const b = svg(
      `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" fill="none"><path d="${line}" stroke="${color}" stroke-width="${st.arrow * k}" stroke-dasharray="${st.flowDash.map((v) => v * k).join(" ")}" stroke-linecap="round"/><path d="${cross}" stroke="${S.CURSOR.red}" stroke-width="${st.arrow * k * 1.1}" stroke-linecap="round"/></svg>`,
      "blocked arrow",
    );
    b.setSharedPluginData("p2f", "blocked", String(Math.round(L))); // lint: a missing link stays short (level 3)
    return b;
  }

  // --- Time (principle 15) -------------------------------------------------------------------------------------------------
  // A time axis for the events it carries: a gray line with an arrowhead, a tick and a name at every event
  // (ticks: [{ x, label }], x from the axis start), and the axis name at the end. Put it right next to the events, and
  // line the lanes up on it: the same x is the same moment in every lane.
  function timeline(length, { ticks = [], label = "time", figureWidth, fw } = {}) {
    figureWidth ??= fw;
    const k = kOf(figureWidth),
      fwd = figureWidth || S.REF_WIDTH.diagram,
      fs = S.textSize("diagram", "note", fwd),
      st = S.STROKE.diagram;
    const H = 12 * k,
      head = st.arrowHead * k;
    let d = `<path d="M0 ${H / 2} H${length - head}" stroke="${S.NEUTRAL.muted}" stroke-width="${st.arrow * k}"/>`;
    d += `<path d="M${length} ${H / 2} L${length - head - 1} ${H / 2 - head / 2} L${length - head - 1} ${H / 2 + head / 2} Z" fill="${S.NEUTRAL.muted}"/>`;
    for (const t of ticks) d += `<path d="M${t.x} 0 V${H}" stroke="${S.NEUTRAL.muted}" stroke-width="${st.arrow * k}" stroke-linecap="round"/>`;
    const nameW = label ? textWidth(label, fs, { style: "Medium" }) + 8 * k : 0;
    const f = core.box("time axis", length + nameW, H + fs * 1.5);
    const line = svg(`<svg width="${length}" height="${H}" viewBox="0 0 ${length} ${H}" fill="none">${d}</svg>`, "axis");
    f.appendChild(line);
    for (const t of ticks) {
      if (!t.label) continue;
      const tx = T(t.label, fs, { color: S.NEUTRAL.sub });
      f.appendChild(tx);
      tx.x = Math.max(0, Math.min(length - tx.width, t.x - tx.width / 2)); // names stay inside the axis
      tx.y = H + 2 * k;
    }
    if (label) {
      // the axis name sits after the arrowhead, level with the line, clear of the last tick name
      const tx = T(label, fs, { color: S.NEUTRAL.sub, style: "Medium" });
      f.appendChild(tx);
      tx.x = length + 8 * k;
      tx.y = H / 2 - tx.height / 2;
    }
    return tagLevel(f, 3);
  }
  // A duration on a time axis (how long a computation takes, how old a value is): a flat bar from start to end with an
  // optional short name inside or above it. dashed for an interval that may or may not happen.
  // open: "right" for an interval still running where the drawing ends (no right cap). The bar grows to fit its name.
  function span(width, { label, m = palette("baseline"), height, figureWidth, fw, dashed = false, open } = {}) {
    figureWidth ??= fw;
    const k = kOf(figureWidth),
      fwd = figureWidth || S.REF_WIDTH.diagram,
      h = height || 26 * k,
      fs = S.textSize("diagram", "note", fwd);
    const need = label ? textWidth(label, fs) + h : 0;
    const f = AL(label ? `span ${label}` : "span", "HORIZONTAL", { w: Math.max(width, 2 * h, need), h, pad: [0, h / 2, 0, h / 2], r: h / 2, fill: dashed ? "#FFFFFF" : m.lane || m.mid, stroke: m.deep, sw: S.STROKE.diagram.chip * k, ...(dashed ? { dash: [6 * k, 4 * k] } : {}) });
    if (open === "right") {
      f.topRightRadius = 0;
      f.bottomRightRadius = 0;
      f.strokeRightWeight = 0;
    }
    if (label) f.appendChild(T(label, fs, { color: m.ink || S.NEUTRAL.sub }));
    return tagLevel(f, 3);
  }

  // --- State badges on the minority only (principle 11) ------------------------------------------------------------------
  // items: [{ node, state: "frozen" | "trained" }] for every module whose state the figure could show. Only the rarer
  // state gets badges (a figure where five of six modules are trained marks the one frozen module); returns the legend
  // for that one symbol, or null when the states are not worth showing (all the same).
  function pinStates(root, items, figureWidth) {
    if (typeof figureWidth === "object") figureWidth = figureWidth.figureWidth ?? figureWidth.fw;
    const count = (s) => items.filter((i) => i.state === s).length;
    const fz = count("frozen"),
      tr = count("trained");
    if (!fz || !tr) return { marked: null, legend: null };
    const kind = fz <= tr ? "frozen" : "trained";
    for (const i of items) if (i.state === kind) pinBadge(root, i.node, kind, figureWidth);
    return { marked: kind, legend: badgeLegend(figureWidth, { kinds: [kind] }) };
  }

  // --- Colour meanings (principle 8) ---------------------------------------------------------------------------------------
  // Declare what a colour stands for in this diagram ("image modality", "memory"). kit.place stores the declarations on
  // the frame; verify compares them with the colours the paper's charts give to methods (work/<paper>/palette.json).
  function meaning(colour, text) {
    const hex = String(typeof colour === "string" ? colour : colour.deep).toUpperCase();
    const family = [S.OURS, S.SECOND, S.BASELINE].find((f) => Object.values(f).some((v) => typeof v === "string" && v.toUpperCase() === hex));
    core.meanings.set((family ? family.deep : hex).toUpperCase(), text);
  }

  return { palette, tile, tileRow, token, tokenStack, tokenStrip, captioned, flowRow, badge, pinBadge, pinStates, badgeLegend, trapezoid, block, keyBlock, moduleBox, chip, lane, flowTracks, caption, symbolLegend, fits, element, icon, blockedArrow, timeline, span, meaning, tagLevel };
}
