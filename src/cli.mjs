#!/usr/bin/env bun
// paper-to-figma command line. Run `bun src/cli.mjs help`.
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, outputDir, settings } from "./files.mjs";
import { openBridge, exportNode } from "./bridge.mjs";
import { prepare } from "./paper.mjs";
import { lintFrame } from "./lint.mjs";
import { slug, client as openClient, checkFile, runQa, judgedAs, diagramReview } from "./ops.mjs";

const HELP = `paper-to-figma

  setup                          create a private pairing code and print the client settings
  doctor                         check the relay, the plugin and the page
  prepare <paper> --name N       index a paper (dir, .tex, .md or .txt) into work/N/
  check <spec.json> --paper N    design gate and evidence check of a figure spec
  build <spec.json> --paper N    check, then build the figure in Figma (--page P, --force to build despite errors)
  script <file.js>               run a figure script with the kit (--args '{"k":1}', --page P); with --spec S --paper N the
                                 spec is checked first and the script gets it as args.spec (numbers inside a diagram)
  inspect <frame>                node list of a frame (--page P)
  lint <frame>                   design checks of a built frame (--kind diagram|chart, --placement 0.5, --page P)
  export <frame>                 export to PDF (--format PNG, --scale 2, --out file, --page P)
  qa <file.pdf>                  PDF checks and strict-viewer render (needs Python with PyMuPDF; Ghostscript optional)
  verify <frame> --paper N       export, qa, lint and (with --spec S) evidence; writes work/N/verify-<frame>.md
                                 (--placement: share of \linewidth the figure takes; default: the spec, else what the build stored on the frame)

Connection: bun run relay + the Paper to Figma plugin (paired), or an existing Talk to Figma relay:
  P2F_TRANSPORT=talk-to-figma P2F_CHANNEL=<channel> bun src/cli.mjs doctor`;

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = {};
const pos = [];
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const k = argv[i].slice(2);
    flags[k] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  } else pos.push(argv[i]);
}
const print = (x) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));
// every connection is closed at the end, also after an error or a timeout, so the process always exits
const opened = [];
const client = async () => {
  const c = await openClient();
  opened.push(c);
  return c;
};
const target = (name) => (flags.id ? { nodeId: flags.id } : { name, page: flags.page });

