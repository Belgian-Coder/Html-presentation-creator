---
name: animated-presentation
description: Edit, extend, check and repair an animated presentation — a single self-contained HTML file with animated slides, a presenter view and a built-in editor (the 38-slide template deck Presentation.html and any presentation made from it, or any HTML file with a div id "deck" and a div id "stage" holding section elements of class "scene" with a data-name). Use this skill whenever someone wants to change such a file without opening the editor — texts, translation, new or reordered slides, speaker notes, timings, images, colours/theme, animations, click steps, transitions, links between slides, custom CSS — or to validate the file, find out why something does not show, make variants without the editor or presenter view, or work on the animated-presentation source project (build.py, src/, tools/test.mjs). Also use it for bulk work the editor cannot do in one go (translate everything, rename across slides, generate slides from data).
---

# Animated presentation

An animated presentation is **one HTML file** that holds everything: the slides, their images (embedded as base64), the
presentation code, a presenter view (P) and a full editor (E). People change it with the editor; you change the same
file directly. Everything the editor can do is plain markup in that file (see `references/features.md`), so anything a
user can do in the editor you can do here too, and more: bulk changes, translation, generated slides, custom CSS/JS.

Slides are designed on a fixed **1600 × 900** stage that is scaled to the screen; use pixel sizes as if the screen were
always 1600 × 900.

## The tools in this skill

| Tool | What for |
|---|---|
| `scripts/deck.py` (Python 3.8+, no packages) | read the file (slides, texts, notes, assets, blocks, templates), change it precisely (slides, attributes, notes, texts, assets, data blocks) and **validate** it. Every write keeps `<file>.bak`, renumbers the slide banners, and refuses a change that would add validation errors. Byte-exact: what it does not touch stays as it was. `python scripts/deck.py help` lists everything. |
| `scripts/render_check.mjs` (Node 22+, Chrome or Edge) | opens the file in a headless browser: script errors, every slide shown with all its clicks, text that falls off the slide or is cut off, the editor opens; a screenshot per slide. Exit code 1 when something is wrong. |
| `references/file-format.md` | anatomy of the file: where slides live, every data block (themes, assets, animations, text styles, interface texts, custom CSS/JS), what the editor rewrites on save, what must never be written by hand, what breaks the file. |
| `references/features.md` | every editor feature as the markup it produces (slide settings, element settings, text formatting, appear/click effects, animations, keyframes, motion paths, morph, every insertable block, free placement, theme, footer…), with values and examples. |
| `references/source-project.md` | only for the animated-presentation source project (build, tests, UI audits, delivery, code conventions). |

Every command is `python <skill>/scripts/deck.py <command> <file.html> [arguments] [options]` — the file always comes
right after the command, e.g. `deck.py show-slide deck.html numbers`, `deck.py set-slide deck.html numbers data-estimate=45`.
Below, `F` stands for the presentation file. Slides are named by their **`data-name`** (`numbers`, `thanks`), not by
their title: run `deck.py slides F` first to see which title belongs to which name.

## Commands at a glance (`python <skill>/scripts/deck.py help` has the details)

```
read:    info F · slides F · show-slide F S · notes F S · texts F [--slide S] [--json] · templates F · assets F
         block F themes|animations|text-styles|ui-texts|custom-css|custom-js · validate F
slides:  add-slide F (--template T | --file f.html) [--name N] [--title T] [--after S | --before S | --first]
         duplicate-slide F S · delete-slide F S · move-slide F S (--after S2 | --before S2 | --first | --last)
         replace-slide F S --file f.html · set-slide F S attr=value … [--remove attr …] · set-notes F S --text "…"
deck:    set-deck F attr=value … [--remove attr] · set-title F "…" · set-theme-color F color-accent "#e86a92" [--theme T]
         set-block F NAME --file f · add-asset F NAME path · remove-asset F NAME · extract-asset F NAME out
texts:   replace-text F "old" "new" [--slide S] [--all]
options: --dry-run (show, write nothing) · --out other.html (write elsewhere) · --force (write despite new errors)
```
Every write keeps `F.bak` (the step before) and, once, `F.orig` (the file before your first change).

## How to work

1. **Look first.** `deck.py info F` and `deck.py slides F` (names, titles, times, clicks). Then `validate F`: if the file already has errors,
   say so before you change anything (and do not "fix" what the user did not ask about without telling them).
