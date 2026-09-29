// Pure helpers shared by the Figma kit and the Node checks. No Figma API here, so tests can run them.

// Round axis limits outwards to a step of 1, 2, 2.5 or 5 times a power of ten with at most n intervals.
export function niceTicks(min, max, n = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error("niceTicks needs finite limits");
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const mag = Math.pow(10, Math.floor(Math.log10(span / n)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n + 1e-9);
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return { lo, hi, step, ticks };
}

// Fixed range by hand: [lo, hi, step]. Use it when the automatic step prints awkward labels.
export function fixedTicks(lo, hi, step) {
  const ticks = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return { lo, hi, step, ticks };
}

// Tick label with as many decimals as the step needs. 0.25 steps print 0.75, not 0.8.
export function tickLabel(v, step) {
  if (step >= 1 && Number.isInteger(+step.toFixed(9))) return String(Math.round(v));
  const s = String(+step.toFixed(9));
  const decimals = Math.min(3, (s.split(".")[1] || "").length);
  return v.toFixed(decimals);
}

// Each radar axis as a share of the best of the compared methods, inverted when lower is better.
// Honest by construction: the best method sits on the outer ring, the origin is zero.
export function radarRatios(values, lowerIsBetter) {
  const ok = values.filter((v) => Number.isFinite(v));
  if (ok.length !== values.length) throw new Error("radar axis has a missing value");
  if (ok.some((v) => v <= 0) && lowerIsBetter) throw new Error("lower-is-better axis needs positive values");
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  return values.map((v) => (lowerIsBetter ? best / v : v / best));
}

// Point-in-convex-polygon test used to keep legends and labels off the radar.
export function insideConvex(poly, x, y) {
  let pos = 0,
    neg = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i],
      [bx, by] = poly[(i + 1) % poly.length];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c > 0) pos++;
    else if (c < 0) neg++;
  }
  return !(pos && neg);
}
export const rectsOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Highest y at which a box of size (w, h) placed at x stays clear of the rects and the polygon, scanning up from y0.
// Returns null when even the start position collides.
export function highestClearY({ x, y0, w, h, rects = [], poly = null, step = 2 }) {
  const hits = (y) => {
    const box = { x, y, w, h };
    if (rects.some((r) => rectsOverlap(box, r))) return true;
    if (!poly) return false;
    for (let k = 0; k <= 24; k++) {
      const s = k / 24;
      for (const [px, py] of [
        [x + s * w, y],
        [x + s * w, y + h],
        [x, y + s * h],
        [x + w, y + s * h],
      ])
        if (insideConvex(poly, px, py)) return true;
    }
    return poly.some(([px, py]) => px > x && px < x + w && py > y && py < y + h);
  };
  if (hits(y0)) return null;
  let y = y0;
  while (y - step >= 0 && !hits(y - step)) y -= step;
  return y;
}

// Keep a half-open polygon (convex clip against the half plane f(p) >= 0). Used to cut hatch stripes to a tile so the
// tile needs no clipping frame (Figma writes clip frames as PDF soft masks).
export function clipHalf(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i],
      Q = poly[(i + 1) % poly.length],
      fp = f(P),
      fq = f(Q);
    if (fp >= 0) out.push(P);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
    }
  }
  return out;
}

// SVG path of 45-degree stripes cut to a square of side s with an inset a.
export function hatchPath(s, { width = 5, pitch = 14, inset = 1.2 } = {}) {
  const hw = (width / 2) * Math.SQRT2;
  let d = "";
  for (let c = 0; c <= 2 * s; c += pitch) {
    let poly = [
      [inset, inset],
      [s - inset, inset],
      [s - inset, s - inset],
      [inset, s - inset],
    ];
    poly = clipHalf(poly, (p) => p[0] + p[1] - (c - hw));
    poly = clipHalf(poly, (p) => c + hw - (p[0] + p[1]));
    if (poly.length >= 3) d += "M" + poly.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" L") + " Z ";
  }
  return d.trim();
}
