// Figma-side building blocks. Everything here runs inside the Figma plugin sandbox.
// Rules baked in: auto layout by default, no clipping frames (PDF soft masks), no transparency (viewers that ignore it
// paint colours solid), arrow glyphs in Roboto (the Google Sans Flex arrows drop out of Figma PDF exports).
import * as S from "./spec.js";

export const FONT = { sans: "Google Sans Flex", mono: "Google Sans Code", arrow: "Roboto" };
const ARROWS = /[←-↓⇐-⇓]/g;

export function createCore(figma) {
  const hex = (h) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(h)) throw new Error(`colour must be #RRGGBB: ${h}`);
    return { r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 };
  };
  // Opaque paint only. Pass S.mix(colour, alpha) when a lighter tone is needed.
  const paint = (h) => [{ type: "SOLID", color: hex(h) }];

  async function init({ extra = [] } = {}) {
    const want = [
      [FONT.sans, ["Regular", "Medium", "SemiBold", "Bold"]],
      [FONT.mono, ["Regular", "Medium", "SemiBold"]],
      [FONT.arrow, ["Regular", "Medium"]],
      ...extra,
    ];
    const missing = [];
    for (const [family, styles] of want)
      for (const style of styles) {
        try {
          await figma.loadFontAsync({ family, style });
        } catch {
          missing.push(`${family} ${style}`);
        }
      }
    // Never fall back to Inter silently: the figure would look like someone else's.
    if (missing.some((m) => m.startsWith(FONT.sans))) throw new Error(`Font missing in Figma: ${missing.join(", ")}. Install Google Sans Flex.`);
    return { missing };
  }

  // Auto-layout frame. o: w, h (fixed sizes), fill, stroke, sw, dash, gap, pad (number or [t, r, b, l]), r, main, cross.
  function AL(name, dir, o = {}) {
    const f = figma.createFrame();
    f.name = name;
    if (o.w || o.h) f.resize(o.w || 1, o.h || 1);
    f.layoutMode = dir;
    f.fills = o.fill ? paint(o.fill) : [];
    if (o.stroke) {
      f.strokes = paint(o.stroke);
      f.strokeWeight = o.sw || 1.5;
      f.strokeAlign = "INSIDE";
      if (o.dash) f.dashPattern = o.dash;
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
    for (const k of kids) if (k) parent.appendChild(k);
    return parent;
  };
  // Plain frame for absolute placement (radar labels, overlays). Never clips.
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

  // Text. o: style, color, align, w (fixed width, wraps), mono, name. Arrow glyphs are switched to Roboto.
  function T(str, size, o = {}) {
    const t = figma.createText();
    const family = o.mono ? FONT.mono : FONT.sans;
    t.fontName = { family, style: o.style || "Regular" };
    t.characters = String(str);
    t.fontSize = size;
    t.fills = paint(o.color || S.NEUTRAL.ink);
    t.textAlignHorizontal = o.align || "CENTER";
    if (o.lineHeight) t.lineHeight = { value: o.lineHeight, unit: "PERCENT" };
    if (o.w) {
      t.textAutoResize = "HEIGHT";
      t.resize(o.w, t.height);
    } else t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.name = o.name || String(str).slice(0, 60);
    for (const m of String(str).matchAll(ARROWS)) {
      const w0 = t.width;
      t.setRangeFontName(m.index, m.index + 1, { family: FONT.arrow, style: o.style === "Regular" || !o.style ? "Regular" : "Medium" });
      if (o.keepCentre) t.x -= (t.width - w0) / 2;
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
  // Colour ranges inside a text node: ranges = [[start, end, "#hex", style?]].
  function colourRanges(t, ranges) {
    for (const [a, b, c, style] of ranges) {
      t.setRangeFills(a, b, paint(c));
      if (style) t.setRangeFontName(a, b, { family: t.fontName.family, style });
    }
    return t;
  }

  // SVG node. createNodeFromSvg returns a clipping frame; clipping becomes a PDF soft mask when content touches its
  // edge, so it is always turned off.
  function svg(markup, name) {
    if (/fill-opacity|stroke-opacity|opacity=/.test(markup)) throw new Error(`svg "${name}" uses transparency; blend the colour with mix() instead`);
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
  // Horizontal or vertical dashed rule, e.g. between panels ("v") or between examples ("h").
  function dashedLine(length, orient, { color = S.NEUTRAL.divider, width = 2.6, dash = [6, 9] } = {}) {
    const L = Math.max(4, length);
    const d = orient === "v" ? `M2 1.5 V${L - 1.5}` : `M1.5 2 H${L - 1.5}`;
    const [w, h] = orient === "v" ? [4, L] : [L, 4];
    return svg(
      `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><path d="${d}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash.join(" ")}" stroke-linecap="round"/></svg>`,
      orient === "v" ? "divider (vertical)" : "divider",
    );
  }
  // Straight arrow with a filled head, horizontal (left to right) or vertical (bottom to top).
  // orient: "right" (or "h"), "up" (or "v"), "down", "left"
  function arrow(length, { orient = "h", color = S.OURS.deep, width = 2.4, head = 12, dashed = false, dash = [5, 8] } = {}) {
    if (orient === "down" || orient === "left") {
      const n = arrow(length, { orient: orient === "down" ? "v" : "h", color, width, head, dashed, dash });
      const f = box("arrow " + orient, n.width, n.height);
      f.appendChild(n);
      n.rotation = 180; // turns about the top-left corner: move it back into the box
      n.x = n.width;
      n.y = n.height;
      return f;
    }
    if (orient === "right") orient = "h";
    if (orient === "up") orient = "v";
    const L = Math.max(head + 4, length),
      hw = head / 2 + 1;
    const body = orient === "h" ? `M1.5 ${hw} H${L - head}` : `M${hw} ${L - 1.5} V${head}`;
    const tip = orient === "h" ? `M${L - 1} ${hw} L${L - head - 2} ${hw - head / 2} L${L - head - 2} ${hw + head / 2} Z` : `M${hw} 1 L${hw - head / 2} ${head + 2} L${hw + head / 2} ${head + 2} Z`;
    const [w, h] = orient === "h" ? [L, 2 * hw] : [2 * hw, L];
    return svg(
      `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><path d="${body}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dashed ? ` stroke-dasharray="${dash.join(" ")}"` : ""}/><path d="${tip}" fill="${color}"/></svg>`,
      "arrow",
    );
  }

  // Place a node as an absolute child (overlays such as lanes behind columns).
  function absolute(parent, node, x, y, index) {
    if (index == null) parent.appendChild(node);
    else parent.insertChild(index, node);
    // inside an auto-layout frame the node leaves the flow; a plain frame places its children by x and y anyway
    if (parent.layoutMode && parent.layoutMode !== "NONE") node.layoutPositioning = "ABSOLUTE";
    node.x = x;
    node.y = y;
    return node;
  }
  const rel = (node, ref) => {
    const a = node.absoluteBoundingBox,
      b = ref.absoluteBoundingBox;
    return { x: a.x - b.x, y: a.y - b.y, w: a.width, h: a.height };
  };

  async function page(name) {
    const p = name ? figma.root.children.find((c) => c.name === name) : figma.currentPage;
    if (!p) throw new Error(`page not found: ${name}`);
    await p.loadAsync();
    return p;
  }
  // Put a finished root frame on a page. A frame with the same name is replaced in place (its position is kept).
  // The root itself is excluded from the search: it already sits on the current page.
  // declaredWidth: the width the sizes were taken for (e.g. 1498). A figure narrower than that keeps its print size when
  // placed at width / declaredWidth of \linewidth; the result reports that share as latexWidth.
  // The placement and kind are stored on the frame, so lint and verify judge it at the size it will be printed.
  // type: teaser, overview, detail or qualitative (sets the word budget). Colour meanings declared with
  // kit.diagram.meaning are stored too, for the paper-wide colour check.
  const meanings = new Map();
  async function place(root, { pageName, name = root.name, x, y, replace = true, declaredWidth, placement, kind, type } = {}) {
    const p = await page(pageName);
    const prev = p.children.find((n) => n.name === name && n !== root);
    let px = x,
      py = y;
    if (prev) {
      px ??= prev.x;
      py ??= prev.y;
      if (replace) prev.remove();
    }
    if (px == null) {
      px = Math.max(0, ...p.children.filter((n) => n !== root && "width" in n).map((n) => n.x + n.width)) + 200;
      py = 0;
    }
    p.appendChild(root);
    root.x = px;
    root.y = py ?? 0;
    const out = { id: root.id, x: root.x, y: root.y, w: Math.round(root.width), h: Math.round(root.height), aspect: +(root.width / root.height).toFixed(2), replaced: !!(prev && replace) };
    const meta = readMeta(root);
    if (declaredWidth) meta.placement = Math.min(1, Math.ceil((root.width / declaredWidth) * 100) / 100);
    if (placement) meta.placement = placement;
    if (kind) meta.kind = kind;
    if (type) meta.type = type;
    if (meanings.size) {
      meta.meanings = Object.fromEntries(meanings);
      meanings.clear();
    }
    meta.kind ||= "diagram";
    root.setSharedPluginData("p2f", "meta", JSON.stringify(meta));
    if (meta.placement) out.latexWidth = `${meta.placement}\\linewidth`;
    out.kind = meta.kind;
    return out;
  }
  // Figma exports an image that has not loaded yet as a lavender placeholder; wait for every image first.
  async function preloadImages(node) {
    let n = 0;
    for (const nd of node.findAll((c) => "fills" in c && Array.isArray(c.fills)))
      for (const f of nd.fills)
        if (f.type === "IMAGE" && f.imageHash) {
          await figma.getImageByHash(f.imageHash).getSizeAsync();
          n++;
        }
    return n;
  }
  // Everything an export needs before it runs: images loaded, every font of every text run loaded, and one tiny
  // throwaway export. The first export after a build dropped the Roboto arrow glyphs; a warm-up render fixes it.
  async function prepareExport(node) {
    const images = await preloadImages(node);
    const fonts = new Map();
    for (const t of node.findAll((c) => c.type === "TEXT"))
      for (const s of t.getStyledTextSegments(["fontName"])) fonts.set(`${s.fontName.family}|${s.fontName.style}`, s.fontName);
    for (const f of fonts.values()) await figma.loadFontAsync(f);
    await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 0.05 } });
    return { images, fonts: fonts.size };
  }
  function imageRect(base64, w, name = "image") {
    const img = figma.createImage(figma.base64Decode(base64));
    const r = figma.createRectangle();
    r.name = name;
    r.fills = [{ type: "IMAGE", imageHash: img.hash, scaleMode: "FILL" }];
    return { rect: r, hash: img.hash, fit: async () => {
      const { width, height } = await img.getSizeAsync();
      r.resize(w, (w * height) / width);
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
  // Flat node list for the design checks in src/lint.mjs.
  function inspect(root) {
    const rb = root.absoluteBoundingBox;
    const out = [];
    for (const n of [root, ...root.findAll(() => true)]) {
      const r = { id: n.id, type: n.type, name: n.name, parentId: n.parent?.id };
      const level = n.getSharedPluginData("p2f", "level"),
        badge = n.getSharedPluginData("p2f", "badge");
      if (level) r.level = +level;
      if (badge) r.badge = badge;
      const iconKind = n.getSharedPluginData("p2f", "icon"),
        blocked = n.getSharedPluginData("p2f", "blocked");
      if (iconKind) Object.assign(r, { icon: iconKind, named: n.getSharedPluginData("p2f", "named") === "1" });
      if (blocked) r.blocked = +blocked;
      if (n.type === "FRAME" && ((Array.isArray(n.fills) && n.fills.some((f) => f.visible !== false)) || (Array.isArray(n.strokes) && n.strokes.length))) r.boxed = true;
      if (n !== root) {
        const up = [];
        for (let q = n.parent; q && q !== root; q = q.parent) up.unshift(q.name);
        r.path = up.join(" / ");
      }
      if (n.absoluteBoundingBox) {
        const b = n.absoluteBoundingBox;
        Object.assign(r, { x: b.x - rb.x, y: b.y - rb.y, w: b.width, h: b.height });
      }
      if ("clipsContent" in n) r.clipsContent = n.clipsContent;
      if ("opacity" in n && n.opacity !== 1) r.opacity = n.opacity;
      if (typeof n.cornerRadius === "number" && n.cornerRadius > 0) r.cornerRadius = n.cornerRadius;
      if ("strokeWeight" in n && typeof n.strokeWeight === "number" && Array.isArray(n.strokes) && n.strokes.length) r.strokeWeight = n.strokeWeight;
      if (Array.isArray(n.fills))
        r.fills = n.fills
          .filter((f) => f.visible !== false)
          .map((f) => (f.type === "SOLID" ? { type: "SOLID", hex: "#" + ["r", "g", "b"].map((c) => Math.round(f.color[c] * 255).toString(16).padStart(2, "0")).join("").toUpperCase(), opacity: f.opacity ?? 1 } : { type: f.type }));
      if (n.type === "TEXT")
        r.segments = n.getStyledTextSegments(["fontSize", "fontName"]).map((s) => ({ text: s.characters, size: s.fontSize, family: s.fontName.family, style: s.fontName.style }));
      out.push(r);
    }
    return { id: root.id, name: root.name, width: root.width, height: root.height, meta: readMeta(root), nodes: out };
  }

  // Sizes for a figure: kind "diagram" or "chart", scaled to the figure width.
  function sizes(kind, width) {
    const out = {};
    for (const role of Object.keys(S.TEXT[kind])) out[role] = S.textSize(kind, role, width);
    return out;
  }
  function strokes(kind, width) {
    const out = {};
    for (const [role, v] of Object.entries(S.STROKE[kind])) out[role] = typeof v === "number" ? S.strokeWidth(kind, role, width) : v;
    return out;
  }

  return { meanings, hex, paint, init, inspect, AL, add, box, spacer, T, TM, textWidth, colourRanges, svg, rect, dashedLine, arrow, absolute, rel, page, place, preloadImages, prepareExport, imageRect, sizes, strokes };
}
