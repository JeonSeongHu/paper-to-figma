// Source inventory of a paper: sections, figure captions and tables with addressable cells.
// Reads TeX, Markdown, or plain text extracted from a PDF. It does not compile TeX and it does not interpret the paper;
// the agent reads the text. Tables parsed from plain text are marked low confidence and must be checked by eye.
import fs from "node:fs/promises";
import path from "node:path";

export const norm = (s) =>
  String(s)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// --- TeX ---------------------------------------------------------------------------------------------------------

function braced(src, i) {
  // src[i] === "{": return [content, indexAfter]
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "\\") {
      j++;
      continue;
    }
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return [src.slice(i + 1, j), j + 1];
  }
  return [src.slice(i + 1), src.length];
}
function command(src, name) {
  const i = src.indexOf("\\" + name + "{");
  return i < 0 ? null : braced(src, i + name.length + 1)[0];
}
// Expand the paper's own macros (\newcommand{\method}{\textsc{Name}}, \newcommand{\todo}[1]{...#1...}) so method
// names and TODO markers survive in captions, tables and text. The definitions themselves are removed.
export function expandMacros(src) {
  const defs = [];
  const re = /\\(?:newcommand|renewcommand|providecommand)\*?\s*(?:\{\\([a-zA-Z]+)\}|\\([a-zA-Z]+))\s*(?:\[(\d)\])?\s*\{/g;
  let t = "",
    last = 0,
    m;
  while ((m = re.exec(src))) {
    const [body, end] = braced(src, m.index + m[0].length - 1);
    defs.push({ name: m[1] || m[2], n: +(m[3] || 0), body });
    t += src.slice(last, m.index);
    last = re.lastIndex = end;
  }
  t += src.slice(last);
  const skip = new Set(["arraystretch", "baselinestretch"]);
  for (let pass = 0; pass < 3; pass++)
    for (const d of defs) {
      if (skip.has(d.name)) continue;
      const call = new RegExp(`\\\\${d.name}(?![a-zA-Z])`, "g");
      let out = "",
        from = 0,
        c;
      while ((c = call.exec(t))) {
        let i = c.index + c[0].length;
        const args = [];
        for (let k = 0; k < d.n; k++) {
          while (t[i] === " ") i++;
          if (t[i] !== "{") break;
          const [a, e] = braced(t, i);
          args.push(a);
          i = e;
        }
        if (args.length < d.n) continue;
        if (!d.n && t.slice(i, i + 2) === "{}") i += 2;
        out += t.slice(from, c.index) + d.body.replace(/#(\d)/g, (_, k) => args[k - 1] ?? "");
        from = call.lastIndex = i;
      }
      t = out + t.slice(from);
    }
  return t;
}
// Plain text of a TeX fragment: keep the content of formatting commands, drop the rest. Citations, labels and row
// colours are dropped with their arguments; common math symbols become characters. { paragraphs: true } keeps blank
// lines between paragraphs (for source.txt, which the agent reads from start to end).
const SYMBOLS = { alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", epsilon: "ε", eta: "η", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", omega: "ω", varnothing: "∅", emptyset: "∅", infty: "∞", leq: "≤", geq: "≥", le: "≤", ge: "≥", neq: "≠", approx: "≈", sim: "~", cdot: "·", rightarrow: "→", to: "→", leftarrow: "←", in: "∈", ldots: "...", dots: "...", star: "★" };
export function texText(s, { paragraphs = false } = {}) {
  let t = String(s);
  t = t.replace(/(?<!\\)%.*$/gm, "");
  t = t.replace(/\\(?:cite[a-zA-Z]*|label|rowcolor|vspace|hspace|includegraphics|bibliographystyle|bibliography)\*?(\[[^\]]*\])*\{[^{}]*\}/g, "");
  t = t.replace(/\\(?:ref|eqref|autoref|cref|Cref)\{[^{}]*\}/g, "?");
  t = t.replace(/\\([a-zA-Z]+)(?![a-zA-Z])/g, (m, name) => SYMBOLS[name] ?? m);
  for (let k = 0; k < 4; k++) t = t.replace(/\\(?:textbf|textit|emph|underline|mathbf|mathrm|text|textsc|texttt|uline|boldsymbol|bm|cellcolor\{[^}]*\}|textcolor\{[^}]*\})\s*\{([^{}]*)\}/g, "$1");
  t = t.replace(/\\color\{[^}]*\}/g, "").replace(/\\\\/g, " ").replace(/\\[,;:! ]/g, " ");
  t = t.replace(/\\cellcolor(\[[^\]]*\])?\{[^}]*\}/g, "");
  t = t.replace(/\\(?:pm)/g, "±").replace(/\\times/g, "×").replace(/\\%/g, "%").replace(/\\&/g, "&").replace(/\\_/g, "_");
  t = t.replace(/\\(?:uparrow)/g, "↑").replace(/\\(?:downarrow)/g, "↓");
  t = t.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, " ");
  t = t.replace(/[${}~]/g, " ").replace(/_(?=\s|$)/g, "").replace(/\^/g, "");
  if (paragraphs)
    return t
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").replace(/\s*±\s*/g, "±").trim())
      .filter(Boolean)
      .join("\n\n");
  return t.replace(/\s+/g, " ").replace(/\s*±\s*/g, "±").trim();
}
// Split a tabular body into rows at \\ outside braces (a \makecell{Bin\\Fill} header is one cell).
function splitRows(content) {
  const rows = [];
  let cur = "",
    depth = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === "\\" && content[i + 1] === "\\") {
      if (depth === 0) {
        rows.push(cur);
        cur = "";
        i++;
        const opt = content.slice(i + 1).match(/^\s*\[[^\]]*\]/);
        if (opt) i += opt[0].length;
        continue;
      }
      cur += " ";
      i++;
      continue;
    }
    if (c === "\\") {
      cur += c + (content[i + 1] ?? "");
      i++;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") depth--;
    cur += c;
  }
  rows.push(cur);
  return rows;
}
function splitCells(row) {
  const cells = [];
  let cur = "",
    depth = 0;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === "\\" && row[i + 1] === "&") {
      cur += "\\&";
      i++;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") depth--;
    if (c === "&" && depth === 0) {
      cells.push(cur);
      cur = "";
    } else cur += c;
  }
  cells.push(cur);
  return cells;
}
// Expand \multicolumn{n}{..}{text} into n cells carrying the text.
function expandRow(cells) {
  const out = [];
  for (const raw of cells) {
    const m = raw.match(/\\multicolumn\{(\d+)\}\{[^}]*\}\{/);
    if (m) {
      const [text] = braced(raw, raw.indexOf("{", m.index + m[0].length - 1));
      for (let k = 0; k < +m[1]; k++) out.push(texText(text));
    } else out.push(texText(raw.replace(/\\multirow\{[^}]*\}\{[^}]*\}/g, "")));
  }
  return out;
}
export function texTables(src) {
  const tables = [];
  const re = /\\begin\{table\*?\}([\s\S]*?)\\end\{table\*?\}/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[1];
    const caption = texText(command(body, "caption") || "");
    const label = command(body, "label") || null;
    const tab = body.match(/\\begin\{tabular[x*]?\}(?:\{[^}]*\})?\{((?:[^{}]|\{[^{}]*\})*)\}([\s\S]*?)\\end\{tabular[x*]?\}/);
    if (!tab) continue;
    let content = tab[2].replace(/(?<!\\)%.*$/gm, "");
    // rows before the first \midrule are header rows
    const midIdx = content.search(/\\midrule|\\hline/);
    const lines = splitRows(content.replace(/\\(toprule|bottomrule|hline)/g, "")).map((r) => r.replace(/\\cmidrule(\([^)]*\))?\{[^}]*\}/g, "").trim());
    let headerRows = 0,
      acc = 0;
    const firstMid = content.indexOf("\\midrule");
    if (firstMid >= 0) {
      const head = content.slice(0, firstMid).replace(/\\toprule|\\hline/g, "");
      headerRows = splitRows(head).filter((r) => r.replace(/\\cmidrule(\([^)]*\))?\{[^}]*\}/g, "").trim()).length;
    } else if (midIdx >= 0) headerRows = 1;
    const rows = lines
      .map((l) => l.replace(/\\midrule/g, "").trim())
      .filter((l) => l)
      .map((l) => expandRow(splitCells(l)));
    acc = Math.min(headerRows, rows.length);
    tables.push(makeTable(tables.length + 1, caption, label, rows.slice(0, acc), rows.slice(acc), "tex", "high"));
  }
  return tables;
}
export function texSections(src) {
  const out = [];
  const re = /\\(section|subsection|paragraph)\*?\{/g;
  let m;
  while ((m = re.exec(src))) out.push({ level: m[1], title: texText(braced(src, m.index + m[0].length - 1)[0]) });
  return out;
}
export function texFigures(src) {
  const out = [];
  const re = /\\begin\{figure\*?\}([\s\S]*?)\\end\{figure\*?\}/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[1];
    const f = { id: "F" + (out.length + 1), caption: texText(command(body, "caption") || ""), label: command(body, "label") || null };
    // text drawn inside the figure environment itself: a placeholder or a sketch the authors wrote for the figure
    // ("to be drawn", a box describing the layout). It is the authors' requirement for that figure.
    let rest = body;
    for (const name of ["caption", "label"]) {
      const i = rest.indexOf("\\" + name + "{");
      if (i >= 0) rest = rest.slice(0, i) + rest.slice(braced(rest, i + name.length + 1)[1]);
    }
    const sketch = texText(rest);
    if ((sketch.match(/[A-Za-z]{2,}/g) || []).length >= 8) {
      f.sketch = sketch;
      // the number the authors gave the figure in the sketch title ("Figure 3 -- ..."), which can differ from the order
      const n = sketch.match(/Figure\s+(\d+)\s*[-–—]/);
      if (n) f.sketchNumber = +n[1];
    }
    out.push(f);
  }
  return out;
}