try {
  if (!cmd || cmd === "help" || flags.help) print(HELP);
  else if (cmd === "setup") {
    const dir = await outputDir(".private");
    const file = path.join(dir, "connection.json");
    let cfg;
    try {
      cfg = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      cfg = { transport: "paired", endpoint: "ws://127.0.0.1:3057", channel: "p2f-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24) };
      await fs.writeFile(file, JSON.stringify(cfg, null, 2), { mode: 0o600 });
    }
    const mcp = path.join(ROOT, "src", "mcp.mjs");
    await fs.writeFile(path.join(dir, "mcp-client.json"), JSON.stringify({ mcpServers: { "paper-to-figma": { command: "bun", args: [mcp] } } }, null, 2));
    print(`Pairing code (private, paste into the Figma plugin): ${cfg.channel}

Claude Code:  claude mcp add paper-to-figma -- bun "${mcp}"
Codex:        codex mcp add paper-to-figma -- bun "${mcp}"
Other MCP clients: merge .private/mcp-client.json into the client configuration.

Next: bun run relay (keep it open), run the Paper to Figma plugin in Figma, paste the code, then bun run doctor.`);
  } else if (cmd === "doctor") {
    const cfg = await settings();
    const c = await openBridge(cfg);
    opened.push(c);
    const d = await c.request("document", {}, 20000);
    c.close();
    print({ connected: true, transport: c.transport, page: d.page.name, pages: d.pages, frames: d.frames.length, scriptsAllowed: d.allowScripts });
  } else if (cmd === "prepare") {
    if (!pos[0] || !flags.name) throw new Error("usage: prepare <paper dir or file> --name N [--entry main.tex]");
    const { index, text } = await prepare(pos[0], { entry: flags.entry });
    const dir = await outputDir(path.join("work", slug(flags.name)));
    await fs.writeFile(path.join(dir, "source-index.json"), JSON.stringify(index, null, 2));
    await fs.writeFile(path.join(dir, "source.txt"), text);
    print({
      dir: path.relative(ROOT, dir),
      anonymous: index.anonymous,
      sections: index.sections.length,
      figures: index.figures.map((f) => `${f.id}: ${f.caption.slice(0, 90)}${f.sketch ? "  [the authors describe this figure inside it: read index.figures[].sketch and follow it]" : ""}`),
      tables: index.tables.map((t) => `${t.id} (${t.source}, ${t.confidence}): ${t.rows.length} rows x ${t.columns.length || "?"} cols; ${t.caption.slice(0, 70)}`),
    });
  } else if (cmd === "check") {
    const { decisions, gate, ev, out } = await checkFile(pos[0], flags.paper);
    print({ layout: decisions, gate: { ok: gate.ok, errors: gate.errors, warnings: gate.warnings }, evidence: ev.summary, lowConfidence: ev.lowConfidence, problems: ev.report.filter((r) => !["ok", "todo"].includes(r.status)).slice(0, 30), report: path.relative(ROOT, out) });
    if (!gate.ok || !ev.pass) process.exitCode = 1;
  } else if (cmd === "build") {
    const { decisions, gate, ev } = await checkFile(pos[0], flags.paper);
    if ((!gate.ok || !ev.pass) && !flags.force) {
      print({ refused: true, gate: gate.errors, evidence: ev.summary, problems: ev.report.filter((r) => !["ok", "todo", "external"].includes(r.status)).slice(0, 20) });
      process.exitCode = 1;
    } else {
      const c = await client();
      const r = await c.request("build", { spec: ev.clean, page: flags.page, x: flags.x ? +flags.x : undefined, y: flags.y ? +flags.y : undefined });
      c.close();
      print({ built: r, layout: decisions, warnings: gate.warnings, evidence: ev.summary });
    }
  } else if (cmd === "script") {
    const code = await fs.readFile(pos[0], "utf8");
    const c = await client();
    const args = flags.args ? JSON.parse(flags.args) : {};
    if (flags.page) args.page ??= flags.page;
    // numbers drawn inside a diagram (a result panel of a teaser) come from a checked spec, like any chart
    if (flags.spec) {
      const { gate, ev } = await checkFile(flags.spec, flags.paper);
      if ((!gate.ok || !ev.pass) && !flags.force) {
        print({ refused: true, gate: gate.errors, evidence: ev.summary, problems: ev.report.filter((r) => !["ok", "todo", "external"].includes(r.status)).slice(0, 20) });
        process.exitCode = 1;
        throw new Error("the spec given with --spec did not pass check");
      }
      args.spec = ev.clean;
    }
    const r = await c.request("script", { code, args, page: args.page });
    c.close();
    print(r);
  } else if (cmd === "inspect") {
    const c = await client();
    print(await c.request("inspect", target(pos[0])));
    c.close();
  } else if (cmd === "lint") {
    const c = await client();
    const data = await c.request("inspect", target(pos[0]));
    c.close();
    const r = lintFrame(data, await judgedAs(data, { kind: flags.kind, placement: flags.placement ? +flags.placement : undefined }));
    print(r);
    if (!r.ok) process.exitCode = 1;
  } else if (cmd === "export") {
    const c = await client();
    const format = (flags.format || "PDF").toUpperCase();
    const { meta, bytes } = await exportNode(c, target(pos[0]), { format, scale: flags.scale ? +flags.scale : undefined });
    c.close();
    const out = flags.out ? path.resolve(flags.out) : path.join(await outputDir("work/renders"), `${slug(meta.name)}.${format.toLowerCase()}`);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, bytes);
    print({ file: out, bytes: bytes.length, width: meta.width, height: meta.height, imagesPreloaded: meta.images });
  } else if (cmd === "qa") {
    const r = runQa(path.resolve(pos[0]), flags.out);
    print(r);
    if (!r.pass) process.exitCode = 1;
  } else if (cmd === "verify") {
    if (!pos[0] || !flags.paper) throw new Error("usage: verify <frame> --paper N [--spec S] [--kind diagram|chart]");
    const dir = await outputDir(path.join("work", slug(flags.paper)));
    const c = await client();
    const data = await c.request("inspect", target(pos[0]));
    const judged = await judgedAs(data, { kind: flags.kind, placement: flags.placement ? +flags.placement : undefined, specPath: flags.spec });
    const lint = lintFrame(data, judged);
    const { meta, bytes } = await exportNode(c, target(pos[0]), { format: "PDF" });
    c.close();
    const pdf = path.join(dir, `${slug(meta.name)}.pdf`);
    await fs.writeFile(pdf, bytes);
    const qa = runQa(pdf, path.join(dir, "qa"));
    lint.warnings.push(...(await diagramReview(data, judged, qa, dir)));
    let ev = null;
    if (flags.spec) ev = (await checkFile(flags.spec, flags.paper)).ev;
    const pass = lint.ok && qa.pass && (!ev || ev.pass);
    const lines = [
      `# Verification: ${meta.name}`,
      ``,
      `Result: ${pass ? "PASS" : "FAIL"}  (${new Date().toISOString().slice(0, 16)})`,
      `Size: ${Math.round(meta.width)} x ${Math.round(meta.height)} px, ${lint.info.format} (${lint.info.aspect}:1) at ${judged.placement} of \\linewidth; ${lint.info.printScale}`,
      ``,
      `## Evidence`,
      ev ? `ok ${ev.summary.ok}, mismatch ${ev.summary.mismatch}, unsourced ${ev.summary.unsourced}, external ${ev.summary.external}, todo ${ev.summary.todo}${ev.lowConfidence ? `; ${ev.lowConfidence} values cite a plain-text table: check them against the PDF` : ""}` : "No spec given (diagram figure): check every label against the paper by reading it.",
      ...(ev ? ev.report.filter((r) => !["ok"].includes(r.status)).map((r) => `- ${r.status}: ${r.where}: ${r.value}${r.message ? ` (${r.message})` : ""}`) : []),
      ``,
      `## Design lint`,
      ...lint.errors.map((e) => `- error: ${e}`),
      ...lint.warnings.map((w) => `- warning: ${w}`),
      `- text sizes: ${lint.info.textSizes.map((s) => `${s.px}px/${s.pt}pt x${s.count}`).join(", ")}`,
      ...(lint.info.words ? [`- label words: ${lint.info.words.count} (budget ${lint.info.words.budget} for a ${lint.info.words.type})`] : []),
      ...(lint.info.levels ? [`- hierarchy: level 1 x${lint.info.levels[1]}, level 2 x${lint.info.levels[2]}, level 3 x${lint.info.levels[3]} (elements with text)`] : []),
      ``,
      `## PDF`,
      `- soft masks ${qa.soft_masks}, transparency groups ${qa.transparency_groups}, alpha values [${qa.alpha_values}], placeholder fills ${qa.placeholder_fills}, strict diff ${qa.strict_diff ?? "n/a"}`,
      ...qa.errors.map((e) => `- error: ${e}`),
      ...qa.warnings.map((w) => `- warning: ${w}`),
      `- renders: ${qa.render_normal}${qa.render_strict ? `, ${qa.render_strict}` : ""}`,
      ``,
      `Look at both renders before calling the figure done. Automated checks do not judge layout, emphasis or wording.`,
    ];
    const report = path.join(dir, `verify-${slug(meta.name)}.md`);
    await fs.writeFile(report, lines.join("\n"));
    print({ pass, report, pdf, lint: { errors: lint.errors, warnings: lint.warnings }, qa: { pass: qa.pass, errors: qa.errors, warnings: qa.warnings }, evidence: ev?.summary });
    if (!pass) process.exitCode = 1;
  } else throw new Error(`unknown command ${cmd}\n\n${HELP}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  for (const c of opened)
    try {
      c.close();
    } catch {}
}
