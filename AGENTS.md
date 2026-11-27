# AGENTS.md

Notes for AI coding agents (Codex, GitHub Copilot, Claude Code). People start with [README.md](README.md).

## The project

`Presentation.html` is the whole product: slides, CSS, JavaScript, fonts and pictures in one offline file.
It is also the source. There is no build step. Change it with its editor (E, then Ctrl+S) or edit the HTML directly.

The repository holds only:

| Path | What |
|---|---|
| `Presentation.html` | the presentation, its editor and presenter view |
| `README.md` | the introduction for people |
| `docs/` | the user guide (`GUIDE.md`) and its screenshots |
| `AGENTS.md` | this file |
| `.claude/skills/animated-presentation/` | the skill (Claude Code and GitHub Copilot load it from here) |
| `.agents/skills/animated-presentation/` | the same skill for Codex (it points to the one above) |

**Editing a presentation file** (texts, slides, notes, themes, translation): use the skill. Its `scripts/deck.py`
reads, changes and validates the file; `scripts/render_check.mjs` opens it in Chrome or Edge and reports problems.

## Map of the file

Search for the `====` banners. From top to bottom:

| Part | What |
|---|---|
| `<style>` | CSS: 2 tokens · 3 stage · 4 transitions · 5 components · 6 animations · 7 per slide · 8 controls bar · 9 presenter view · 10 settings · 11 reduced motion · 12 print · 13 editor |
| `SLIDE 01 …` | one `<section class="scene">` per slide, in order |
| `END OF THE SLIDES` | new slides go above this line |
| `SLIDE TEMPLATES` | hidden layouts for + Slide (`?templates=1` shows them) |
| `THEMES`, `INTERFACE TEXTS`, `ANIMATIONS`, `TEXT STYLES` | JSON blocks |
| `CUSTOM CSS`, `CUSTOM JAVASCRIPT` | the user's own code (JS runs through `show.onEnter / onStep / onLeave`) |
| `BINARY DATA` | fonts and the `ASSETS` block (pictures, video). Encoded: skip it |
| `MAIN SCRIPT` | one IIFE: 1 config · 5 window sync · 6 slide behaviours · 8 navigation · 10–12 presenter view · 13 settings · 17–20 editor · 23 start-up |

## A slide

```html
<section class="scene" data-name="numbers" data-title="Key numbers" data-estimate="50">
```

- `data-name`: the slide's id (URL `#numbers`). Keep it: six names have code in JS section 6
  (`timeline`, `product`, `mindset`, `flow`, `docs`, `reuse`).
- `data-title`: the chapter title. `data-estimate`: planned seconds. `data-backup`: a backup slide.
- `class="reveal" style="--order:2"`: rises in with the slide. `data-reveal-step="1"`: appears on click 1.
  Never both on one element.
- Pictures: `<img data-asset="img/name.png">`, with the data in the `ASSETS` JSON block.
- Notes: `<aside class="speaker-notes"><p>…</p></aside>`; `data-note-step="2"` lights up on click 2.

## Rules

- **One file, offline.** No CDN, no network requests, no libraries.
- **Valid JSON** in every JSON block (double quotes, no trailing comma).
- **Interface texts** live in `INTERFACE TEXTS`; the code uses `ui('key')`. Keys are unique.
- **Editor and presenter view are optional parts**, between `EDITOR-ONLY-START/END` and `PRESENTER-ONLY-START/END`
  comments. Code outside the marks never names something inside them; it asks `hasEditor()` / `hasPresenterView()`.
- **Timings** are in `CONFIG` (JS section 1); a slide's CSS delays are in its block in CSS section 7.
- **Comments:** one plain line per function, saying what it does.
- **When patching with scripts**, never append a `//` or unclosed `/*` comment to a replacement in the middle of a
  line: it has silently broken code before.
- **After a change:** run `python .claude/skills/animated-presentation/scripts/deck.py validate Presentation.html`
  and `node .claude/skills/animated-presentation/scripts/render_check.mjs Presentation.html`. Fix every error.
- **New features:** add them to `docs/GUIDE.md` in a sentence or two, with a screenshot when it helps.
- Short, clear text everywhere. No YAML unless a tool needs it.
