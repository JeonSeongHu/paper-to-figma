# Contributing

Thank you for helping. paper-to-figma is small on purpose: a figure kit, a bridge to Figma, and checks that keep an
agent honest. Most contributions fall into one of four kinds.

## 1. A figure that came out wrong

Open an issue with the **Figure problem** template. Include:

- the render (`work/<paper>/qa/*.normal.png`) or a screenshot,
- what is wrong, in one sentence ("the legend explains a symbol in the other panel"),
- the `verify` report if you have one.

Do not attach a paper under double-blind review. Describe the figure in general terms, or reproduce it with the
synthetic example in `examples/anon-paper/`.

## 2. A new rule

Every principle in [docs/figure-principles.md](docs/figure-principles.md) started as a correction to a real figure,
and each one is written the same way:

- **Rule:** a general statement that holds for any paper and any figure.
- **Application:** when and how to apply it, and which kit part or check supports it.
- **Case:** the correction that led to it, described so that no paper under review can be identified.

A decision made for one figure is a case, not a rule. Before adding a principle, check whether an existing one already
covers it and only needs a clearer application line.

## 3. A new check

If a correction keeps coming back, turn it into a check in `src/lint.mjs`, `src/specgate.mjs`, `src/evidence.mjs`
or `scripts/pdf_qa.py`:

- calibrate thresholds on approved figures and say where the number comes from,
- write the warning so it says what to do, not only what is wrong,
- add a test in `tests/core.test.mjs` with synthetic data.

## 4. A kit part

Parts live in `kit/`. They take the figure width (`figureWidth`, alias `fw`) and scale every size from the spec in
`kit/spec.js`; they never shrink text to fit, never clip and never use transparency. Document new parts in
[docs/kit-api.md](docs/kit-api.md).

## Development

```bash
bun install
bun run build     # kit/dist/kit.js and plugin/code.js
bun test
```

Commit the rebuilt bundles with the source change that produced them; CI checks that they are up to date.
Figma is needed only for `build`, `script`, `export` and `verify`; the tests run without it.

## Pull requests

- One change per pull request, with a short description of the figure problem it solves.
- Match the style of the surrounding code: short functions, comments that say why, no new dependencies without a reason.
- Never commit a paper, its text or numbers taken from it. `work/` is ignored by git for this reason.
- Fill in the pull request checklist.

## Language

Code, comments, the README, the skill and the figure principles are in English. The principles also have a Korean
translation ([figure-principles.ko.md](docs/figure-principles.ko.md)); when you change a principle, change the English
version first, and update the translation or note in your pull request that it needs updating. The local setup guide
is in Korean ([quickstart.ko.md](docs/quickstart.ko.md)); the README's quick start covers the same steps in English.

Cases in the principles describe what went wrong in a figure and what fixed it. They do not quote feedback or say who
asked for a change.
