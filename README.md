<p align="center"><img src="docs/assets/teaser.png" alt="paper-to-figma" width="100%"></p>

# paper-to-figma

Verified paper figures in Figma, made by an agent from a paper's text.

The agent reads a paper (TeX, Markdown or text extracted from a PDF), plans the figures it needs (teaser, method
overview, method detail, result charts, summary radar, qualitative examples) and draws them as editable Figma frames.
Every number is checked against the paper, the layout follows a measured size spec, and the exported PDF is checked
against viewers that ignore transparency.

It extends [tex-to-figma-poster](https://github.com/JeonSeongHu/tex-to-figma-poster) from posters to paper figures and
reuses its local relay, pairing and plugin design.

**Status: v0.1.** Tested on Windows 11 with Figma desktop, Bun 1.3.14 and Python 3.9. The bundled example paper is
synthetic; its method and numbers are invented.

[Local setup (Korean)](docs/quickstart.ko.md) · [Figure principles (Korean)](docs/figure-principles.md) · [Figure spec](docs/figure-spec.md) · [Kit API](docs/kit-api.md) · [Security](SECURITY.md)

## How it works

1. **`prepare`** indexes the paper into `work/<name>/`: the text, figure captions, the authors' own figure sketches, and
   tables with addressable cells.
2. **Plan.** The agent writes one line per figure: the question it answers, its purpose, its format, what goes in and
   what stays out (the [skill](skills/paper-to-figma/SKILL.md) and the [principles](docs/figure-principles.md) decide).
3. **Draw.** Data figures are JSON specs (`check`, then `build`); diagrams are short scripts that use the kit.
4. **`verify`** exports the PDF and runs every check below; the agent then reads both renders against a checklist and
   repeats until clean.

## Why the checks exist

Each check comes from a failure in real figures:

- **Text shrinks.** Language models shrink text until everything fits. The size spec was measured on figures the author approved after repeated "make the text bigger" rounds; `lint` fails text under 1.2 % of the figure width at print size.
- **Numbers drift.** `check` refuses any value without a source in the paper, and any value that differs from the printed one at the printed precision. Numbers that appear only in the authors' figure sketches are not evidence.
- **PDFs break in some viewers.** Figma writes clipping frames and masks as soft masks, which some viewers draw as black boxes. Viewers that ignore transparency paint translucent fills solid. The kit never clips and never uses transparency, and `qa` compares a strict render with a normal one.
- **Layouts stretch.** Charts with two panels spread over the full width make 2.5 px lines look thin. The layout step keeps plot areas at the approved size and fits one of the two paper formats instead.
- **Diagrams drift into prose, or into puzzles.** Unchecked, agents write sentences into boxes; told to cut words, they leave icons nobody can decode. `lint` counts label words against a budget per figure type and flags long labels, repeated labels, unnamed icons, long blocked links, badges on most modules, and lower-level elements drawn larger than higher ones.
- **Space goes to waste.** A hole check finds empty rectangles, and a coverage measure catches space cut into pieces by thin lines.
- **Colours change meaning.** `check` records which method each colour stands for across the paper; diagrams declare their colour meanings and `verify` compares them.

## Quick start

```bash
git clone https://github.com/JeonSeongHu/paper-to-figma.git
cd paper-to-figma
bun install && bun run build && bun test
bun run setup            # prints a private pairing code
bun run relay            # keep this terminal open
```

In Figma desktop: **Plugins > Development > Import plugin from manifest**, choose `plugin/manifest.json`, run
**Paper to Figma**, paste the code, **Connect**. Then:

```bash
bun run doctor
bun src/cli.mjs prepare examples/anon-paper --name anchor
bun src/cli.mjs build examples/anon-paper/figures/training-curves.json --paper anchor --page "Figures"
bun src/cli.mjs verify "Anchor Tokens / training curves" --paper anchor --page "Figures" --spec examples/anon-paper/figures/training-curves.json
```

An existing Talk to Figma setup with an `execute_code` command also works: set `P2F_TRANSPORT=talk-to-figma` and
`P2F_CHANNEL=<channel>`.

### As an agent plugin

Claude Code (skill and MCP server together):

```bash
claude plugin marketplace add JeonSeongHu/paper-to-figma --scope project
claude plugin install paper-to-figma@paper-to-figma
```

Codex: `codex mcp add paper-to-figma -- bun /path/to/paper-to-figma/src/mcp.mjs`, and point it at
`skills/paper-to-figma/SKILL.md` (`bun run setup` prints both).

Then ask: *"Use the paper-to-figma skill to make the figures of work/mypaper/paper.txt on the Figures page and verify each one."*

## CLI

```
prepare <paper> --name N       index a paper into work/N/ (text, captions, figure sketches, tables with addressable cells)
check <spec.json> --paper N    fill in the layout, gate the design, check every value against the paper
build <spec.json> --paper N    check, then draw in Figma (a frame with the same name is replaced in place)
script <file.js>               run a figure script with the kit (diagrams, teasers); --spec S passes checked numbers
export | inspect | lint <frame>
qa <file.pdf>                  PDF checks and strict-viewer render
verify <frame> --paper N       export + qa + lint (+ evidence with --spec); writes work/N/verify-<frame>.md
```

## Repository layout

| Path | What it holds |
|---|---|
| `kit/` | Figure kit that runs inside Figma: size spec (`spec.js`), chart layout (`layout.js`), charts and radar (`charts.js`), diagram parts (`diagram.js`: elements at three hierarchy levels, icons, tokens, encoders, lanes, time axes, duration bars, blocked and dashed links, state badges). `dist/kit.js` is the built bundle |
| `plugin/` | Figma development plugin with a pairing code; `code.js` is the built bundle |
| `src/` | Relay, CLI, MCP server, paper indexing, evidence check, colour record, design lint, verification |
| `scripts/pdf_qa.py` | PDF checks: soft masks, transparency, placeholder images, margins, empty regions, coverage, strict-viewer render |
| `skills/paper-to-figma/` | The agent skill |
| `docs/` | Principles, spec format, kit API, local setup; `assets/` holds this README's teaser and the script that draws it |
| `examples/anon-paper/` | A synthetic paper with chart specs and a diagram script |
| `tests/` | `bun test` |

`work/` (papers and their figures) and `.private/` (the pairing code) are not tracked.

## Limits

- The paper parser does not compile TeX. Tables from PDF text are marked low confidence.
- Charts and radars are laid out automatically. Diagrams are scripts: the kit refuses a diagram that grows past its declared width or format, and lint checks the rest.
- Automated checks do not judge emphasis, wording, whether a mechanism reads, or whether a figure answers the right question. The skill's render checklist covers these; the agent must look at the renders.
- The plugin manifest ID is a development placeholder.

## License

MIT
