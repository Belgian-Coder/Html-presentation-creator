# AGENTS.md

Instructions for AI coding agents (Codex, GitHub Copilot, Claude Code and others) working in this repository.
People start with [README.md](README.md); it documents every feature.

## What this is

An animated presentation template with a presenter view and a built-in editor, delivered as **one offline HTML
file** (`Presentation.html`). The file needs no server, no network and no libraries; it runs in Chrome and Edge.
The source is split into small files in `src/`, and `build.py` joins them and embeds fonts and images.

## Layout

| Path | What it holds |
|---|---|
| `src/deck.html` | the outline: the READ ME FIRST guide, then one `<!-- include: … -->` line per part, in order |
| `src/slides/` | one file per slide (`01-title.html` … `38-thanks.html`): the template's slides, with placeholder texts |
| `src/parts/` | slide templates (hidden, for + Slide), the controls bar, the settings panel |
| `src/css/`, `src/js/` | the styles and the script, numbered in the order they are included; the JS is one IIFE |
| `src/themes.json` | the built-in themes (colours, and optionally fonts, corners, title spacing) |
| `src/interface-texts.json` | every text of the interface, by key |
| `img/`, `fonts/` | pictures and woff2 fonts; only files used in `src/` end up in the build |
| `build.py` | the build (its docstring lists the options) |
| `tools/test.mjs`, `tools/test/` | browser tests: a small CDP harness and 13 suites for the editor and the presenter view |
| `tools/deliver.py`, `tools/*-shots.mjs`, `tools/ui-audit*.mjs` | delivery, screenshots, layout and action audits |
| `.claude/skills/animated-presentation/` | the skill for changing a **built** presentation file (see below) |
| `docs/` | screenshots used by the README |

## Commands

```
python build.py --preview          # builds Presentation.html, index.html and _preview.html (used by the tests)
node tools/test.mjs                # the suites for what changed since the last run that passed
node tools/test.mjs --all          # every suite (before a delivery)
node tools/test.mjs editor-core    # named suites
python tools/deliver.py --to <folder> --version NN --skip-tests   # after the tests passed
```

Node 22+ and Chrome or Edge are needed for the tests; Python 3.9+ for the build. No packages to install.

**Never pass `--help` to `tools/deliver.py`**: it has no help option and runs a delivery.

## Rules

- **One file, offline.** No CDN, no network requests, no libraries. New fonts go into `fonts/` (OFL) and
  `src/css/01-fonts.css` (`tools/get-fonts.py` writes both).
- **Interface texts** go into `src/interface-texts.json`; the code uses `ui('key')`. Keys are unique.
- **The README documents every feature.** Change it in the same change as the code.
- **Comments:** every function has a one-line comment that says what it does. Plain words, full names.
- **Patching code with scripts:** never append a `// …` or an unclosed `/* …` comment to a replacement that sits in the
  middle of a line or expression; it has silently broken unrelated code. Put comments on their own line.
- **Slide code by name:** six slides have behaviour in `src/js/06-slide-behaviours.js`, chosen by their `data-name`:
  `timeline`, `product`, `mindset`, `flow`, `docs`, `reuse`. Renaming them removes their behaviour.
- **Tests cover the editor and the presenter view only**, not the content of the slides; they use the slides as test
  material. When you change a slide, fix any test that relied on its text, but do not add tests about slide content.
- **One test browser run at a time.** Start browsers only through `tools/test/harness.mjs` (or the tools that use it).
  On Windows, keep `seedPasswordCheck` in the harness: without it every new test profile makes a failed Windows logon,
  and ten of them lock the account.
- **Known load flakes:** `editor-app` ("Your speed") and `editor-tools` ("editor open") can fail when four suites run
  at once. Rerun that suite on its own; it counts as passed when it passes there.
- Prefer small, readable changes over clever ones. Keep YAML out unless a tool needs it.

## The skill

`.claude/skills/animated-presentation/SKILL.md` explains how to change a built `Presentation.html` (or a copy) without
its editor: texts, translations, slides from templates, notes, times, themes, click steps, checks. Its script
`scripts/deck.py` (Python, no packages) reads, changes and validates the file; `scripts/render_check.mjs` opens it in
a browser and reports layout and script problems. Use it whenever the task is about a presentation file rather than
the source in `src/`. Claude Code and GitHub Copilot load it from `.claude/skills/` by themselves; Codex: read that
`SKILL.md` before such a task.
