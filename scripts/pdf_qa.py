"""PDF checks for figures exported from Figma.

Usage: python scripts/pdf_qa.py FIGURE.pdf [--out DIR] [--print-width-pt 396]

Finds what broke figures in real viewers:
  soft masks        Figma writes every mask and clipping frame as /SMask; some viewers draw black or empty boxes
  transparency      fill-opacity and group opacity turn solid in viewers that ignore transparency
  placeholder fill  an image exported before it loaded comes out as a flat lavender (0.87, 0.68, 0.93) box
  margins           white space around the figure wastes the column
It renders the page twice: MuPDF (normal) and Ghostscript with -dNOTRANSPARENCY (a strict viewer). A large difference
between the two means the figure depends on transparency. Prints JSON; exit status 1 when a check fails.
Needs PyMuPDF (pip install pymupdf). Ghostscript is optional but recommended.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

import fitz  # PyMuPDF

PLACEHOLDER = (0.87, 0.68, 0.93)


def find_ghostscript():
    for name in ("gswin64c", "gswin32c", "gs"):
        p = shutil.which(name)
        if p:
            return p
    for root in (r"C:\Program Files\gs", r"C:\Program Files (x86)\gs"):
        if os.path.isdir(root):
            for v in sorted(os.listdir(root), reverse=True):
                p = os.path.join(root, v, "bin", "gswin64c.exe")
                if os.path.exists(p):
                    return p
    return None


def objects(doc):
    counts = {"soft_masks": 0, "transparency_groups": 0, "constant_alpha": 0, "images": 0}
    alphas = set()
    for x in range(1, doc.xref_length()):
        try:
            o = doc.xref_object(x) or ""
        except Exception:
            continue
        if re.search(r"/SMask\s*<<|/Type\s*/Mask\b", o):
            counts["soft_masks"] += 1
        if re.search(r"/S\s*/Transparency", o):
            counts["transparency_groups"] += 1
        for a in re.findall(r"/(?:ca|CA)\s+([0-9.]+)", o):
            if float(a) < 0.999:
                alphas.add(round(float(a), 3))
        if re.search(r"/Subtype\s*/Image", o):
            counts["images"] += 1
    counts["constant_alpha"] = len(alphas)
    return counts, sorted(alphas)


def placeholder_fills(page):
    hits = 0
    for d in page.get_drawings():
        c = d.get("fill")
        if c and all(abs(a - b) < 0.02 for a, b in zip(c, PLACEHOLDER)):
            hits += 1
    return hits


def content_margins(pix):
    """Distance in px (at render scale) from each page edge to the first non-white pixel."""
    w, h, n = pix.width, pix.height, pix.n
    s = pix.samples

    def white(x, y):
        i = (y * w + x) * n
        return s[i] > 245 and s[i + 1] > 245 and s[i + 2] > 245

    def scan(outer, inner, get):
        for a in outer:
            if any(not get(a, b) for b in inner):
                return a
        return None

    top = scan(range(h), range(0, w, 2), lambda y, x: white(x, y))
    bottom = scan(range(h - 1, -1, -1), range(0, w, 2), lambda y, x: white(x, y))
    left = scan(range(w), range(0, h, 2), lambda x, y: white(x, y))
    right = scan(range(w - 1, -1, -1), range(0, h, 2), lambda x, y: white(x, y))
    if top is None:
        return None
    return {"top": top, "bottom": h - 1 - bottom, "left": left, "right": w - 1 - right}


def diff_ratio(a_png, b_png, where=False, skip=()):
    """Share of pixels that change by more than a visible amount between two renders of the same size.
    skip: pixel boxes to ignore (photos: Ghostscript smooths images differently when transparency is off)."""
    import numpy as np

    a, b = fitz.Pixmap(a_png), fitz.Pixmap(b_png)
    if (a.width, a.height) != (b.width, b.height):
        return (None, None) if where else None
    A = np.frombuffer(a.samples, dtype=np.uint8).reshape(a.height, a.width, a.n)[..., :3].astype(np.int16)
    B = np.frombuffer(b.samples, dtype=np.uint8).reshape(b.height, b.width, b.n)[..., :3].astype(np.int16)
    mask = np.abs(A - B).sum(axis=2) > 120
    for x0, y0, x1, y1 in skip:
        mask[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = False
    ratio = float(mask.mean())
    if not where:
        return ratio
    ys, xs = np.nonzero(mask)
    box = None if not len(xs) else [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    return ratio, box


def largest_hole(pix, min_side_frac=0.08, cell_frac=0.01):
    """Largest empty rectangle inside the drawn area whose both sides are at least min_side_frac of the width.

    The render is cut into cells of about 1% of the width; a cell is ink when any pixel in it is not near white, and ink
    grows by one cell so that the space right next to a label does not count. Returns [x, y, w, h] in render pixels.
    """
    import numpy as np

    A = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[..., :3].astype(np.int16)
    # light tints behind lanes and bands (every channel 228 or more) are background, not ink
    ink = A.min(axis=2) < 228
    ys, xs = np.nonzero(ink)
    if not len(xs):
        return None
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    ink = ink[y0:y1, x0:x1]
    c = max(2, int(round(pix.width * cell_frac)))
    H, W = ink.shape
    gh, gw = -(-H // c), -(-W // c)
    pad = np.zeros((gh * c, gw * c), dtype=bool)
    pad[:H, :W] = ink
    grid = pad.reshape(gh, c, gw, c).any(axis=(1, 3))
    g = grid.copy()
    g[1:, :] |= grid[:-1, :]
    g[:-1, :] |= grid[1:, :]
    g[:, 1:] |= grid[:, :-1]
    g[:, :-1] |= grid[:, 1:]
    empty = ~g
    ms = max(1, int(np.ceil(pix.width * min_side_frac / c)))
    best = None
    h = np.zeros(gw, dtype=int)
    for r in range(gh):
        h = np.where(empty[r], h + 1, 0)
        stack = []
        for i in range(gw + 1):
            cur = int(h[i]) if i < gw else 0
            start = i
            while stack and stack[-1][1] >= cur:
                s, hh = stack.pop()
                w = i - s
                if w >= ms and hh >= ms and (best is None or w * hh > best[2] * best[3]):
                    best = (s, r - hh + 1, w, hh)
                start = s
            stack.append((start, cur))
    if not best:
        return None
    s, r, w, hh = best
    return [int(x0 + s * c), int(y0 + r * c), int(w * c), int(hh * c)]


def coverage(pix, reach_frac=0.01):
    """Share of the figure within reach_frac of the width from any ink (light lane tints do not count as ink).

    Thin lines split empty space into pieces that no empty-rectangle test finds; this measures how much of the figure
    is taken by elements at all. Approved method figures measured about 0.40.
    """
    import numpy as np

    A = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[..., :3]
    ink = A.min(axis=2) < 228
    r = max(1, int(round(pix.width * reach_frac)))

    def grow(m, axis):
        c = np.cumsum(np.pad(m.astype(np.int32), [(r + 1, r) if a == axis else (0, 0) for a in range(2)]), axis=axis)
        hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
        lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
        return (hi - lo) > 0

    return float(grow(grow(ink, 1), 0).mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out", default=None)
    ap.add_argument("--print-width-pt", type=float, default=396.0)
    ap.add_argument("--dpi", type=int, default=110)
    ap.add_argument("--hole-side", type=float, default=0.08)
    args = ap.parse_args()
    out = args.out or os.path.join(os.path.dirname(os.path.abspath(args.pdf)), "qa")
    os.makedirs(out, exist_ok=True)
    stem = os.path.splitext(os.path.basename(args.pdf))[0]

    doc = fitz.open(args.pdf)
    page = doc[0]
    W, H = page.rect.width, page.rect.height
    counts, alphas = objects(doc)
    report = {
        "file": os.path.abspath(args.pdf),
        "pages": doc.page_count,
        "size_px": [round(W, 1), round(H, 1)],
        "print": {"width_pt": args.print_width_pt, "scale_pt_per_px": round(args.print_width_pt / W, 4), "height_in": round(H * args.print_width_pt / W / 72, 2)},
        **counts,
        "alpha_values": alphas,
        "placeholder_fills": placeholder_fills(page),
        "errors": [],
        "warnings": [],
    }
    normal = os.path.join(out, f"{stem}.normal.png")
    pix = page.get_pixmap(dpi=args.dpi)
    pix.save(normal)
    report["render_normal"] = normal
    m = content_margins(pix)
    if m:
        k = W / pix.width
        report["margins_px"] = {s: round(v * k, 1) for s, v in m.items()}
        if max(report["margins_px"].values()) > 12:
            report["warnings"].append(f"white margin up to {max(report['margins_px'].values())} px; trim the frame so the figure fills the column")
    report["coverage"] = round(coverage(pix), 3)
    hole = largest_hole(pix, args.hole_side)
    if hole:
        k = W / pix.width
        report["largest_hole_px"] = [round(v * k) for v in hole]
        report["largest_hole_share"] = round(hole[2] * hole[3] / (pix.width * pix.height), 4)

    gs = find_ghostscript()
    if gs:
        # both renders come from Ghostscript, so only the transparency setting differs between them
        def gs_render(path, strict):
            cmd = [gs, "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4", "-sDEVICE=png16m", f"-r{args.dpi}", f"-sOutputFile={path}", args.pdf]
            if strict:
                cmd.insert(4, "-dNOTRANSPARENCY")
            return subprocess.run(cmd, capture_output=True, text=True)
        ref = os.path.join(out, f"{stem}.gs.png")
        strict = os.path.join(out, f"{stem}.notransparency.png")
        r1, r2 = gs_render(ref, False), gs_render(strict, True)
        if r1.returncode == 0 and r2.returncode == 0:
            report["render_strict"] = strict
            px = fitz.Pixmap(ref).width / W
            photos = [[int(r[0] * px) - 2, int(r[1] * px) - 2, int(r[2] * px) + 3, int(r[3] * px) + 3] for r in (i["bbox"] for i in page.get_image_info())]
            d, box = diff_ratio(ref, strict, where=True, skip=photos)
            report["strict_diff"] = None if d is None else round(d, 4)
            if box:
                k = W / fitz.Pixmap(ref).width
                report["strict_diff_box_px"] = [round(v * k) for v in box]
            if d is not None and d > 0.002:
                report["errors"].append(f"{d:.1%} of the figure changes when transparency is ignored; open {os.path.basename(strict)} and remove the transparency")
            os.remove(ref)
        else:
            report["warnings"].append("Ghostscript failed: " + ((r1.stderr or "") + (r2.stderr or ""))[:200])
    else:
        report["warnings"].append("Ghostscript not found: the strict viewer check was skipped (install it for the full check)")

    if counts["soft_masks"]:
        report["errors"].append(f"{counts['soft_masks']} soft mask object(s): turn off clipping (clipsContent) and masks, or bake the masked part into an image")
    if report["placeholder_fills"]:
        report["errors"].append("lavender placeholder fill found: an image was exported before it loaded; preload images and export again")
    if alphas:
        report["warnings"].append(f"transparency values {alphas}: check the strict render; blend colours with white instead")
    if doc.page_count != 1:
        report["warnings"].append("more than one page")
    report["pass"] = not report["errors"]
    print(json.dumps(report, indent=2, ensure_ascii=False))
    with open(os.path.join(out, f"{stem}.qa.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    sys.exit(0 if report["pass"] else 1)


if __name__ == "__main__":
    main()