// --- Markdown ----------------------------------------------------------------------------------------------------

export function mdTables(src) {
  const lines = src.split(/\r?\n/);
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i]) || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || "")) continue;
    const block = [];
    let j = i;
    while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) block.push(lines[j++]);
    const cells = (l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.replace(/\*\*|__|`/g, "").trim());
    const header = [cells(block[0])];
    const rows = block.slice(2).map(cells);
    // caption: the nearest "Table N" line above (within 3 lines) or below
    let caption = "";
    for (const k of [i - 1, i - 2, i - 3, j, j + 1]) {
      const l = (lines[k] || "").replace(/^[*_#>\s]+/, "");
      if (/^table\s*\d+/i.test(l)) {
        caption = l.replace(/[*_]+$/g, "").trim();
        break;
      }
    }
    tables.push(makeTable(tables.length + 1, caption, null, header, rows, "md", "high"));
    i = j;
  }
  return tables;
}

// --- Plain text (from a PDF) ---------------------------------------------------------------------------------------

// Review copies print line numbers ("163 Table 1: ..."); drop them when most lines have them.
export function stripLineNumbers(src) {
  const lines = src.split(/\r?\n/);
  const numbered = lines.filter((l) => /^\s*\d{3,4}\s/.test(l)).length;
  if (numbered < lines.filter((l) => l.trim()).length * 0.4) return src;
  return lines.map((l) => l.replace(/^\s*\d{3,4}(\s{1,2}|$)/, "")).join("\n");
}
const NUM = /[-+]?\d+(?:\.\d+)?%?/g;
export function textTables(src) {
  const lines = src.split(/\r?\n/);
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    const cap = lines[i].match(/^\s*(Table\s+\d+[.:].*)$/);
    if (!cap) continue;
    const { caption, next: k } = captionFrom(lines, i, cap[1]);
    // rows: lines with a short label and about as many numbers as the first row; the table ends at a long run without
    // numbers, at a caption, or at a line that looks like prose (long label or a very different count of numbers).
    // A row label may carry the text of a multirow cell of the next column ("Method A Variant B"); the row is
    // still found by the start of its label.
    const rows = [],
      headerLines = [];
    let miss = 0,
      width = 0;
    for (let j = k; j < Math.min(lines.length, k + 80) && miss < 6; j++) {
      const l = lines[j].trim();
      if (!l) continue;
      const nums = l.match(NUM) || [];
      if (/^(Figure|Table)\s+\d+/.test(l)) break;
      const first = l.search(/[-+]?\d/);
      const label = first < 0 ? l : l.slice(0, first).trim();
      const prose = label.split(/\s+/).length > 6;
      if (nums.length >= 2 && !prose && (!width || Math.abs(nums.length - width) <= 2)) {
        rows.push([label || `row ${rows.length + 1}`, ...nums]);
        width ||= nums.length;
        miss = 0;
      } else if (rows.length) {
        if (nums.length >= 2 || prose) break;
        miss++;
      } else if (headerLines.length < 12) headerLines.push(l);
    }
    const table = makeTable(tables.length + 1, caption, null, [], rows, "text", "low");
    // column names: the last header line split at runs of two or more spaces, when it has a name for every number
    // column (leading names belong to row-label columns). Arrows such as up and down marks are usually lost in the PDF text.
    const nCols = Math.max(0, ...rows.map((r) => r.length - 1));
    const names = (headerLines.at(-1) || "").split(/\s{2,}/).map((x) => x.trim()).filter(Boolean);
    let guessed = false;
    if (nCols && names.length >= nCols) {
      table.columns = ["", ...names.slice(-nCols)];
      guessed = true;
    }
    tables.push({
      ...table,
      headerLines,
      columnsGuessed: guessed,
      note: guessed
        ? "Parsed from plain text: column names come from the last header line; check them and every row against the PDF."
        : "Parsed from plain text: columns have no names (cite them by 0-based index, with headerLines as the guide) and each row must be checked against the PDF.",
    });
  }
  return tables;
}
// A caption runs from its "Figure N:" or "Table N:" line to the end of its last sentence. PDF text puts blank lines
// inside captions, so a blank line ends the caption only after a line that ends a sentence (or after two blank lines).
// Words broken at a line end ("de-" + "noising") are joined.
function captionFrom(lines, i, first) {
  let caption = first.trim(),
    k = i + 1,
    blanks = 0;
  while (k < lines.length && caption.length < 1200) {
    const l = lines[k].trim();
    if (!l) {
      if (++blanks >= 2 || /[.!?:]["')\]]?$/.test(caption)) break;
      k++;
      continue;
    }
    if (/^(Figure|Table)\s+\d+[.:]/.test(l)) break;
    // a line of mostly numbers is table data, not caption text
    const nums = (l.match(/\d+(?:\.\d+)?/g) || []).length,
      words = (l.match(/[A-Za-z]{2,}/g) || []).length;
    if (nums >= 2 && nums >= words * 0.5) break;
    blanks = 0;
    caption = /[A-Za-z]-$/.test(caption) && /^[a-z]/.test(l) ? caption.slice(0, -1) + l : caption + " " + l;
    k++;
  }
  return { caption: caption.replace(/\s+/g, " "), next: k };
}
export function textFigures(src) {
  const out = [];
  const lines = src.split(/\r?\n/);
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(Figure\s+(\d+)[.:].*)$/);
    if (m) out.push({ id: "F" + m[2], caption: captionFrom(lines, i, m[1]).caption });
  });
  return out;
}

// --- common ---------------------------------------------------------------------------------------------------------

function makeTable(n, caption, label, headerRows, rows, source, confidence) {
  const num = (caption.match(/Table\s+(\d+)/i) || [])[1];
  const width = Math.max(0, ...rows.map((r) => r.length), ...headerRows.map((r) => r.length));
  const columns = Array.from({ length: width }, (_, c) =>
    headerRows
      .map((r) => r[c] || "")
      .filter((x, k, a) => x && a.indexOf(x) === k)
      .join(" / "),
  );
  return {
    id: "T" + (num || n),
    caption,
    label,
    source,
    confidence,
    columns,
    rows: rows.map((r) => ({ label: r[0] ?? "", cells: r })),
  };
}

// Numeric value of a cell: first number in it, "12.3±0.4" -> 12.3, "45%" -> 45.
export function cellNumber(s) {
  const m = String(s).replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export async function prepare(inputPath, { entry } = {}) {
  const stat = await fs.stat(inputPath);
  const files = [];
  if (stat.isDirectory()) {
    const walk = async (d) => {
      for (const e of await fs.readdir(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) await walk(p);
        else if (/\.(tex|md|txt)$/i.test(e.name)) files.push(p);
      }
    };
    await walk(inputPath);
    if (entry) files.sort((a, b) => (path.basename(a) === entry ? -1 : path.basename(b) === entry ? 1 : 0));
  } else files.push(inputPath);
  const index = { files: [], anonymous: false, sections: [], figures: [], tables: [] };
  let fullText = "";
  for (const f of files) {
    let src = await fs.readFile(f, "utf8");
    const kind = path.extname(f).slice(1).toLowerCase();
    index.files.push(path.basename(f));
    if (kind === "tex") {
      src = expandMacros(src);
      index.sections.push(...texSections(src));
      index.figures.push(...texFigures(src));
      index.tables.push(...texTables(src));
      // a figure contributes only its caption: its sketch (index.figures[].sketch) holds requirements, not results
      const body = src
        .replace(/\\begin\{tabular[\s\S]*?\\end\{tabular\}/g, " ")
        .replace(/\\begin\{figure\*?\}([\s\S]*?)\\end\{figure\*?\}/g, (_, inner) => "\n\n\\textbf{Figure.} " + (command(inner, "caption") || "") + "\n\n");
      fullText += texText(body, { paragraphs: true }) + "\n";
    } else {
      if (kind === "txt") src = stripLineNumbers(src);
      if (kind === "md") {
        index.sections.push(...[...src.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => ({ level: "heading", title: m[1].trim() })));
        index.tables.push(...mdTables(src));
        index.figures.push(...textFigures(src));
      } else {
        index.sections.push(...[...src.matchAll(/^\s*(\d+(?:\.\d+)*\s+[A-Z][A-Z0-9 \-&:?,'’/().]{3,})\s*$/gm)].map((m) => ({ level: "heading", title: m[1].trim() })));
        index.tables.push(...textTables(src));
        index.figures.push(...textFigures(src));
      }
      fullText += src + "\n";
    }
  }
  // renumber duplicate table ids
  const seen = {};
  for (const t of index.tables) {
    if (seen[t.id]) t.id = `${t.id}.${++seen[t.id]}`;
    else seen[t.id] = 1;
  }
  index.anonymous = /anonymous author|double-blind/i.test(fullText);
  index.characters = fullText.length;
  return { index, text: fullText };
}
