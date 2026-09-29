# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [semantic versioning](https://semver.org/).

## [Unreleased]

### Changed

- The skill and the figure principles are now in English, the reference version. A Korean translation of the
  principles lives in `docs/figure-principles.ko.md`.
- Cases in the principles describe what went wrong in a figure and what fixed it, without quoting feedback.

### Fixed

- Radars drew their labels at the reading floor and their lines thinner than charts: the small sizes meant for a
  radar inside a teaser panel had become the default, and a radar figure was sized on the diagram reference width.
  A radar now uses the chart roles (panel titles, legend, line and marker sizes); `compact: true` keeps the small
  sizes for a radar squeezed into a panel. Lint holds radars to chart sizes again.
- Radar axis names ending in an arrow no longer lose the glyph at the frame edge.

## [0.1.0] - 2026-09-29

### Added

- Figure kit for Figma: a size spec measured on approved figures, automatic chart layout for the full-width and
  one-column formats, line and bar panels with log and broken axes, radar, and diagram parts (three hierarchy levels,
  vector icons, tokens and latent tiles, encoders, lanes, time axes and duration bars, blocked and dashed links, state
  badges on the rarer state).
- Paper indexing for TeX (with the paper's own macros), Markdown and PDF text, including the authors' figure sketches.
- Evidence check: every value cites a table cell or a quoted clause and matches the paper at the printed precision;
  numbers that appear only in figure sketches are not evidence.
- Paper-wide colour record for methods and diagram colour meanings.
- Design lint: print-size text floors, fonts, arrow glyphs, transparency, format and aspect, word budget, label length,
  repeated labels, hierarchy, unnamed icons, long blocked links, badge overuse, text outside frames and boxes.
- PDF checks: soft masks, transparency, placeholder images, margins, empty regions, coverage, and a strict-viewer
  render compared against the normal one.
- CLI, MCP server, local relay with a pairing code, a Figma development plugin, and a Talk to Figma transport.
- Claude Code plugin with the paper-to-figma skill; 23 figure principles with their cases; a synthetic example paper.

[Unreleased]: https://github.com/JeonSeongHu/paper-to-figma/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/JeonSeongHu/paper-to-figma/releases/tag/v0.1.0
