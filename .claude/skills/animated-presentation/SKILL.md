---
name: animated-presentation
description: Edit, check and repair an animated presentation, a single HTML file with slides, a presenter view and a built-in editor (Presentation.html or any file with div#deck and div#stage holding section.scene slides that have a data-name). Use it when someone wants to change such a file without the editor - texts, translation, new or moved slides, notes, timings, images, theme, animations, click steps, transitions, links, custom CSS - or to validate it, find out why something does not show, or make a copy without editor or presenter view. Also use it for bulk work the editor cannot do (translate everything, generate slides from data).
---

# Animated presentation

One HTML file holds everything: slides, images (base64), code, presenter view (P) and editor (E). The file is its own
source. People change it with the editor (Ctrl+S saves into the file); you change the same file directly. Everything
the editor does is plain markup (see `references/features.md`).

Slides use a fixed 1600 x 900 stage that is scaled to the screen. Think in those pixels.

## Tools

- `scripts/deck.py` (Python 3.8+, no packages): read, change and validate the file. Every write keeps `F.bak` (and once
  `F.orig`), renumbers the slide banners, and refuses a change that adds errors.
- `scripts/render_check.mjs` (Node 22+, Chrome or Edge): headless run that plays every click, reports script errors
  and overflowing text, saves a screenshot per slide. Exit code 1 on problems.
- `references/file-format.md` (anatomy of the file, what breaks it) and `references/features.md` (every editor feature as markup).

Run `python <skill>/scripts/deck.py <command> F [args] [options]` (`F` = the presentation file, right after the command).
Slides are named by `data-name` (`numbers`), not by title: run `deck.py slides F` first.

```
read:    info F | slides F | show-slide F S | notes F S | texts F [--slide S] [--json] | templates F | assets F
         block F themes|animations|text-styles|ui-texts|custom-css|custom-js | validate F
slides:  add-slide F (--template T | --file f.html) [--name N] [--title T] [--after S | --before S | --first]
         duplicate-slide F S | delete-slide F S | move-slide F S (--after S2 | --before S2 | --first | --last)
         replace-slide F S --file f.html | set-slide F S attr=value ... [--remove attr ...] | set-notes F S --text "..."
deck:    set-deck F attr=value ... [--remove attr] | set-title F "..." | set-theme-color F color-accent "#e86a92" [--theme T]
         set-block F NAME --file f | add-asset F NAME path | remove-asset F NAME | extract-asset F NAME out
texts:   replace-text F "old" "new" [--slide S] [--all]
options: --dry-run (write nothing) | --out other.html (write elsewhere) | --force (write despite new errors)
```

## How to work

1. **Look first.** Run `info F`, `slides F`, `validate F`. Report existing errors; do not fix what was not asked.
2. **Make the smallest precise change.**
   - Slide setting (title, time, transition, skip, background) -> `set-slide`. Setting for all slides (footer, numbers,
     progress line, fonts, text size, pace) -> `set-deck`.
   - Text in one piece -> `replace-text` (text only, never tags). Text split by tags -> edit the slide HTML.
   - Anything inside a slide -> `show-slide F S > slide.html`, edit it with the markup from `features.md`, then
     `replace-slide F S --file slide.html`.
   - New slide -> `add-slide F --template NAME` (`templates F` lists them), then fill it in. Templates carry the
     classes, reveal order and spacing the design expects.
   - Order, copy, delete -> `move-slide`, `duplicate-slide`, `delete-slide`. Notes -> `set-notes`.
   - Image, video, sound -> `add-asset F NAME PATH`, then `data-asset="NAME"` on the element, or
     `set-slide F S data-asset-background=NAME`. Never write `src="data:..."` or a web URL in a slide.
   - Theme colour -> `set-theme-color`. Whole data block -> `block F NAME` to read, `set-block F NAME --file x.json` to write.
   - Unsure? Add `--dry-run`, or work on a copy with `--out`.
3. **Validate after every change** (`validate F`), then render check after layout, block, slide or style changes:
   `node scripts/render_check.mjs F [outDir] [--slide NAME]`. Look at the screenshots of the slides you changed: the
   check finds errors and overflow, not ugliness. Check its presenting order for skipped and backup slides.
4. **Tell the user** what changed, what you checked, and what they must do in the browser (see "No effect?").

## Rules that keep the file working

- **One file, offline.** No CDN, web fonts or `https://` images. Embed media as assets. Links the audience clicks
  (`data-href`, `<a href>`) are fine.
- **Slide names** (`data-name`) are unique: lower-case letters, digits, dashes. Links (`data-goto`, `data-until`), `#name`
  and saved settings use them. `set-slide ... data-name=new` updates the links.
- **Six slides run on their own code:** `timeline`, `mindset`, `flow`, `docs`, `product`, `reuse`. Change their texts,
  numbers and images only. Keep their structure, ids and names. Do not copy them.
- **Do not write what the page makes at run time:** footers, progress line, split letters, drawn charts and QR codes,
  `src` on `[data-asset]`, state classes (`is-active`...), editor marks (`contenteditable`). `validate` warns about these.
- **Slide code is inert text:** `<script type="text/plain" data-slide-js>`. No normal `<script>`, `on...=` attributes,
  `javascript:` links or iframes in a slide.
- **Data blocks stay valid JSON.** Bad JSON in assets or animations silently empties the block. Never write `</script`
  inside a script block. `set-block` checks both.
- **Leave the engine alone:** main `<style>` and `<script>`, controls, fonts block, EDITOR-ONLY and PRESENTER-ONLY marks.
- **Use theme colours** (`var(--color-accent)`, `--color-teal`, `--color-rose`, `--color-text`, `--color-surface`...) so theme switches work.

## No effect?

The browser keeps some settings per presentation (`data-deck-id`) and they win over the file: theme, colours, times,
Texts-drawer texts, swapped images. Tell the user: Settings (S) > Reset colours / Reset times / Reset texts, or open the
file in a private window. `render_check.mjs` uses a fresh browser, so it shows the file itself. A later editor save
rewrites the themes and interface-texts blocks, renumbers banners, drops unused images and normalises HTML. That is expected.

## Recipes (markup in `features.md`)

| Task | How |
|---|---|
| One item per click | `data-reveal-step="1"`, `"2"`... on the items. **Remove** their `reveal` class and `--order` (both together fight). The slide takes as many clicks as its highest step. |
| Notes with a hint at click 2 | `set-notes F S --text "Intro.\n2: Point at the chart."` (empty text removes the notes) |
| Time, transition, skip | `set-slide F S data-estimate=45 data-transition=fade data-transition-speed=slow data-skip` (seconds; `info F` shows the total). `data-backup` makes an extra slide after the talk. Undo with `--remove`. |
| Picture | `add-asset F img/team.jpg C:\path\team.jpg`, then `<div class="image-frame"><img data-asset="img/team.jpg" alt="..."></div>` |
| Footer, numbers, progress | `set-deck F data-footer=both "data-footer-text=Q1 2026" data-progress-line=bottom` |
| Copy without editor or presenter view | Open the file, then File > Export without editor / without presenter view / slides only. By hand: delete the marked blocks (`file-format.md` section 9). |

## Translating

`texts F --json` lists every text a person sees: slide texts, plus `[attr]` rows for `data-title`, `alt`, `aria-label` and
`title`. Translate all of them and the notes. Leave alone: `data-name`, e-mail addresses, URLs, `data-qr`, counting numbers,
code. A heading drawn letter by letter (`<h1 aria-label="IDEA"><span>I</span>...`): change the spans and `aria-label` together.
Interface texts: `block F ui-texts`, translate the values (never the keys), then `set-block F ui-texts --file ui.json`.
Afterwards check `slides F` (same names and order) and render (longer words can overflow). Before you finish, `validate F`
shows 0 errors and `slides F` shows the count, order and titles the user asked for.