2. **Pick the smallest precise change.**
   - A slide setting (title, time, transition, skip, backup, background, no logo/footer…) → `set-slide`; a setting for
     all slides (footer, slide numbers, progress line, fonts, text size, pace) → `set-deck`.
   - A text that sits in one piece → `replace-text` (only text, never tags). A text split by tags (`The <span
     class="highlight">numbers</span>`) → edit the slide's HTML (next point).
   - Anything inside a slide (new block, click steps, styles, positions, links) → `show-slide F NAME > slide.html`, edit
     that fragment with the markup from `references/features.md` (any editor, any line ends), then
     `replace-slide F NAME --file slide.html`.
   - New slide → `add-slide F --template <name>` (`templates F` lists them: title, section, cards, stats, image, quote,
     compare, question, process, agenda, chart, video, qr, break, …), then fill it in as above. Prefer a template over
     hand-written structure: its classes, reveal order and spacing are what the design expects.
   - Order, copy, delete → `move-slide`, `duplicate-slide`, `delete-slide`. Speaker notes → `set-notes`.
   - Images, video, sound → `add-asset F NAME PATH`, then `data-asset="NAME"` on an `<img>`/`<video>`/`<audio>`, or
     `set-slide F S data-asset-background=NAME`. Never put `src="data:…"` or a web URL in a slide.
   - One theme colour → `set-theme-color F color-accent "#e86a92"` (the active theme; `--theme Light` for another).
   - Whole data blocks (themes, animations, text styles, interface texts, custom CSS/JS) → `block F NAME` to read,
     `set-block F NAME --file new.json` to write (JSON is checked and pretty-printed).
   Use `--dry-run` when unsure; use `--out copy.html` to try something on a copy.
3. **Validate after every change** (`deck.py validate F`) — the scripts already refuse new errors, but hand edits of the
   file (if you made any) are only caught here.
4. **Check it renders** when you changed layout, added blocks, slides or styles: `node scripts/render_check.mjs <file>
   [outDir]`, then **look at the screenshots** of the slides you changed (the check finds errors and overflow, not
   ugliness: a text that fits but looks wrong is yours to see). For a quick look at one slide: `--slide NAME`.
5. **Tell the user** what changed (slides, texts, settings), what you checked, and anything they must do in their
   browser (see "When an edit seems to have no effect").

## Rules that keep the file working (and why)

- **One file, offline.** The file must work without internet: no CDN scripts, web fonts or `https://` images.
  Embed media as assets. Links the audience clicks (`data-href`, `<a href>`) are fine.
- **Slide names** (`data-name`) are unique, lower-case letters, digits and dashes; the address `#name`, links between
  slides (`data-goto`, `data-until`) and browser-saved settings use them. `set-slide … data-name=new` updates the links.
- **Six slides are run by their own code**: `timeline`, `mindset`, `flow`, `docs`, `product`, `reuse`. Their texts,
  numbers and images may change; their structure, ids and names may not (the code finds them by those). They cannot be
  copied. For a similar slide, start from a template.
- **Do not write what the page makes while it runs**: footers (`.slide-footer`), the progress line, split letters,
  drawn charts/QR codes, `src` on `[data-asset]` elements, state classes (`is-active`, `is-visible`…), editor marks
  (`contenteditable`, `.is-editor-selected`). They would appear twice. `validate` warns about these.
- **Slide code is inert text**: a slide's own JS is `<script type="text/plain" data-slide-js>`; a normal `<script>`
  inside a slide is an error. No `on…=` attributes, no `javascript:` links, no iframes.
- **Data blocks stay valid**: invalid JSON in the assets or animations block silently empties it (all images or
  animations gone). `</script` may never appear inside a script block. Use `set-block`, which checks both.
- **Leave the engine alone** for content work: the main `<style>` and `<script>`, the controls, the fonts block and the
  `EDITOR-ONLY` / `PRESENTER-ONLY` marks are the program, not the presentation. Changing the program is a source-project
  task (`references/source-project.md`).
- **Use theme colours** (`var(--color-accent)`, `--color-teal`, `--color-rose`, `--color-text`, `--color-text-muted`,
  `--color-surface`, `--color-line`) instead of fixed colours, so a theme switch keeps working.

## When an edit seems to have no effect

The browser that shows the file remembers some settings per presentation (`data-deck-id` on `#deck`) and those win
over the file in that browser: a theme or colours picked in Settings, times per slide set in Settings, texts changed in
the Texts drawer, swapped images. Tell the user: Settings (S) › Reset colours / Reset times / Reset texts — or open the
file in a private window. `render_check.mjs` always uses a fresh browser, so it shows what the file itself says.

Also: when the user saves from the editor later, the editor rewrites the themes and interface-texts blocks, renumbers
banners, drops images that no element uses, and normalises HTML (e.g. `data-end-state=""`). That is expected.

