(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // kit/index.js
  var exports_kit = {};
  __export(exports_kit, {
    createKit: () => createKit
  });

  // kit/spec.js
  var exports_spec = {};
  __export(exports_spec, {
    textSize: () => textSize,
    strokeWidth: () => strokeWidth,
    scaleFor: () => scaleFor,
    printedPt: () => printedPt,
    mix: () => mix,
    formatOf: () => formatOf,
    floorPx: () => floorPx,
    aspectMiss: () => aspectMiss,
    WORDS: () => WORDS,
    TEXT: () => TEXT,
    STROKE: () => STROKE,
    SERIES: () => SERIES,
    SECONDARY_FLOOR_PCT: () => SECONDARY_FLOOR_PCT,
    SECOND: () => SECOND,
    REF_WIDTH: () => REF_WIDTH,
    RADIUS: () => RADIUS,
    PRINT_WIDTH_PT: () => PRINT_WIDTH_PT,
    PANEL: () => PANEL,
    OURS: () => OURS,
    NEUTRAL: () => NEUTRAL,
    LEVEL: () => LEVEL,
    LABEL_WORDS: () => LABEL_WORDS,
    HOLE: () => HOLE,
    FORMAT: () => FORMAT,
    FLOOR_PCT: () => FLOOR_PCT,
    DENSITY: () => DENSITY,
    CURSOR: () => CURSOR,
    CELL: () => CELL,
    BASELINE: () => BASELINE,
    BADGE: () => BADGE
  });
  var REF_WIDTH = { diagram: 1498, chart: 1248 };
  var TEXT = {
    diagram: {
      caption: 32,
      block: 32,
      group: 30,
      module: 28,
      header: 28,
      lane: 26,
      legend: 26,
      note: 22,
      chip: 22,
      data: 20,
      token: 19,
      radarLabel: 18,
      radarLegend: 16
    },
    chart: {
      group: 22,
      title: 21,
      axis: 19,
      legend: 19,
      tick: 18
    }
  };
  var FLOOR_PCT = 1.2;
  var SECONDARY_FLOOR_PCT = 1.05;
  var STROKE = {
    diagram: {
      flow: 2.8,
      flowDash: [5, 8],
      head: [10, 12],
      arrow: 2.4,
      arrowHead: 12,
      divider: 2.6,
      dividerDash: [6, 9],
      rowDivider: 2,
      module: 1.6,
      chip: 1.3,
      tile: 1.2,
      hatchWidth: 5,
      hatchPitch: 14
    },
    chart: {
      line: 2.5,
      marker: 4.5,
      markerRing: 1.4,
      grid: 1.2,
      axis: 1.5,
      tickMark: 7,
      legendLine: 2.6,
      legendBox: 1.5
    }
  };
  var PANEL = { plotWidth: [160, 260], plotHeight: 180 };
  var RADIUS = { container: 16, lane: 12, block: 12, chip: 10, legend: 10, tile: 4, pill: "half" };
  var CELL = { twoPanels: 56, threePanels: 40, gapTwoPanels: 17, gapThreePanels: 11 };
  var PRINT_WIDTH_PT = 396;
  var FORMAT = {
    column: { name: "one-column", maxPlacement: 0.75, aspect: [0.8, 1.7] },
    full: { name: "full-width", aspect: [1.8, 3.2] },
    tolerance: 0.05
  };
  var formatOf = (placement, aspect) => {
    if (aspect != null && placement > 0.7 && placement <= 0.8)
      return aspect >= 1.75 ? FORMAT.full : FORMAT.column;
    return placement <= FORMAT.column.maxPlacement ? FORMAT.column : FORMAT.full;
  };
  var WORDS = { teaser: 25, overview: 40, detail: 50, qualitative: 30, diagram: 40 };
  var LABEL_WORDS = 4;
  var LEVEL = {
    1: { name: "claim", text: "block", style: "SemiBold" },
    2: { name: "method", text: "module", style: "Medium" },
    3: { name: "context", text: "note", style: "Regular" }
  };
  var HOLE = { side: 0.08, area: 0.03 };
  var DENSITY = { minCoverage: 0.44 };
  function aspectMiss(aspect, fmt) {
    const [lo, hi] = fmt.aspect;
    const miss = aspect < lo ? lo / aspect - 1 : aspect > hi ? aspect / hi - 1 : 0;
    return miss <= FORMAT.tolerance ? 0 : miss;
  }
  function scaleFor(kind, width) {
    if (!REF_WIDTH[kind])
      throw new Error(`unknown figure kind: ${kind}`);
    return width / REF_WIDTH[kind];
  }
  function textSize(kind, role, width) {
    const base = TEXT[kind]?.[role];
    if (base == null)
      throw new Error(`unknown text role ${kind}.${role}`);
    return Math.round(base * scaleFor(kind, width) * 2) / 2;
  }
  function strokeWidth(kind, role, width) {
    const base = STROKE[kind]?.[role];
    if (typeof base !== "number")
      throw new Error(`unknown stroke role ${kind}.${role}`);
    return Math.round(base * scaleFor(kind, width) * 10) / 10;
  }
  var printedPt = (px, width, printPt = PRINT_WIDTH_PT) => px * printPt / width;
  var floorPx = (width, pct = FLOOR_PCT) => width * pct / 100;
  var NEUTRAL = {
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
    white: "#FFFFFF"
  };
  var OURS = { deep: "#197A8A", mid: "#8FC4CE", stroke: "#A6D0D8", lane: "#EBF4F6", ink: "#136570", pill: "#D3E9ED", hatch: "#197A8A", hatchAlpha: 0.55 };
  var SECOND = { deep: "#A98548", mid: "#D9BD8A", stroke: "#DCC69C", lane: "#FAF5EC", ink: "#6E5527", hatch: "#A98548", hatchAlpha: 0.7 };
  var BASELINE = { deep: "#BCC2CA", mid: "#E4E7EB", stroke: "#D5D9DE", lane: "#F5F6F8", ink: "#6B7280", hatch: "#C3C8CF", hatchAlpha: 0.7 };
  var SERIES = ["#197A8A", "#A98548", "#9AA2AD", "#6B7280", "#C3C8CF"];
  var BADGE = { frozen: "#3B82C4", trained: "#E4572E", trainedInner: "#F6B26B", size: 28 };
  var CURSOR = { red: "#E5484D", blue: "#2F6FEB" };
  function mix(hex, alpha, over = "#FFFFFF") {
    const c = (h, k) => parseInt(h.slice(k, k + 2), 16);
    return "#" + [1, 3, 5].map((k) => Math.round(c(over, k) + alpha * (c(hex, k) - c(over, k))).toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  // kit/math.js
  var exports_math = {};
  __export(exports_math, {
    tickLabel: () => tickLabel,
    rectsOverlap: () => rectsOverlap,
    radarRatios: () => radarRatios,
    niceTicks: () => niceTicks,
    insideConvex: () => insideConvex,
    highestClearY: () => highestClearY,
    hatchPath: () => hatchPath,
    fixedTicks: () => fixedTicks,
    clipHalf: () => clipHalf
  });
  function niceTicks(min, max, n = 4) {
    if (!Number.isFinite(min) || !Number.isFinite(max))
      throw new Error("niceTicks needs finite limits");
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    const mag = Math.pow(10, Math.floor(Math.log10(span / n)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n + 0.000000001);
    const lo = Math.floor(min / step + 0.000000001) * step;
    const hi = Math.ceil(max / step - 0.000000001) * step;
    const ticks = [];
    for (let v = lo;v <= hi + step * 0.000001; v += step)
      ticks.push(+v.toFixed(10));
    return { lo, hi, step, ticks };
  }
  function fixedTicks(lo, hi, step) {
    const ticks = [];
    for (let v = lo;v <= hi + step * 0.000001; v += step)
      ticks.push(+v.toFixed(10));
    return { lo, hi, step, ticks };
  }
  function tickLabel(v, step) {
    if (step >= 1 && Number.isInteger(+step.toFixed(9)))
      return String(Math.round(v));
    const s = String(+step.toFixed(9));
    const decimals = Math.min(3, (s.split(".")[1] || "").length);
    return v.toFixed(decimals);
  }
  function radarRatios(values, lowerIsBetter) {
    const ok = values.filter((v) => Number.isFinite(v));
    if (ok.length !== values.length)
      throw new Error("radar axis has a missing value");
    if (ok.some((v) => v <= 0) && lowerIsBetter)
      throw new Error("lower-is-better axis needs positive values");
    const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
    return values.map((v) => lowerIsBetter ? best / v : v / best);
  }
  function insideConvex(poly, x, y) {
    let pos = 0, neg = 0;
    for (let i = 0;i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      if (c > 0)
        pos++;
      else if (c < 0)
        neg++;
    }
    return !(pos && neg);
  }
  var rectsOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  function highestClearY({ x, y0, w, h, rects = [], poly = null, step = 2 }) {
    const hits = (y2) => {
      const box = { x, y: y2, w, h };
      if (rects.some((r) => rectsOverlap(box, r)))
        return true;
      if (!poly)
        return false;
      for (let k = 0;k <= 24; k++) {
        const s = k / 24;
        for (const [px, py] of [
          [x + s * w, y2],
          [x + s * w, y2 + h],
          [x, y2 + s * h],
          [x + w, y2 + s * h]
        ])
          if (insideConvex(poly, px, py))
            return true;
      }
      return poly.some(([px, py]) => px > x && px < x + w && py > y2 && py < y2 + h);
    };
    if (hits(y0))
      return null;
    let y = y0;
    while (y - step >= 0 && !hits(y - step))
      y -= step;
    return y;
  }
  function clipHalf(poly, f) {
    const out = [];
    for (let i = 0;i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P), fq = f(Q);
      if (fp >= 0)
        out.push(P);
      if (fp >= 0 !== fq >= 0) {
        const t = fp / (fp - fq);
        out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
      }
    }
    return out;
  }
  function hatchPath(s, { width = 5, pitch = 14, inset = 1.2 } = {}) {
    const hw = width / 2 * Math.SQRT2;
    let d = "";
    for (let c = 0;c <= 2 * s; c += pitch) {
      let poly = [
        [inset, inset],
        [s - inset, inset],
        [s - inset, s - inset],
        [inset, s - inset]
      ];
      poly = clipHalf(poly, (p) => p[0] + p[1] - (c - hw));
      poly = clipHalf(poly, (p) => c + hw - (p[0] + p[1]));
      if (poly.length >= 3)
        d += "M" + poly.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" L") + " Z ";
    }
    return d.trim();
  }

  // kit/core.js
  var FONT = { sans: "Google Sans Flex", mono: "Google Sans Code", arrow: "Roboto" };
  var ARROWS = /[←-↓⇐-⇓]/g;
  function createCore(figma) {
    const hex = (h) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(h))
        throw new Error(`colour must be #RRGGBB: ${h}`);
      return { r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 };
    };
    const paint = (h) => [{ type: "SOLID", color: hex(h) }];
    const unnest = () => figma.clientStorage.getAsync("p2f-unnest");
    async function init({ extra = [] } = {}) {
      const want = [
        [FONT.sans, ["Regular", "Medium", "SemiBold", "Bold"]],
        [FONT.mono, ["Regular", "Medium", "SemiBold"]],
        [FONT.arrow, ["Regular", "Medium"]],
        ...extra
      ].flatMap(([family, styles]) => styles.map((style) => ({ family, style })));
      const loads = await Promise.allSettled(want.map((f) => figma.loadFontAsync(f)));
      const missing = want.filter((_, i) => loads[i].status === "rejected").map((f) => `${f.family} ${f.style}`);
      if (missing.some((m) => m.startsWith(FONT.sans)))
        throw new Error(`Font missing in Figma: ${missing.join(", ")}. Install Google Sans Flex.`);
      await unnest();
      return { missing };
    }
    function AL(name, dir, o = {}) {
      const f = figma.createFrame();
      f.name = name;
      if (o.w || o.h)
        f.resize(o.w || 1, o.h || 1);
      f.layoutMode = dir;
      f.fills = o.fill ? paint(o.fill) : [];
      if (o.stroke) {
        f.strokes = paint(o.stroke);
        f.strokeWeight = o.sw || 1.5;
        f.strokeAlign = "INSIDE";
        if (o.dash)
          f.dashPattern = o.dash;
      }
      f.itemSpacing = o.gap || 0;
      const p = o.pad || 0;
      const [pt, pr, pb, pl] = Array.isArray(p) ? p : [p, p, p, p];
      Object.assign(f, { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl });
      f.cornerRadius = o.r || 0;
      f.primaryAxisAlignItems = o.main || "CENTER";
      f.counterAxisAlignItems = o.cross || "CENTER";
      const H = dir === "HORIZONTAL";
      f.primaryAxisSizingMode = (H ? o.w : o.h) ? "FIXED" : "AUTO";
      f.counterAxisSizingMode = (H ? o.h : o.w) ? "FIXED" : "AUTO";
      f.clipsContent = false;
      return f;
    }
    const add = (parent, ...kids) => {
      for (const k of kids)
        if (k)
          parent.appendChild(k);
      return parent;
    };
    function box(name, w, h) {
      const f = figma.createFrame();
      f.name = name;
      f.resize(Math.max(1, w), Math.max(1, h));
      f.fills = [];
      f.clipsContent = false;
      return f;
    }
    function spacer(w, h) {
      const f = box("spacer", w, h);
      return f;
    }
    function T(str, size, o = {}) {
      const t = figma.createText();
      const family = o.mono ? FONT.mono : FONT.sans;
      t.fontName = { family, style: o.style || "Regular" };
      t.characters = String(str);
      t.fontSize = size;
      t.fills = paint(o.color || NEUTRAL.ink);
      t.textAlignHorizontal = o.align || "CENTER";
      if (o.lineHeight)
        t.lineHeight = { value: o.lineHeight, unit: "PERCENT" };
      if (o.w) {
        t.textAutoResize = "HEIGHT";
        t.resize(o.w, t.height);
      } else
        t.textAutoResize = "WIDTH_AND_HEIGHT";
      t.name = o.name || String(str).slice(0, 60);
      for (const m of String(str).matchAll(ARROWS)) {
        const w0 = t.width;
        t.setRangeFontName(m.index, m.index + 1, { family: FONT.arrow, style: o.style === "Regular" || !o.style ? "Regular" : "Medium" });
        if (o.keepCentre)
          t.x -= (t.width - w0) / 2;
      }
      return t;
    }
    const TM = (str, size, o = {}) => T(str, size, { ...o, mono: true });
    function textWidth(str, size, o = {}) {
      const t = T(str, size, o);
      const w = t.width;
      t.remove();
      return w;
    }
    function colourRanges(t, ranges) {
      for (const [a, b, c, style] of ranges) {
        t.setRangeFills(a, b, paint(c));
        if (style)
          t.setRangeFontName(a, b, { family: t.fontName.family, style });
      }
      return t;
    }
    function svg(markup, name) {
      if (/fill-opacity|stroke-opacity|opacity=/.test(markup))
        throw new Error(`svg "${name}" uses transparency; blend the colour with mix() instead`);
      const n = figma.createNodeFromSvg(markup);
      n.name = name || "vector";
      n.clipsContent = false;
      return n;
    }
    function rect(w, h, fill, r = 0, name = "rect") {
      const x = figma.createRectangle();
      x.name = name;
      x.resize(Math.max(0.01, w), Math.max(0.01, h));
      x.fills = fill ? paint(fill) : [];
      x.cornerRadius = r;
      return x;
    }
    function dashedLine(length, orient, { color = NEUTRAL.divider, width = 2.6, dash = [6, 9] } = {}) {
      const L = Math.max(4, length);
      const d = orient === "v" ? `M2 1.5 V${L - 1.5}` : `M1.5 2 H${L - 1.5}`;
      const [w, h] = orient === "v" ? [4, L] : [L, 4];
      return svg(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><path d="${d}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash.join(" ")}" stroke-linecap="round"/></svg>`, orient === "v" ? "divider (vertical)" : "divider");
    }
    function arrow(length, { orient = "h", color = OURS.deep, width = 2.4, head = 12, dashed = false, dash = [5, 8] } = {}) {
      if (orient === "down" || orient === "left") {
        const n = arrow(length, { orient: orient === "down" ? "v" : "h", color, width, head, dashed, dash });
        const f = box("arrow " + orient, n.width, n.height);
        f.appendChild(n);
        n.rotation = 180;
        n.x = n.width;
        n.y = n.height;
        return f;
      }
      if (orient === "right")
        orient = "h";
      if (orient === "up")
        orient = "v";
      const L = Math.max(head + 4, length), hw = head / 2 + 1;
      const body = orient === "h" ? `M1.5 ${hw} H${L - head}` : `M${hw} ${L - 1.5} V${head}`;
      const tip = orient === "h" ? `M${L - 1} ${hw} L${L - head - 2} ${hw - head / 2} L${L - head - 2} ${hw + head / 2} Z` : `M${hw} 1 L${hw - head / 2} ${head + 2} L${hw + head / 2} ${head + 2} Z`;
      const [w, h] = orient === "h" ? [L, 2 * hw] : [2 * hw, L];
      return svg(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><path d="${body}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dashed ? ` stroke-dasharray="${dash.join(" ")}"` : ""}/><path d="${tip}" fill="${color}"/></svg>`, "arrow");
    }
    function absolute(parent, node, x, y, index) {
      if (index == null)
        parent.appendChild(node);
      else
        parent.insertChild(index, node);
      if (parent.layoutMode && parent.layoutMode !== "NONE")
        node.layoutPositioning = "ABSOLUTE";
      node.x = x;
      node.y = y;
      return node;
    }
    const rel = (node, ref) => {
      const a = node.absoluteBoundingBox, b = ref.absoluteBoundingBox;
      return { x: a.x - b.x, y: a.y - b.y, w: a.width, h: a.height };
    };
    async function page(name) {
      const p = name ? figma.root.children.find((c) => c.name === name) : figma.currentPage;
      if (!p)
        throw new Error(`page not found: ${name}`);
      await p.loadAsync();
      return p;
    }
    const meanings = new Map;
    async function place(root, { pageName, name = root.name, x, y, replace = true, declaredWidth, placement, kind, type } = {}) {
      const p = await page(pageName);
      const prev = p.children.find((n) => n.name === name && n !== root);
      let px = x, py = y;
      if (prev) {
        px ??= prev.x;
        py ??= prev.y;
        if (replace)
          prev.remove();
      }
      if (px == null) {
        px = Math.max(0, ...p.children.filter((n) => n !== root && ("width" in n)).map((n) => n.x + n.width)) + 200;
        py = 0;
      }
      p.appendChild(root);
      root.x = px;
      root.y = py ?? 0;
      const out = { id: root.id, x: root.x, y: root.y, w: Math.round(root.width), h: Math.round(root.height), aspect: +(root.width / root.height).toFixed(2), replaced: !!(prev && replace) };
      const meta = readMeta(root);
      if (declaredWidth)
        meta.placement = Math.min(1, Math.ceil(root.width / declaredWidth * 100) / 100);
      if (placement)
        meta.placement = placement;
      if (kind)
        meta.kind = kind;
      if (type)
        meta.type = type;
      if (meanings.size) {
        meta.meanings = Object.fromEntries(meanings);
        meanings.clear();
      }
      meta.kind ||= "diagram";
      root.setSharedPluginData("p2f", "meta", JSON.stringify(meta));
      if (meta.placement)
        out.latexWidth = `${meta.placement}\\linewidth`;
      out.kind = meta.kind;
      return out;
    }
    async function preloadImages(node) {
      let n = 0;
      for (const nd of node.findAll((c) => ("fills" in c) && Array.isArray(c.fills)))
        for (const f of nd.fills)
          if (f.type === "IMAGE" && f.imageHash) {
            await figma.getImageByHash(f.imageHash).getSizeAsync();
            n++;
          }
      return n;
    }
    async function prepareExport(node) {
      const images = await preloadImages(node);
      const fonts = new Map;
      for (const t of node.findAll((c) => c.type === "TEXT"))
        for (const s of t.getStyledTextSegments(["fontName"]))
          fonts.set(`${s.fontName.family}|${s.fontName.style}`, s.fontName);
      await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));
      await unnest();
      await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 0.05 } });
      await unnest();
      return { images, fonts: fonts.size };
    }
    function imageRect(base64, w, name = "image") {
      const img = figma.createImage(figma.base64Decode(base64));
      const r = figma.createRectangle();
      r.name = name;
      r.fills = [{ type: "IMAGE", imageHash: img.hash, scaleMode: "FILL" }];
      return { rect: r, hash: img.hash, fit: async () => {
        const { width, height } = await img.getSizeAsync();
        r.resize(w, w * height / width);
        return r;
      } };
    }
    function readMeta(node) {
      try {
        return JSON.parse(node.getSharedPluginData("p2f", "meta") || "{}");
      } catch {
        return {};
      }
    }
    function inspect(root) {
      const rb = root.absoluteBoundingBox;
      const out = [];
      for (const n of [root, ...root.findAll(() => true)]) {
        const r = { id: n.id, type: n.type, name: n.name, parentId: n.parent?.id };
        const level = n.getSharedPluginData("p2f", "level"), badge = n.getSharedPluginData("p2f", "badge");
        if (level)
          r.level = +level;
        if (badge)
          r.badge = badge;
        const iconKind = n.getSharedPluginData("p2f", "icon"), blocked = n.getSharedPluginData("p2f", "blocked");
        if (iconKind)
          Object.assign(r, { icon: iconKind, named: n.getSharedPluginData("p2f", "named") === "1" });
        if (blocked)
          r.blocked = +blocked;
        if (n.type === "FRAME" && (Array.isArray(n.fills) && n.fills.some((f) => f.visible !== false) || Array.isArray(n.strokes) && n.strokes.length))
          r.boxed = true;
        if (n !== root) {
          const up = [];
          for (let q = n.parent;q && q !== root; q = q.parent)
            up.unshift(q.name);
          r.path = up.join(" / ");
        }
        if (n.absoluteBoundingBox) {
          const b = n.absoluteBoundingBox;
          Object.assign(r, { x: b.x - rb.x, y: b.y - rb.y, w: b.width, h: b.height });
        }
        if ("clipsContent" in n)
          r.clipsContent = n.clipsContent;
        if ("opacity" in n && n.opacity !== 1)
          r.opacity = n.opacity;
        if (typeof n.cornerRadius === "number" && n.cornerRadius > 0)
          r.cornerRadius = n.cornerRadius;
        if ("strokeWeight" in n && typeof n.strokeWeight === "number" && Array.isArray(n.strokes) && n.strokes.length)
          r.strokeWeight = n.strokeWeight;
        if (Array.isArray(n.fills))
          r.fills = n.fills.filter((f) => f.visible !== false).map((f) => f.type === "SOLID" ? { type: "SOLID", hex: "#" + ["r", "g", "b"].map((c) => Math.round(f.color[c] * 255).toString(16).padStart(2, "0")).join("").toUpperCase(), opacity: f.opacity ?? 1 } : { type: f.type });
        if (n.type === "TEXT")
          r.segments = n.getStyledTextSegments(["fontSize", "fontName"]).map((s) => ({ text: s.characters, size: s.fontSize, family: s.fontName.family, style: s.fontName.style }));
        out.push(r);
      }
      return { id: root.id, name: root.name, width: root.width, height: root.height, meta: readMeta(root), nodes: out };
    }
    function sizes(kind, width) {
      const out = {};
      for (const role of Object.keys(TEXT[kind]))
        out[role] = textSize(kind, role, width);
      return out;
    }
    function strokes(kind, width) {
      const out = {};
      for (const [role, v] of Object.entries(STROKE[kind]))
        out[role] = typeof v === "number" ? strokeWidth(kind, role, width) : v;
      return out;
    }
    return { meanings, hex, paint, init, unnest, inspect, AL, add, box, spacer, T, TM, textWidth, colourRanges, svg, rect, dashedLine, arrow, absolute, rel, page, place, preloadImages, prepareExport, imageRect, sizes, strokes };
  }

  // kit/charts.js
  function createCharts(core) {
    const { AL, add, box, T, svg, rect, absolute, sizes, strokes } = core;
    const geom = (k) => ({ ML: 46 * k, MR: 10 * k, MT: 34 * k, MB: 54 * k, MB1: 30 * k, GAP: 10 * k, GG: 23 * k, BAND: 50 * k, BGAP: 22 * k });
    const pointsOf = (arr) => arr.map((p) => Array.isArray(p) ? { x: +p[0], y: +p[1] } : { x: +p.x, y: +p.y }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => a.x - b.x);
    function marker(color, x, y, st) {
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${st.marker}" fill="${color}" stroke="#FFFFFF" stroke-width="${st.markerRing}"/>`;
    }
    function linePanel(title, series, opts = {}) {
      const W = opts.width || REF_WIDTH.chart, k = W / REF_WIDTH.chart, Z = sizes("chart", W), st = strokes("chart", W), G = geom(k);
      const pw = opts.pw || 238 * k, ph = opts.ph || 180 * k, { ML, MR, MT } = G;
      const MB = opts.noXTitle ? G.MB1 : G.MB;
      const f = box(title, ML + pw + MR, MT + ph + MB);
      const XT = opts.xTicks, t0 = XT[0], t1 = XT[XT.length - 1];
      const X = (t) => ML + (t - t0) / (t1 - t0) * pw;
      const { breakAbove: brk, clip } = opts;
      const mainTop = brk != null ? MT + G.BAND + G.BGAP : MT, mainH = MT + ph - mainTop;
      const inMain = (v) => (brk == null || v <= brk) && (clip == null || v <= clip);
      const vals = [], outl = [];
      for (const s of series)
        for (const p of s.points)
          (inMain(p.y) ? vals : outl).push(p.y);
      if (!vals.length)
        throw new Error(`panel "${title}" has no data in the main range`);
      let ny;
      if (opts.range)
        ny = fixedTicks(...opts.range);
      else {
        const mn = Math.min(...vals), mx = Math.max(...vals), pv = (mx - mn) * (opts.tight ? 0.025 : 0.1) || 1;
        ny = niceTicks(mn - pv, mx + pv, opts.tight ? 5 : 4);
      }
      let Y = (v) => mainTop + mainH - (v - ny.lo) / (ny.hi - ny.lo) * mainH;
      let yTicks = ny.ticks.map((t) => [t, tickLabel(t, ny.step)]);
      if (opts.log) {
        const L = Math.log, { lo, hi, ticks } = opts.log;
        Y = (v) => mainTop + mainH - (L(v) - L(lo)) / (L(hi) - L(lo)) * mainH;
        yTicks = ticks.map((t) => [t, String(t)]);
      }
      if (brk != null)
        yTicks = yTicks.filter(([t]) => t <= brk + 0.000000001);
      let YB = null, bTicks = [];
      if (outl.length && brk != null) {
        const bmn = Math.min(...outl), bmx = Math.max(...outl), pad = (bmx - bmn) * 0.06 + 0.000000001;
        const bLo = bmn - pad, bHi = bmx + pad;
        YB = (v) => MT + G.BAND - (v - bLo) / (bHi - bLo) * G.BAND;
        bTicks = opts.bandTicks || [...new Set([Math.round(bmn / 10) * 10, Math.round(bmx / 10) * 10])];
      }
      let d = "";
      for (const [t] of yTicks)
        d += `<path d="M${ML} ${Y(t).toFixed(2)} H${ML + pw}" stroke="${NEUTRAL.grid}" stroke-width="${st.grid}"/>`;
      for (const t of bTicks)
        d += `<path d="M${ML} ${YB(t).toFixed(2)} H${ML + pw}" stroke="${NEUTRAL.grid}" stroke-width="${st.grid}"/>`;
      d += `<path d="M${ML} ${MT} V${MT + ph}" stroke="${NEUTRAL.axis}" stroke-width="${st.axis}"/>`;
      let lines = "", marks = "";
      const ordered = [...series.filter((s) => !s.ours), ...series.filter((s) => s.ours)];
      for (const s of ordered) {
        let path = "";
        for (let i = 0;i < s.points.length - 1; i++) {
          const a = s.points[i], b = s.points[i + 1], ma = inMain(a.y), mb = inMain(b.y);
          if (ma && mb)
            path += `M${X(a.x).toFixed(2)} ${Y(a.y).toFixed(2)} L${X(b.x).toFixed(2)} ${Y(b.y).toFixed(2)} `;
          else if (!ma && !mb) {
            if (brk != null)
              path += `M${X(a.x).toFixed(2)} ${YB(a.y).toFixed(2)} L${X(b.x).toFixed(2)} ${YB(b.y).toFixed(2)} `;
          } else {
            const [hi, lo] = ma ? [b, a] : [a, b];
            if (clip != null) {
              const at = X(hi.x) + (hi.y - clip) / (hi.y - lo.y) * (X(lo.x) - X(hi.x));
              path += `M${at.toFixed(2)} ${Y(clip).toFixed(2)} L${X(lo.x).toFixed(2)} ${Y(lo.y).toFixed(2)} `;
            } else
              path += `M${X(hi.x).toFixed(2)} ${YB(hi.y).toFixed(2)} L${X(lo.x).toFixed(2)} ${Y(lo.y).toFixed(2)} `;
          }
        }
        if (path)
          lines += `<path d="${path}" stroke="${s.color}" stroke-width="${st.line}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        for (const p of s.points) {
          if (!inMain(p.y) && clip != null)
            continue;
          marks += marker(s.color, X(p.x), inMain(p.y) ? Y(p.y) : YB(p.y), st);
        }
      }
      d += lines;
      if (brk != null) {
        const yc = MT + G.BAND + G.BGAP / 2, x0 = ML - 7 * k, x1 = ML + pw + 3 * k, wl = 7 * k, amp = 2 * k;
        const wave = (y) => {
          let p = `M${x0.toFixed(2)} ${y.toFixed(2)}`;
          for (let x = x0;x < x1 - 0.000001; x += wl)
            p += ` q${(wl / 4).toFixed(2)} ${(-amp).toFixed(2)} ${(wl / 2).toFixed(2)} 0 t${(wl / 2).toFixed(2)} 0`;
          return p;
        };
        d += `<path d="${wave(yc)}" stroke="#FFFFFF" stroke-width="${7 * k}" fill="none"/>`;
        for (const dy of [-3.5 * k, 3.5 * k])
          d += `<path d="${wave(yc + dy)}" stroke="#9CA3AF" stroke-width="${1.1 * k}" fill="none"/>`;
      }
      d += marks;
      d += `<path d="M${ML} ${MT + ph} H${ML + pw}" stroke="${NEUTRAL.axis}" stroke-width="${st.axis}"/>`;
      for (const t of XT)
        d += `<path d="M${X(t).toFixed(2)} ${MT + ph} V${MT + ph - st.tickMark}" stroke="${NEUTRAL.axis}" stroke-width="${st.axis}" stroke-linecap="round"/>`;
      const Wd = ML + pw + MR, Hd = MT + ph + 4 * k;
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
      put(title + arrowGlyph, Z.title, NEUTRAL.title, ML + pw / 2, 14 * k, "center", "Medium");
      for (const [t, lab] of yTicks)
        put(lab, Z.tick, NEUTRAL.tick, ML - 7 * k, Y(t), "right");
      for (const t of bTicks)
        put(String(t), Z.tick, NEUTRAL.tick, ML - 7 * k, YB(t), "right");
      for (const t of XT)
        put(String(t), Z.tick, NEUTRAL.tick, X(t), MT + ph + 15 * k, "center");
      if (!opts.noXTitle && opts.xTitle)
        put(opts.xTitle, Z.axis, NEUTRAL.axisTitle, ML + pw / 2, MT + ph + 40 * k, "center");
      return f;
    }
    function barPanel(title, cats, series, opts = {}) {
      const W = opts.width || REF_WIDTH.chart, k = W / REF_WIDTH.chart, Z = sizes("chart", W), st = strokes("chart", W), G = geom(k);
      const named = cats.some((c) => String(c).trim()), xTitle = opts.noXTitle ? null : opts.xTitle;
      const pw = opts.pw || 238 * k, ph = opts.ph || 180 * k, { ML, MR, MT } = G, MB = (named ? G.MB1 : 12 * k) + (xTitle ? 26 * k : 0);
      const f = box(title, ML + pw + MR, MT + ph + MB);
      const all = series.flatMap((s) => s.values).filter(Number.isFinite);
      const ny = opts.range ? fixedTicks(...opts.range) : niceTicks(0, Math.max(...all) * 1.12, 4);
      const Y = (v) => MT + ph - (v - ny.lo) / (ny.hi - ny.lo) * ph;
      const slot = pw / cats.length, inner = slot * 0.78, bw = inner / series.length;
      let d = "";
      for (const t of ny.ticks)
        d += `<path d="M${ML} ${Y(t).toFixed(2)} H${ML + pw}" stroke="${NEUTRAL.grid}" stroke-width="${st.grid}"/>`;
      const labels = [];
      cats.forEach((c, ci) => {
        series.forEach((s, si) => {
          const v = s.values[ci];
          if (!Number.isFinite(v))
            return;
          const x = ML + ci * slot + (slot - inner) / 2 + si * bw;
          d += `<rect x="${(x + 1).toFixed(2)}" y="${Y(v).toFixed(2)}" width="${(bw - 2).toFixed(2)}" height="${(Y(ny.lo) - Y(v)).toFixed(2)}" fill="${s.color}"/>`;
          labels.push([s.labels?.[ci] ?? (opts.format ? opts.format(v) : String(v)), x + bw / 2, Y(v) - 10 * k]);
        });
      });
      d += `<path d="M${ML} ${MT} V${MT + ph}" stroke="${NEUTRAL.axis}" stroke-width="${st.axis}"/><path d="M${ML} ${MT + ph} H${ML + pw}" stroke="${NEUTRAL.axis}" stroke-width="${st.axis}"/>`;
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
      put(title + arrowGlyph, Z.title, NEUTRAL.title, ML + pw / 2, 14 * k, "center", "Medium");
      for (const t of ny.ticks)
        put(tickLabel(t, ny.step), Z.tick, NEUTRAL.tick, ML - 7 * k, Y(t), "right");
      const vSize = Math.max(floorPx(W), Z.tick * 0.85);
      const placed = labels.map(([s, x, y]) => put(s, vSize, NEUTRAL.ink, x, y, "center")).sort((a, b) => a.x - b.x);
      const touch = placed.some((t, i) => i && placed[i - 1].x + placed[i - 1].width + 3 * k > t.x);
      if (touch)
        placed.forEach((t, i) => i % 2 && (t.y -= t.height * 0.95));
      if (named)
        cats.forEach((c, ci) => put(c, Z.tick, NEUTRAL.tick, ML + ci * slot + slot / 2, MT + ph + 15 * k, "center"));
      if (xTitle)
        put(xTitle, Z.axis, NEUTRAL.axisTitle, ML + pw / 2, MT + ph + (named ? 42 : 24) * k, "center");
      return f;
    }
    function legend(methods, { width = REF_WIDTH.chart, kind = "chart", mode = "row", boxed = true, title, size, symbol = "line" } = {}) {
      const k = width / REF_WIDTH[kind], st = strokes("chart", kind === "chart" ? width : width * REF_WIDTH.chart / REF_WIDTH.diagram);
      const fs = size || textSize(kind, "legend", width);
      const col = mode === "column";
      const box_ = AL("legend", col ? "VERTICAL" : "HORIZONTAL", boxed ? { gap: col ? 12 * k : 16 * k, pad: col ? [12 * k, 14 * k, 13 * k, 14 * k] : [7 * k, 12 * k, 7 * k, 12 * k], fill: "#FFFFFF", stroke: NEUTRAL.rule, sw: st.legendBox, r: RADIUS.legend * k, cross: col ? "MIN" : "CENTER" } : { gap: col ? 8 * k : 16 * k, cross: col ? "MIN" : "CENTER" });
      if (title)
        box_.appendChild(T(title, fs, { color: NEUTRAL.title, style: "SemiBold" }));
      const L = 30 * k, H = 16 * k;
      for (const m of methods) {
        const sample = symbol === "bar" ? rect(H, H, m.color, 2 * k, "sample") : svg(`<svg width="${L.toFixed(2)}" height="${H.toFixed(2)}" viewBox="0 0 ${L.toFixed(2)} ${H.toFixed(2)}" fill="none"><path d="M${(2 * k).toFixed(2)} ${(H / 2).toFixed(2)} H${(L - 2 * k).toFixed(2)}" stroke="${m.color}" stroke-width="${st.legendLine}" stroke-linecap="round"/>${marker(m.color, L / 2, H / 2, { marker: st.marker * 0.9, markerRing: st.markerRing })}</svg>`, "sample");
        box_.appendChild(add(AL("item", "HORIZONTAL", { gap: 7 * k }), sample, T(m.label, fs, { color: "#222222" })));
      }
      return box_;
    }
    function group(title, rows, { width, rowGap, colGap, cellW, trimLeft = 0, trimRight = 0 }) {
      const k = width / REF_WIDTH.chart, G = geom(k), Z = sizes("chart", width);
      const g = AL(title, "VERTICAL", { gap: 10 * k, cross: "MIN" });
      const head = AL("header", "VERTICAL", { w: cellW, pad: [0, G.MR - trimRight, 0, G.ML - trimLeft], gap: 6 * k, cross: "CENTER" });
      const inner = cellW - G.ML - G.MR + trimLeft + trimRight;
      let t = T(title, Z.group, { color: NEUTRAL.title, style: "SemiBold" });
      if (t.width > cellW) {
        t.remove();
        t = T(title, Z.group, { color: NEUTRAL.title, style: "SemiBold", w: Math.max(inner, cellW - 4 * k) });
      }
      add(head, t, rect(inner, 1.5 * k, NEUTRAL.rule, 0, "rule"));
      const body = AL("panels", "VERTICAL", { gap: rowGap, cross: "MIN" });
      for (const r of rows)
        body.appendChild(add(AL("row", "HORIZONTAL", { gap: colGap, cross: "MIN" }), ...r));
      return add(g, head, body);
    }
    function chartFigure(spec) {
      const W = spec.width || REF_WIDTH.chart, SW = W / (spec.placement || 1), k = SW / REF_WIDTH.chart, G = geom(k);
      const methods = spec.methods.map((m, i) => ({ ...m, color: m.color || SERIES[i] || NEUTRAL.muted }));
      const byId = Object.fromEntries(methods.map((m) => [m.id, m]));
      const groups = spec.groups;
      const rowsOf = (g) => Math.ceil(g.panels.length / (g.columns || 1));
      const nRows = Math.max(...groups.map(rowsOf));
      const legendSpec = spec.legend || { placement: "bottom" };
      const legendMethods = [...methods].sort((a, b) => (b.ours ? 1 : 0) - (a.ours ? 1 : 0));
      const symbol = groups.every((g) => g.panels.every((p) => p.type === "bar")) ? "bar" : "line";
      let lg = null, legendGroup = -1;
      if (legendSpec.placement === "cell") {
        legendGroup = groups.findIndex((g) => (g.columns || 1) === 1 && g.panels.length < nRows);
        lg = legend(legendMethods, { width: SW, mode: "column", boxed: true, title: legendSpec.title, symbol });
      }
      const colsOf = (g) => g.columns || 1;
      const totalCols = groups.reduce((a, g) => a + colsOf(g), 0);
      const fixedW = 2 + (groups.length - 1) * G.GG + groups.reduce((a, g) => a + colsOf(g) * (G.ML + G.MR) + (colsOf(g) - 1) * G.GAP, 0);
      let pw = Math.floor((W - fixedW) / totalCols), pwL = pw;
      const INSET = 20 * k;
      if (lg && legendGroup >= 0) {
        pwL = Math.max(pw, Math.ceil(INSET + lg.width - G.ML));
        pw = Math.floor((W - fixedW - pwL) / (totalCols - 1));
      }
      const ph = (spec.panelHeight || 180) * k;
      const xTicks = spec.x?.ticks;
      const panelRows = groups.map((g, gi) => {
        const cols = colsOf(g), gpw = gi === legendGroup ? pwL : pw, rows = [];
        g.panels.forEach((p, pi) => {
          const r = Math.floor(pi / cols);
          const opts = { width: SW, pw: gpw, ph, xTicks: p.xTicks || xTicks, xTitle: p.xTitle ?? spec.x?.title, noXTitle: pi + cols < g.panels.length || gi === legendGroup, better: p.better, tight: p.tight, log: p.log, breakAbove: p.breakAbove, bandTicks: p.bandTicks, range: p.range, clip: p.clip };
          let panel;
          const order = (s) => legendMethods.findIndex((m) => m.id === s.method);
          if (p.type === "bar")
            panel = barPanel(p.title, p.categories, [...p.series].sort((a, b) => order(a) - order(b)).map((s) => ({ ...byId[s.method], values: s.values.map((v) => v && typeof v === "object" ? v.value : v), labels: s.values.map((v) => v && typeof v === "object" && v.label ? v.label : null) })), opts);
          else
            panel = linePanel(p.title, Object.entries(p.series).map(([id, pts]) => {
              if (!byId[id])
                throw new Error(`panel "${p.title}": unknown method ${id}`);
              return { ...byId[id], points: pointsOf(pts) };
            }), opts);
          (rows[r] ||= []).push(panel);
        });
        return rows;
      });
      if (legendGroup >= 0) {
        const ri = panelRows[legendGroup].length;
        const beside = panelRows.flatMap((rows, gi) => gi === legendGroup ? [] : rows[ri] || []).map((p) => p.height);
        const h = Math.max(G.MT + lg.height, beside.length ? Math.max(...beside) : G.MT + ph + G.MB1);
        const cell = AL("legend cell", "HORIZONTAL", { w: G.ML + pwL + G.MR, h, pad: [G.MT, 0, 0, INSET], main: "MIN" });
        cell.appendChild(lg);
        panelRows[legendGroup].push([cell]);
      }
      const EDGE = 2 * k, last = groups.length - 1, isCell = (p) => p.name === "legend cell";
      const leftCol = panelRows[0].map((r) => r[0]);
      const rightCol = panelRows[last].filter((r) => r.length === colsOf(groups[last]) || isCell(r[0])).map((r) => r[r.length - 1]);
      const parts = (p) => p.children.flatMap((c) => c.type === "FRAME" && ("children" in c) ? c.children.map((v) => ({ x: c.x + v.x, w: v.width })) : [{ x: c.x, w: c.width }]);
      const inkL = (p) => isCell(p) ? p.paddingLeft : Math.min(...parts(p).map((q) => q.x));
      const inkR = (p) => isCell(p) ? G.MR : p.width - Math.max(...parts(p).map((q) => q.x + q.w));
      const trimL = Math.max(0, Math.floor(Math.min(...leftCol.map(inkL)) - EDGE));
      const trimR = Math.max(0, Math.floor(Math.min(...rightCol.map(inkR)) - EDGE));
      for (const p of leftCol) {
        if (isCell(p))
          p.paddingLeft -= trimL;
        else
          for (const c of p.children) {
            if (c.type === "FRAME" && "children" in c) {
              for (const v of c.children)
                v.x -= trimL;
              c.resizeWithoutConstraints(c.width - trimL, c.height);
            } else
              c.x -= trimL;
          }
        p.resizeWithoutConstraints(p.width - trimL, p.height);
      }
      for (const p of rightCol) {
        const w = p.width - trimR;
        if (!isCell(p)) {
          for (const c of p.children)
            if (c.type === "FRAME" && c.x + c.width > w)
              c.resizeWithoutConstraints(w - c.x, c.height);
        }
        p.resizeWithoutConstraints(w, p.height);
      }
      const built = groups.map((g, gi) => {
        const cols = colsOf(g), gpw = gi === legendGroup ? pwL : pw, tl = gi === 0 ? trimL : 0, tr = gi === last ? trimR : 0;
        return group(g.title, panelRows[gi], { width: SW, rowGap: 18 * k, colGap: G.GAP, cellW: cols * (G.ML + gpw + G.MR) + (cols - 1) * G.GAP - tl - tr, trimLeft: tl, trimRight: tr });
      });
      const root = AL(spec.name, "VERTICAL", { fill: "#FFFFFF", pad: 1, gap: 16 * k, cross: "CENTER" });
      const row = AL("groups", "HORIZONTAL", { gap: G.GG, cross: "MIN" });
      for (const b of built)
        row.appendChild(b);
      root.appendChild(row);
      if (groups.length > 1)
        row.itemSpacing = Math.max(12 * k, G.GG + (W - trimL - trimR - 2 - row.width) / (groups.length - 1));
      if (legendSpec.placement === "bottom") {
        const lg2 = legend(legendMethods, { width: SW, mode: "row", boxed: true, title: legendSpec.title, symbol });
        root.appendChild(lg2);
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
    function radar({ axes, methods, W, H, legendTitle, legendMode = "corner", figureWidth = REF_WIDTH.diagram, chartWidth, compact = false }) {
      const cw = chartWidth ?? figureWidth * REF_WIDTH.chart / REF_WIDTH.diagram;
      const kc = cw / REF_WIDTH.chart;
      const k = compact ? figureWidth / REF_WIDTH.diagram : kc;
      const FS_AX = compact ? textSize("diagram", "radarLabel", figureWidth) : textSize("chart", "title", cw), FS_LEG = compact ? textSize("diagram", "radarLegend", figureWidth) : textSize("chart", "legend", cw), OFF = 8 * k;
      const st = strokes("chart", cw);
      const LN = compact ? { ours: 2.8 * k, other: 2.4 * k, marker: 4.5 * k, ring: 1.4 * k, grid: 1.2 * k, rim: 1.5 * k } : { ours: st.line * 1.2, other: st.line, marker: st.marker, ring: st.markerRing, grid: st.grid, rim: st.axis };
      const N = axes.length, ux = (i) => Math.sin(2 * Math.PI * i / N), uy = (i) => -Math.cos(2 * Math.PI * i / N);
      const ms = methods.map((m, i) => ({ ...m, color: m.color || SERIES[i] }));
      const ratio = axes.map((a) => radarRatios(ms.map((m) => a.values[m.id]), a.better === "lower"));
      const labs = axes.map((a) => T(`${a.label} ${a.better === "lower" ? "↓" : "↑"}`, FS_AX, { color: NEUTRAL.sub }));
      const ext = (R2) => {
        let x02 = -R2 - 6, x12 = R2 + 6, y0 = -R2 - 6, y1 = R2 + 6;
        labs.forEach((t, i) => {
          const ax = (R2 + OFF) * ux(i), ay = (R2 + OFF) * uy(i), w = t.width, h = t.height;
          const lx = Math.abs(ux(i)) < 0.3 ? ax - w / 2 : ux(i) > 0 ? ax : ax - w;
          const ly = Math.abs(uy(i)) > 0.9 ? uy(i) < 0 ? ay - h : ay : ay - h / 2;
          x02 = Math.min(x02, lx);
          x12 = Math.max(x12, lx + w + 0.35 * FS_AX);
          y0 = Math.min(y0, ly);
          y1 = Math.max(y1, ly + h);
        });
        return { x0: x02, x1: x12, y0, y1 };
      };
      let lg = null;
      if (legendMode !== "none") {
        lg = AL("radar legend", "VERTICAL", { gap: 4 * k, pad: [8 * k, 12 * k, 9 * k, 12 * k], fill: "#FFFFFF", stroke: NEUTRAL.rule, sw: 1.2 * k, r: 8 * k, cross: "MIN" });
        if (legendTitle)
          lg.appendChild(T(legendTitle, FS_LEG, { color: NEUTRAL.title, style: "SemiBold" }));
        for (const m of [...ms].sort((a, b) => (b.ours ? 1 : 0) - (a.ours ? 1 : 0))) {
          const L = 30 * k, Hh = 14 * k;
          const smp = svg(`<svg width="${L}" height="${Hh}" viewBox="0 0 ${L} ${Hh}" fill="none"><path d="M${1.5 * k} ${Hh / 2} H${L - 1.5 * k}" stroke="${m.color}" stroke-width="${LN.other * 0.95}" stroke-linecap="round"/>${marker(m.color, L / 2, Hh / 2, { marker: LN.marker * 0.85, markerRing: LN.ring })}</svg>`, "sample");
          lg.appendChild(add(AL("item", "HORIZONTAL", { gap: 7 * k }), smp, T(m.label, FS_LEG, { color: NEUTRAL.ink })));
        }
      }
      const legendBelow = legendMode === "below" && lg ? lg.height + 8 * k : 0;
      let R = Math.floor(Math.min(W, H) / 2);
      while (R > 40) {
        const e2 = ext(R);
        if (e2.x1 - e2.x0 <= W - 4 && e2.y1 - e2.y0 + legendBelow <= H - 4)
          break;
        R -= 1;
      }
      const e = ext(R), FW = Math.ceil(e.x1 - e.x0), FH = Math.ceil(e.y1 - e.y0), cx = -e.x0, cy = -e.y0;
      const plot = box("radar", FW, FH);
      const pt = (i, r) => [cx + R * r * ux(i), cy + R * r * uy(i)];
      const poly = (r) => axes.map((_, i) => pt(i, r).map((v) => v.toFixed(2)).join(" ")).join(" L");
      const oi = ms.findIndex((m) => m.ours);
      let d = oi >= 0 ? `<path d="M${axes.map((_, i) => pt(i, ratio[i][oi]).map((v) => v.toFixed(2)).join(" ")).join(" L")} Z" fill="${mix(ms[oi].color, 0.12)}"/>` : "";
      for (const lv of [0.25, 0.5, 0.75])
        d += `<path d="M${poly(lv)} Z" stroke="${NEUTRAL.grid}" stroke-width="${LN.grid}"/>`;
      for (let i = 0;i < N; i++)
        d += `<path d="M${cx.toFixed(2)} ${cy.toFixed(2)} L${pt(i, 1).map((v) => v.toFixed(2)).join(" ")}" stroke="${NEUTRAL.grid}" stroke-width="${LN.grid}"/>`;
      d += `<path d="M${poly(1)} Z" stroke="${NEUTRAL.axis}" stroke-width="${LN.rim}"/>`;
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
        const ax = cx + (R + OFF) * ux(i), ay = cy + (R + OFF) * uy(i), w = t.width, h = t.height;
        t.x = Math.abs(ux(i)) < 0.3 ? ax - w / 2 : ux(i) > 0 ? ax : ax - w;
        t.y = Math.abs(uy(i)) > 0.9 ? uy(i) < 0 ? ay - h : ay : ay - h / 2;
      });
      const holder = box("radar block", W, H);
      holder.appendChild(plot);
      plot.x = Math.round((W - FW) / 2);
      plot.y = 0;
      let placed = "none";
      if (lg) {
        holder.appendChild(lg);
        const { width: LW, height: LH } = lg, M = 6 * k;
        const rects = labs.map((t) => ({ x: plot.x + t.x - M, y: plot.y + t.y - M, w: t.width + 2 * M, h: t.height + 2 * M }));
        const ring = axes.map((_, i) => [plot.x + cx + (R + M) * ux(i), plot.y + cy + (R + M) * uy(i)]);
        let best = null;
        if (legendMode === "corner")
          for (const side of ["right", "left"]) {
            const x = side === "right" ? W - LW - 2 : 2;
            const y = highestClearY({ x, y0: H - LH - 2, w: LW, h: LH, rects, poly: ring, step: 2 });
            if (y != null && (!best || y < best.y))
              best = { x, y, side };
          }
        if (!best && legendMode === "corner") {
          holder.remove();
          return radar({ axes, methods, W, H, legendTitle, legendMode: "below", figureWidth, chartWidth, compact });
        }
        if (!best)
          best = { x: Math.round((W - LW) / 2), y: FH + 8 * k, side: "below" };
        lg.x = best.x;
        lg.y = best.y;
        placed = best.side;
        const bottom = Math.max(FH, best.y + LH);
        if (bottom > H)
          holder.resizeWithoutConstraints(W, bottom);
        const dy = Math.max(0, Math.round((H - bottom) / 2));
        plot.y += dy;
        lg.y += dy;
      } else
        plot.y = Math.round((H - FH) / 2);
      const parts = holder.children, x0 = Math.min(...parts.map((n) => n.x)), x1 = Math.max(...parts.map((n) => n.x + n.width));
      if (x0 > 4 * k || W - x1 > 4 * k) {
        for (const n of parts)
          n.x -= x0 - 2 * k;
        holder.resizeWithoutConstraints(Math.ceil(x1 - x0 + 4 * k), holder.height);
      }
      return { node: holder, R, ratio, legend: placed };
    }
    return { linePanel, barPanel, legend, group, chartFigure, radar };
  }

  // kit/diagram.js
  function createDiagram(core) {
    const { AL, add, box, T, TM, svg, rect, textWidth } = core;
    function palette(role = "ours", overrides = {}) {
      const base = { ours: OURS, second: SECOND, baseline: BASELINE }[role] || role;
      const m = { ...base, ...overrides };
      return { ...m, hatchSolid: mix(m.hatch || m.deep, m.hatchAlpha ?? 0.6) };
    }
    const kOf = (figureWidth) => (figureWidth || REF_WIDTH.diagram) / REF_WIDTH.diagram;
    function tile(kind, m, size, figureWidth) {
      const k = kOf(figureWidth);
      const f = box(kind + "-latent", size, size);
      if (kind === "empty")
        return f;
      f.cornerRadius = RADIUS.tile * k;
      f.strokes = core.paint(m.deep);
      f.strokeWeight = STROKE.diagram.tile * k;
      f.strokeAlign = "INSIDE";
      if (kind === "clean")
        f.fills = core.paint(m.mid);
      else {
        f.fills = core.paint("#FFFFFF");
        const d = hatchPath(size, { width: STROKE.diagram.hatchWidth * k, pitch: STROKE.diagram.hatchPitch * k, inset: 1.2 * k });
        const h = svg(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"><path d="${d}" fill="${m.hatchSolid}"/></svg>`, "noise");
        f.appendChild(h);
        h.x = 0;
        h.y = 0;
      }
      return f;
    }
    function tileRow(kinds, m, size, gap, figureWidth) {
      const r = AL("latents", "HORIZONTAL", { gap });
      for (const kd of kinds)
        r.appendChild(tile(kd, m, size, figureWidth));
      return r;
    }
    function token(word, m, size, figureWidth, fontSize) {
      const k = kOf(figureWidth);
      const fs = fontSize || Math.round(size * 0.34 * 2) / 2;
      return add(AL("text-token", "VERTICAL", { w: size, h: size, fill: "#FFFFFF", stroke: m.deep, sw: STROKE.diagram.tile * k, r: RADIUS.tile * k }), TM(word, fs, { color: m.ink || NEUTRAL.muted }));
    }
    const corners = new WeakMap;
    function cornerOf(d) {
      const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }));
      return pts.reduce((best, p) => p.x - p.y > best.x - best.y ? p : best);
    }
    function trapezoid(label, m, dir, width, height, figureWidth, orient = "v") {
      const k = kOf(figureWidth), fs = textSize("diagram", "module", figureWidth || REF_WIDTH.diagram);
      const lines = String(label).split(`
`);
      const tw = Math.max(...lines.map((l) => textWidth(l, fs, { style: "Medium" })));
      if (orient === "h")
        width = Math.max(width, Math.ceil(tw + 36 * k));
      else
        width = Math.max(width, Math.ceil((tw + 20 * k) / 0.7 + 10 * k));
      let d;
      if (orient === "h") {
        const tall = height - 2, short = Math.round(tall * 0.62), a = (height - tall) / 2, b = (height - short) / 2;
        const [left, right] = dir === "enc" ? [[a, height - a], [b, height - b]] : [[b, height - b], [a, height - a]];
        d = `M1 ${left[0]} L${width - 1} ${right[0]} L${width - 1} ${right[1]} L1 ${left[1]} Z`;
      } else {
        const wide = width - 10 * k, narrow = Math.round(wide * 0.7), a = (width - wide) / 2, b = (width - narrow) / 2;
        const [top, bot] = dir === "enc" ? [[b, width - b], [a, width - a]] : [[a, width - a], [b, width - b]];
        d = `M${bot[0]} ${height - 1} L${top[0]} 1 L${top[1]} 1 L${bot[1]} ${height - 1} Z`;
      }
      const f = AL(label, "VERTICAL", { w: width, h: height });
      corners.set(f, cornerOf(d));
      const s = svg(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none"><path d="${d}" fill="#FFFFFF" stroke="${m.deep}" stroke-width="${STROKE.diagram.module * k}" stroke-linejoin="round"/></svg>`, "trapezoid");
      f.appendChild(s);
      s.layoutPositioning = "ABSOLUTE";
      s.x = 0;
      s.y = 0;
      f.appendChild(T(label, fs, { color: m.ink, style: "Medium" }));
      return tagLevel(f, 2);
    }
    function block(label, width, height, figureWidth, { fontRole = "block", color = NEUTRAL.ink } = {}) {
      const k = kOf(figureWidth);
      return tagLevel(add(AL(label, "VERTICAL", { w: width, h: height, fill: NEUTRAL.band, r: RADIUS.block * k }), T(label, textSize("diagram", fontRole, figureWidth || REF_WIDTH.diagram), { color, style: "Medium" })), 2);
    }
    function chip(text, m, figureWidth, { w, align = "CENTER" } = {}) {
      const k = kOf(figureWidth), fs = textSize("diagram", "chip", figureWidth || REF_WIDTH.diagram);
      return tagLevel(add(AL("chip", "HORIZONTAL", { pad: [9 * k, 16 * k, 9 * k, 16 * k], fill: "#FFFFFF", stroke: m.stroke, sw: STROKE.diagram.chip * k, r: RADIUS.chip * k, cross: "CENTER" }), TM(text, fs, { color: NEUTRAL.ink, w, align })), 3);
    }
    function lane(parent, x, y0, width, height, m, figureWidth, name = "lane") {
      const k = kOf(figureWidth);
      const r = rect(width, height, m.lane, RADIUS.lane * k, name);
      parent.insertChild(0, r);
      if (parent.layoutMode && parent.layoutMode !== "NONE")
        r.layoutPositioning = "ABSOLUTE";
      r.x = x;
      r.y = y0;
      return r;
    }
    function flowTracks(parent, segs, figureWidth, index = 1) {
      const k = kOf(figureWidth), st = STROKE.diagram;
      const AH = st.head[0] * k, AW = st.head[1] / 2 * k;
      const yMin = Math.min(...segs.map((s) => s.y2)) - 2, yMax = Math.max(...segs.map((s) => s.y1)) + 2;
      let paths = "";
      for (const s of segs) {
        const y1 = s.y1 - yMin, y2 = s.y2 - yMin, ye = y2 + AH + 3 * k;
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
    function caption(text, { ours = false, figureWidth } = {}) {
      return T(text, textSize("diagram", "caption", figureWidth || REF_WIDTH.diagram), { color: ours ? NEUTRAL.ink : NEUTRAL.muted, style: ours ? "SemiBold" : "Medium" });
    }
    function symbolLegend(items, figureWidth, { size } = {}) {
      const k = kOf(figureWidth), fs = size || textSize("diagram", "legend", figureWidth || REF_WIDTH.diagram);
      const row = AL("legend", "HORIZONTAL", { gap: 40 * k });
      for (const it of items)
        row.appendChild(add(AL("legend-item", "HORIZONTAL", { gap: 10 * k }), add(AL("icons", "HORIZONTAL", { gap: 5 * k }), ...it.icons), T(it.label, fs, { color: NEUTRAL.ink })));
      return row;
    }
    const anchors = new WeakMap;
    function captioned(node, caption2, { gap = 8, figureWidth, fw, color = NEUTRAL.sub, side = "bottom" } = {}) {
      figureWidth ??= fw;
      const k = kOf(figureWidth);
      const t = typeof caption2 === "string" ? T(caption2, textSize("diagram", "note", figureWidth || REF_WIDTH.diagram), { color }) : caption2;
      const col = add(AL(node.name + " + caption", "VERTICAL", { gap: gap * k, cross: "CENTER", main: "MIN" }), ...side === "top" ? [t, node] : [node, t]);
      anchors.set(col, node);
      return col;
    }
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
      for (const c of cells)
        c.cell.paddingTop = top - centre(c);
      return row;
    }
    function tokenStack(n, m, { size, gap, figureWidth, kind = "clean", orient = "v", ellipsis = false } = {}) {
      const k = kOf(figureWidth), cell = size || 26 * k, g = gap ?? 5 * k;
      const st = AL(`${n} tokens`, orient === "v" ? "VERTICAL" : "HORIZONTAL", { gap: g, cross: "CENTER" });
      for (let i = 0;i < n; i++)
        st.appendChild(tile(kind, m, cell, figureWidth));
      if (ellipsis)
        st.appendChild(T(orient === "v" ? "⋮" : "⋯", cell * 0.9, { color: m.deep || NEUTRAL.muted }));
      return st;
    }
    function tokenStrip(count, label, m, { size, gap, show = 5, kind = "clean", figureWidth } = {}) {
      const k = kOf(figureWidth), cell = size || 30 * k, g = gap ?? 6 * k;
      const row = tileRow(Array(Math.min(show, count)).fill(kind), m, cell, g, figureWidth);
      row.name = `${count} tokens`;
      return captioned(row, label, { figureWidth });
    }
    function keyBlock(label, width, height, m, figureWidth) {
      const k = kOf(figureWidth);
      return tagLevel(add(AL(label, "VERTICAL", { w: width, h: height, fill: m.deep, r: RADIUS.block * k }), T(label, textSize("diagram", "block", figureWidth || REF_WIDTH.diagram), { color: "#FFFFFF", style: "SemiBold", w: width - 24 * k })), 1);
    }
    function moduleBox(label, width, height, m, figureWidth) {
      const k = kOf(figureWidth);
      return tagLevel(add(AL(label, "VERTICAL", { w: width, h: height, fill: "#FFFFFF", stroke: m.deep, sw: STROKE.diagram.module * k, r: RADIUS.block * k }), T(label, textSize("diagram", "module", figureWidth || REF_WIDTH.diagram), { color: m.ink, style: "Medium", w: width - 20 * k })), 2);
    }
    function badge(kind, figureWidth, { size, colors = {} } = {}) {
      const k = kOf(figureWidth), d = size || BADGE.size * k, c = d / 2;
      const disc = `<circle cx="${c}" cy="${c}" r="${c - 0.8 * k}" fill="#FFFFFF" stroke="${NEUTRAL.divider}" stroke-width="${1.2 * k}"/>`;
      let icon2 = "";
      if (kind === "frozen") {
        const col = colors.frozen || BADGE.frozen, r = d * 0.32, b = d * 0.1, sw = Math.max(1.4, d * 0.075);
        let p = "";
        for (let i = 0;i < 6; i++) {
          const a = Math.PI / 3 * i, ux = Math.sin(a), uy = -Math.cos(a);
          const ex = c + r * ux, ey = c + r * uy, mx = c + r * 0.55 * ux, my = c + r * 0.55 * uy;
          p += `M${c.toFixed(2)} ${c.toFixed(2)} L${ex.toFixed(2)} ${ey.toFixed(2)} `;
          for (const s2 of [-1, 1]) {
            const bx = Math.sin(a + s2 * Math.PI / 4), by = -Math.cos(a + s2 * Math.PI / 4);
            p += `M${mx.toFixed(2)} ${my.toFixed(2)} L${(mx + b * bx).toFixed(2)} ${(my + b * by).toFixed(2)} `;
          }
        }
        icon2 = `<path d="${p}" stroke="${col}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round"/>`;
      } else {
        const col = colors.trained || BADGE.trained, inner = colors.trainedInner || BADGE.trainedInner, u = d / 24;
        const outer = `M${12 * u} ${4 * u} C${12.5 * u} ${7.5 * u} ${17 * u} ${9.5 * u} ${17 * u} ${14 * u} C${17 * u} ${17.3 * u} ${14.8 * u} ${20 * u} ${12 * u} ${20 * u} C${9.2 * u} ${20 * u} ${7 * u} ${17.6 * u} ${7 * u} ${14.6 * u} C${7 * u} ${12 * u} ${8.6 * u} ${10.6 * u} ${9.6 * u} ${9.4 * u} C${9.8 * u} ${11 * u} ${10.4 * u} ${12 * u} ${11.2 * u} ${12.4 * u} C${11 * u} ${9.6 * u} ${11.3 * u} ${6.6 * u} ${12 * u} ${4 * u} Z`;
        const core2 = `M${12 * u} ${12.6 * u} C${12.6 * u} ${14.2 * u} ${14.3 * u} ${15 * u} ${14.3 * u} ${16.8 * u} C${14.3 * u} ${18.2 * u} ${13.3 * u} ${19.2 * u} ${12 * u} ${19.2 * u} C${10.7 * u} ${19.2 * u} ${9.7 * u} ${18.2 * u} ${9.7 * u} ${16.9 * u} C${9.7 * u} ${15.3 * u} ${11.3 * u} ${14.3 * u} ${12 * u} ${12.6 * u} Z`;
        icon2 = `<path d="${outer}" fill="${col}"/><path d="${core2}" fill="${inner}"/>`;
      }
      const n = svg(`<svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" fill="none">${disc}${icon2}</svg>`, kind === "frozen" ? "frozen (snowflake)" : "trained (flame)");
      n.setSharedPluginData("p2f", "badge", kind);
      return n;
    }
    function pinBadge(root, module, kind, figureWidth, opts = {}) {
      const b = badge(kind, figureWidth, opts);
      const m = core.rel(module, root);
      const c = corners.get(module);
      if (c)
        core.absolute(root, b, m.x + c.x - b.width * 0.5, m.y + c.y - b.height * 0.5);
      else
        core.absolute(root, b, m.x + m.w - b.width * 0.6, m.y - b.height * 0.4);
      return b;
    }
    function badgeLegend(figureWidth, { size, labels = { frozen: "frozen", trained: "trained" }, kinds = ["frozen", "trained"] } = {}) {
      const k = kOf(figureWidth), fs = size || textSize("diagram", "note", figureWidth || REF_WIDTH.diagram);
      const row = AL("badge legend", "HORIZONTAL", { gap: 18 * k, cross: "CENTER" });
      for (const kind of kinds) {
        const b = badge(kind, figureWidth);
        b.setSharedPluginData("p2f", "badge", "");
        row.appendChild(add(AL(kind, "HORIZONTAL", { gap: 6 * k, cross: "CENTER" }), b, T(labels[kind], fs, { color: NEUTRAL.sub })));
      }
      return row;
    }
    const fits = (str, size, maxW, style) => textWidth(str, size, { style }) <= maxW;
    const tagLevel = (node, level) => {
      node.setSharedPluginData("p2f", "level", String(level));
      return node;
    };
    function element(label, level, m, { w, h, figureWidth, fw: fwOpt, dashed = false, sub, pad } = {}) {
      figureWidth ??= fwOpt;
      const k = kOf(figureWidth), fw = figureWidth || REF_WIDTH.diagram, L = LEVEL[level];
      if (!L)
        throw new Error(`level must be 1, 2 or 3, not ${level}`);
      const look = level === 1 ? { fill: m.deep } : level === 2 ? { fill: "#FFFFFF", stroke: m.deep, sw: STROKE.diagram.module * k } : { fill: "#FFFFFF", stroke: NEUTRAL.divider, sw: STROKE.diagram.chip * k };
      if (dashed)
        Object.assign(look, { stroke: look.stroke || NEUTRAL.divider, sw: look.sw || STROKE.diagram.chip * k, dash: [7 * k, 5 * k] });
      const P = pad ?? (level === 3 ? [8 * k, 14 * k, 8 * k, 14 * k] : [12 * k, 18 * k, 12 * k, 18 * k]);
      const f = AL(label, "VERTICAL", { ...w ? { w } : {}, ...h ? { h } : {}, pad: P, gap: 2 * k, r: (level === 3 ? RADIUS.chip : RADIUS.block) * k, ...look });
      const ink = level === 1 ? "#FFFFFF" : level === 2 ? m.ink || NEUTRAL.ink : NEUTRAL.sub;
      const tw = w ? { w: w - P[1] - P[3] } : {};
      f.appendChild(T(label, textSize("diagram", L.text, fw), { color: ink, style: L.style, ...tw }));
      if (sub)
        f.appendChild(T(sub, textSize("diagram", "note", fw), { color: level === 1 ? "#FFFFFF" : NEUTRAL.sub, ...tw }));
      return tagLevel(f, level);
    }
    function icon(kind, { size, color = NEUTRAL.muted, fill = "#FFFFFF", figureWidth, fw, label, dashed = false, labelSide = "bottom" } = {}) {
      figureWidth ??= fw;
      const k = kOf(figureWidth), d = size || 44 * k, u = d / 24, sw = Math.max(1.2, 1.6 * u).toFixed(2), tint = mix(color, 0.18);
      const pic = (x, y, w, h, bg = fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${1.6 * u}" fill="${bg}" stroke="${color}" stroke-width="${sw}"/>` + `<circle cx="${x + w * 0.3}" cy="${y + h * 0.32}" r="${Math.min(w, h) * 0.1}" fill="${tint}"/>` + `<path d="M${x + w * 0.1} ${y + h * 0.86} L${x + w * 0.4} ${y + h * 0.5} L${x + w * 0.6} ${y + h * 0.7} L${x + w * 0.72} ${y + h * 0.58} L${x + w * 0.9} ${y + h * 0.86} Z" fill="${tint}"/>`;
      let body;
      if (kind === "image")
        body = pic(2 * u, 4 * u, 20 * u, 16 * u);
      else if (kind === "frames")
        body = pic(7 * u, 1.5 * u, 15 * u, 12 * u, mix(color, 0.08)) + pic(4.5 * u, 5.5 * u, 15 * u, 12 * u, mix(color, 0.04)) + pic(2 * u, 9.5 * u, 15 * u, 12 * u);
      else if (kind === "film") {
        body = `<rect x="${1.5 * u}" y="${4 * u}" width="${21 * u}" height="${16 * u}" rx="${1.6 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>`;
        for (let i = 0;i < 5; i++)
          body += `<rect x="${(3.2 + i * 3.9) * u}" y="${5.3 * u}" width="${1.8 * u}" height="${1.6 * u}" fill="${color}"/><rect x="${(3.2 + i * 3.9) * u}" y="${17.1 * u}" width="${1.8 * u}" height="${1.6 * u}" fill="${color}"/>`;
        for (let i = 0;i < 3; i++)
          body += `<rect x="${(3 + i * 6.3) * u}" y="${8.2 * u}" width="${5.4 * u}" height="${7.6 * u}" rx="${0.6 * u}" fill="${tint}"/>`;
      } else if (kind === "clock")
        body = `<circle cx="${12 * u}" cy="${12 * u}" r="${9.5 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/><path d="M${12 * u} ${6.5 * u} V${12 * u} L${16 * u} ${14.5 * u}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      else if (kind === "arm")
        body = `<path d="M${4 * u} ${21 * u} H${12 * u}" stroke="${color}" stroke-width="${(2.2 * u).toFixed(2)}" stroke-linecap="round"/>` + `<path d="M${8 * u} ${20 * u} L${8 * u} ${13 * u} L${15 * u} ${7 * u} L${19.5 * u} ${10.5 * u}" stroke="${color}" stroke-width="${(2.2 * u).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` + `<path d="M${19.5 * u} ${10.5 * u} L${21.5 * u} ${9 * u} M${19.5 * u} ${10.5 * u} L${21 * u} ${12.8 * u}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>` + [[8, 13], [15, 7]].map(([x, y]) => `<circle cx="${x * u}" cy="${y * u}" r="${1.9 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>`).join("");
      else if (kind === "text")
        body = `<rect x="${4 * u}" y="${2.5 * u}" width="${16 * u}" height="${19 * u}" rx="${1.6 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>` + [7, 10.5, 14, 17.5].map((y, i) => `<path d="M${7 * u} ${y * u} H${(i === 3 ? 13 : 17) * u}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`).join("");
      else if (kind === "stack" || kind === "memory") {
        const x0 = 4 * u, x1 = 20 * u, rx = 8 * u, ry = 2.8 * u;
        body = `<path d="M${x0} ${5 * u} V${19 * u} A${rx} ${ry} 0 0 0 ${x1} ${19 * u} V${5 * u}" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>` + `<ellipse cx="${12 * u}" cy="${5 * u}" rx="${rx}" ry="${ry}" fill="${tint}" stroke="${color}" stroke-width="${sw}"/>` + [10, 14.5].map((y) => `<path d="M${x0} ${y * u} A${rx} ${ry} 0 0 0 ${x1} ${y * u}" stroke="${color}" stroke-width="${sw}"/>`).join("");
      } else
        throw new Error(`unknown icon ${kind}`);
      const n = svg(`<svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" fill="none">${body}</svg>`, `icon ${kind}`);
      tagLevel(n, 3);
      n.setSharedPluginData("p2f", "icon", kind);
      if (label)
        n.setSharedPluginData("p2f", "named", "1");
      let out = n;
      if (label && (labelSide === "left" || labelSide === "right")) {
        const t = T(label, textSize("diagram", "note", figureWidth || REF_WIDTH.diagram), { color: NEUTRAL.sub });
        out = add(AL(`${kind} + name`, "HORIZONTAL", { gap: 8 * k, cross: "CENTER" }), ...labelSide === "left" ? [t, n] : [n, t]);
      } else if (label)
        out = captioned(n, label, { figureWidth, gap: 4, side: labelSide });
      if (!dashed)
        return out;
      const b = AL(`optional ${kind}`, "VERTICAL", { pad: [8 * k, 12 * k, 8 * k, 12 * k], r: RADIUS.chip * k, fill: "#FFFFFF", stroke: NEUTRAL.divider, sw: STROKE.diagram.chip * k, dash: [7 * k, 5 * k] });
      b.appendChild(out);
      return tagLevel(b, 3);
    }
    function blockedArrow(length, { orient = "h", color = NEUTRAL.muted, figureWidth, fw } = {}) {
      figureWidth ??= fw;
      if (orient === "right")
        orient = "h";
      if (orient === "up")
        orient = "v";
      if (orient === "down" || orient === "left") {
        const n = blockedArrow(length, { orient: orient === "down" ? "v" : "h", color, figureWidth });
        const f = core.box("blocked arrow " + orient, n.width, n.height);
        f.appendChild(n);
        n.rotation = 180;
        n.x = n.width;
        n.y = n.height;
        return f;
      }
      const k = kOf(figureWidth), st = STROKE.diagram, c = 7 * k, h = 2 * c + 4 * k, L = Math.max(length, 4 * c);
      const [w, hh] = orient === "h" ? [L, h] : [h, L];
      const mid = h / 2;
      const line = orient === "h" ? `M${1.5 * k} ${mid} H${L - 2.6 * c}` : `M${mid} ${L - 1.5 * k} V${2.6 * c}`;
      const [cx, cy] = orient === "h" ? [L - 1.2 * c, mid] : [mid, 1.2 * c];
      const cross = `M${cx - c * 0.8} ${cy - c * 0.8} L${cx + c * 0.8} ${cy + c * 0.8} M${cx - c * 0.8} ${cy + c * 0.8} L${cx + c * 0.8} ${cy - c * 0.8}`;
      const b = svg(`<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" fill="none"><path d="${line}" stroke="${color}" stroke-width="${st.arrow * k}" stroke-dasharray="${st.flowDash.map((v) => v * k).join(" ")}" stroke-linecap="round"/><path d="${cross}" stroke="${CURSOR.red}" stroke-width="${st.arrow * k * 1.1}" stroke-linecap="round"/></svg>`, "blocked arrow");
      b.setSharedPluginData("p2f", "blocked", String(Math.round(L)));
      return b;
    }
    function timeline(length, { ticks = [], label = "time", figureWidth, fw } = {}) {
      figureWidth ??= fw;
      const k = kOf(figureWidth), fwd = figureWidth || REF_WIDTH.diagram, fs = textSize("diagram", "note", fwd), st = STROKE.diagram;
      const H = 12 * k, head = st.arrowHead * k;
      let d = `<path d="M0 ${H / 2} H${length - head}" stroke="${NEUTRAL.muted}" stroke-width="${st.arrow * k}"/>`;
      d += `<path d="M${length} ${H / 2} L${length - head - 1} ${H / 2 - head / 2} L${length - head - 1} ${H / 2 + head / 2} Z" fill="${NEUTRAL.muted}"/>`;
      for (const t of ticks)
        d += `<path d="M${t.x} 0 V${H}" stroke="${NEUTRAL.muted}" stroke-width="${st.arrow * k}" stroke-linecap="round"/>`;
      const nameW = label ? textWidth(label, fs, { style: "Medium" }) + 8 * k : 0;
      const f = core.box("time axis", length + nameW, H + fs * 1.5);
      const line = svg(`<svg width="${length}" height="${H}" viewBox="0 0 ${length} ${H}" fill="none">${d}</svg>`, "axis");
      f.appendChild(line);
      for (const t of ticks) {
        if (!t.label)
          continue;
        const tx = T(t.label, fs, { color: NEUTRAL.sub });
        f.appendChild(tx);
        tx.x = Math.max(0, Math.min(length - tx.width, t.x - tx.width / 2));
        tx.y = H + 2 * k;
      }
      if (label) {
        const tx = T(label, fs, { color: NEUTRAL.sub, style: "Medium" });
        f.appendChild(tx);
        tx.x = length + 8 * k;
        tx.y = H / 2 - tx.height / 2;
      }
      return tagLevel(f, 3);
    }
    function span(width, { label, m = palette("baseline"), height, figureWidth, fw, dashed = false, open } = {}) {
      figureWidth ??= fw;
      const k = kOf(figureWidth), fwd = figureWidth || REF_WIDTH.diagram, h = height || 26 * k, fs = textSize("diagram", "note", fwd);
      const need = label ? textWidth(label, fs) + h : 0;
      const f = AL(label ? `span ${label}` : "span", "HORIZONTAL", { w: Math.max(width, 2 * h, need), h, pad: [0, h / 2, 0, h / 2], r: h / 2, fill: dashed ? "#FFFFFF" : m.lane || m.mid, stroke: m.deep, sw: STROKE.diagram.chip * k, ...dashed ? { dash: [6 * k, 4 * k] } : {} });
      if (open === "right") {
        f.topRightRadius = 0;
        f.bottomRightRadius = 0;
        f.strokeRightWeight = 0;
      }
      if (label)
        f.appendChild(T(label, fs, { color: m.ink || NEUTRAL.sub }));
      return tagLevel(f, 3);
    }
    function pinStates(root, items, figureWidth) {
      if (typeof figureWidth === "object")
        figureWidth = figureWidth.figureWidth ?? figureWidth.fw;
      const count = (s) => items.filter((i) => i.state === s).length;
      const fz = count("frozen"), tr = count("trained");
      if (!fz || !tr)
        return { marked: null, legend: null };
      const kind = fz <= tr ? "frozen" : "trained";
      for (const i of items)
        if (i.state === kind)
          pinBadge(root, i.node, kind, figureWidth);
      return { marked: kind, legend: badgeLegend(figureWidth, { kinds: [kind] }) };
    }
    function meaning(colour, text) {
      const hex = String(typeof colour === "string" ? colour : colour.deep).toUpperCase();
      const family = [OURS, SECOND, BASELINE].find((f) => Object.values(f).some((v) => typeof v === "string" && v.toUpperCase() === hex));
      core.meanings.set((family ? family.deep : hex).toUpperCase(), text);
    }
    return { palette, tile, tileRow, token, tokenStack, tokenStrip, captioned, flowRow, badge, pinBadge, pinStates, badgeLegend, trapezoid, block, keyBlock, moduleBox, chip, lane, flowTracks, caption, symbolLegend, fits, element, icon, blockedArrow, timeline, span, meaning, tagLevel };
  }

  // kit/index.js
  function createKit(figma) {
    const core = createCore(figma);
    const charts = createCharts(core);
    const diagram = createDiagram(core);
    function renderSpec(s) {
      const root = build(s);
      const placement = s.placement && s.width ? Math.round(s.placement * root.width / s.width * 100) / 100 : s.placement || 1;
      root.setSharedPluginData("p2f", "meta", JSON.stringify({ kind: s.kind === "radar" ? "radar" : "chart", placement }));
      return root;
    }
    function build(s) {
      if (s.version !== 1)
        throw new Error("figure spec version must be 1");
      if (s.kind === "chart-grid")
        return charts.chartFigure(s);
      if (s.kind === "radar") {
        const W = s.width || 700, H = s.height || 620;
        const chartWidth = W / (s.placement || 1), diagramWidth = s.figureWidth || chartWidth * REF_WIDTH.diagram / REF_WIDTH.chart;
        const root = core.AL(s.name, "VERTICAL", { fill: "#FFFFFF", pad: 1, gap: 12, cross: "CENTER" });
        const r = charts.radar({ axes: s.axes, methods: s.methods, W, H, legendTitle: s.legend?.title, legendMode: s.legend?.placement || "corner", chartWidth, figureWidth: diagramWidth });
        root.appendChild(r.node);
        if (s.caption)
          root.appendChild(diagram.caption(s.caption, { ours: true, figureWidth: diagramWidth }));
        return root;
      }
      throw new Error(`unknown figure kind: ${s.kind}`);
    }
    return { spec: exports_spec, math: exports_math, ...core, charts, diagram, renderSpec };
  }
  globalThis.createPaperKit = createKit;
})();