## Recipes (details and exact markup: references/features.md)

| Task | How |
|---|---|
| Change a title or text everywhere | `texts F --json` to find it; `replace-text F "Old" "New" --all` (add `--slide S` to limit) |
| Translate slides | see "Translating" below |
| New slide with three cards after "numbers" | `add-slide F --template cards --title "Our team" --after numbers`, then `show-slide F our-team`, edit the texts, `replace-slide F our-team --file …`. A card's icon is the small SVG in `.card-icon` (one `<path pathLength="1" d="…">` on a 24×24 grid, drawn as a line); an emoji in a free `.icon-badge` is the easy alternative (features.md §6) |
| Items one per click | on each item `data-reveal-step="1"`, `"2"`, … and **remove** their `reveal` class and `--order` (templates add those for "appears with the slide"; both together fight). The slide takes as many clicks as its highest step; no `data-steps` needed (features.md §4.1, effects §4.2) |
| Speaker notes with a hint at click 2 | `set-notes F S --text "Intro.\n2: Point at the chart."` (empty text removes the notes) |
| Time per slide / whole talk | `set-slide F S data-estimate=45` (seconds); `info F` shows the planned total |
| Transition | `set-slide F S data-transition=fade data-transition-speed=slow` (values in features.md §1) |
| Skip a slide | `set-slide F S data-skip`: Next/Back pass over it, it stays in the slide list and the chapter list (to open it on purpose). Undo: `--remove data-skip` |
| Backup slide | `set-slide F S data-backup`: an extra slide after the end of the talk, shown only when opened from the Slides drawer or chapter list (answers to questions); not in the time plan |
| Picture on a slide | `add-asset F img/team.jpg C:\path\team.jpg`, then in the slide HTML `<div class="image-frame"><img data-asset="img/team.jpg" alt="…"></div>` (or use the `image` template) |
| Background picture | `add-asset F …` then `set-slide F S data-asset-background=img/bg.jpg` (dim: features.md §1) |
| One colour of the theme | `set-theme-color F color-accent "#e86a92"`; names: color-background, color-surface, color-line, color-text, color-text-muted, color-accent, color-teal, color-rose (see `block F themes`) |
| A style for one slide | in the slide: `<style data-slide-css>@scope { h2 { color: var(--color-teal); } }</style>` as a direct child |
| Link to another slide | `data-goto="slide-name"` on the element (features.md §2.2) |
| Footer or slide numbers on every slide | `set-deck F data-footer=both "data-footer-text=Q1 · 2026"` (number / text / both); a slide with `data-no-footer` keeps none. The number is the slide's place in the file (a skipped slide still counts; backup slides are numbered apart). Progress line: `set-deck F data-progress-line=bottom` (all deck settings: file-format.md §3) |
| Browser-tab title | `set-title F "Q1 review — what we shipped"` |
| A copy without the editor / presenter view | in the source project `build.py --without editor` (or `presenter`, or both); for a saved file see file-format.md §11 |

## Translating

`texts F --json` lists every text a person sees: the texts in the slides, and as `[attr]` rows the slide titles
(`data-title`, in the chapter bar), `alt` texts of pictures, `aria-label`s (e.g. a title split into letters keeps its
full text there) and `title` tooltips. Translate all of those, and the speaker notes (`notes F S`, then `set-notes`).
Leave alone: `data-name`s, e-mail addresses, URLs, the data of a QR code (`data-qr`), numbers that count up, code.
A heading drawn letter by letter or word by word (`<h1 aria-label="IDEA"><span>I</span>…`) is two things: change the
spans and the `aria-label` together.
A text in one piece → `replace-text`; a text broken by tags (a highlighted word) → edit the slide's HTML. The interface
of the program itself (buttons, menus, messages) is the `ui-texts` block: `block F ui-texts` → translate the values
(never the keys) → `set-block F ui-texts --file ui.json`. Afterwards compare: `slides F` (same names and order) and a
render check of the translated slides (longer words can wrap or overflow).

## Checking your work before you say it is done

- `deck.py validate <file>` → 0 errors (warnings: read them; fix the ones your change caused).
- `render_check.mjs F` → 0 problems, and you looked at the screenshots of the slides you touched (it plays every click
  of a slide first, so the screenshot is the slide's end state; it does not judge looks — the screenshots do). It also
  prints the order the audience sees when presenting with Next: check skipped and backup slides there.
- The slide count, order and titles are what the user asked for (`deck.py slides`).
- If you changed many texts: `deck.py texts` again and read through what the audience will see.
- In the source project, also the tests (`node tools/test.mjs`) — see references/source-project.md.
