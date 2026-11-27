# Working in the source project (animated-presentation/)

Read this only when the task is in the **source project** (a repository with `Presentation.html`, and `source/` holding `build.py`, `src/`, `tools/`), for example
"change the editor", "fix a bug in the presenter view", "add a feature". To change one presentation's slides, edit the
single HTML file instead (SKILL.md): the source project is not needed for that, and an edited file is its own master copy
(`src/` does not see edits made in the file, and a rebuild from `src/` does not see edits made in the file).

## Contents
1. Layout of the project
2. Build
3. Tests (what to run, how long, known flaky checks)
4. The two UI audits (layout and every action)
5. Delivery
6. Conventions the code follows
7. Safety rules for browsers on Windows

## 1. Layout of the project

```
animated-presentation/
├── Presentation.html        the built presentation (committed; rebuild it after every source change)
├── README.md                short introduction; docs/MANUAL.md has every feature, docs/CHANGELOG.md the versions
├── AGENTS.md                rules for coding agents
└── source/                  (the paths below are inside source/)
├── src/deck.html            outline: READ ME FIRST + one `<!-- include: … -->` line per part, in order
├── src/slides/NN-name.html  one <section class="scene"> per slide (the 38 template slides, which are the presentation)
├── src/parts/               slide-templates.html (the <template id="slideTemplates">), controls-bar.html, settings-panel.html
├── src/css/01–13*.css       1 fonts · 2 tokens · 3 base/stage · 4 transitions · 5 components · 6 animations · 7 per slide ·
│                            8 controls bar · 9 presenter view · 10 settings · 11 reduced motion · 12 print · 13 editor
├── src/js/01–23*.js         ONE script (an IIFE) cut into files: they share their top-level names.
│                            17 editor model/saving · 18 canvas/Element tab · 19 tools (Animations tab, menus, clipboard,
│                            keys, zoom) · 20 layers/extras · 20b motion/timeline · 20c commands (menu bar, find an action,
│                            selection bar) · 20d timeline · 20e Code tab · 21 audience window · 22 screen · 23 start-up
├── src/themes.json          built-in colour themes (→ <script id="deckThemes">)
├── src/interface-texts.json every interface text (→ <script id="deckUiTexts">); code uses ui('key', {vars})
├── build.py                 joins src/ into one file and embeds fonts and images (img/, fonts/)
├── tools/test.mjs           test runner (headless Chrome/Edge, Node 22+, no npm)
├── tools/test/harness.mjs   the browser + page API the suites use (t.open, t.click, t.key, t.editor.* …)
├── tools/test/suites/*.mjs  13 suites, ~1380 checks (editor and presenter view only)
├── tools/ui-audit.mjs       screenshots of every screen at 1920×1080 and 960×1080 + layout checks
├── tools/ui-audit-actions.mjs  runs every menu / right-click / selection-bar action and records what it did
└── tools/deliver.py         build + backups + copy + source zip to the delivery folder
```

New interface texts go in `src/interface-texts.json` (never hard-code an English sentence in JS). New files in
`src/css|js|slides|parts` must get an include line in `src/deck.html`, or the build stops.

## 2. Build

```
python <project>/source/build.py --preview      # Presentation.html, index.html and _preview.html (tests use _preview.html)
python <project>/source/build.py --joined       # also _joined.html: the joined source without the embedded binaries (to read)
python <project>/source/build.py --without editor,presenter   # the variants (see file-format.md "variants")
python <project>/source/tools/get-fonts.py      # after adding a Google Fonts family to FAMILIES: downloads it, rewrites css/01-fonts.css
node <project>/source/tools/theme-shots.mjs [outDir] [--themes Swiss] [--slides title,numbers] [--page file.html]   # slides per theme
node <project>/source/tools/panel-shots.mjs [outDir] [--tips]   # the editor's Properties panel, every tab
```
On macOS/Linux use `python3`. The build stops with a clear message when an include is wrong or an image is missing.

## 3. Tests

```
node <project>/source/tools/test.mjs                 # only the suites whose files changed since the last passing run
node <project>/source/tools/test.mjs --all           # all 13 suites (~4 min, 4 at a time)
node <project>/source/tools/test.mjs editor-canvas smoke   # named suites
node <project>/source/tools/test.mjs --list          # which suite covers which files
```
Suites: smoke, snapshot (every slide and click vs a baseline; `--update-baseline` after an intended visual change),
presenting, presenter-extras, variants, editor-core, editor-canvas, editor-app, editor-commands, editor-tools,
editor-motion, editor-timeline, editor-media, editor-code.

A test helper you will use when adding checks: `t.editor.open('numbers')`, `t.editor.pick(selector)`, `t.editor.tab('element')`,
`t.editor.panelSet(selector, value)`, `t.editor.insert('rect')`, `t.click(selector)` (fails when something covers it),
`t.key('z', 'KeyZ', 90, 2 /* Ctrl */)`, `t.waitFor(expr)`, `t.check(label, ok, extra)`.

Known flaky checks under load (they pass when their suite runs alone — rerun that suite before you investigate):
editor-app "a click on the logo with the panel hidden…", editor-app "Your speed", editor-tools stopping early with
"editor open" timed out, editor-commands "Change layout (numbers → cards)", editor-code save, the duotone glow check.
A failure that repeats when its suite runs alone is real.

## 4. UI audits (not tests: they produce pictures and findings to review)

```
node <project>/source/tools/ui-audit.mjs [outDir]            # ~5 min: 71 screens × 2 sizes, report.json
node <project>/source/tools/ui-audit-actions.mjs [outDir] [filter]   # ~30 min: ~273 actions × 2 sizes, results.json + summary.md
```
Build with `--preview` first: both use `_preview.html`. Look at `summary.md` (actions flagged "no visible result", script
errors, new layout findings) and at the screenshots; the automatic layout findings are noisy, the pictures decide.
After a change to one action, run the action audit with a filter (e.g. `paste`, `bar-`, `menu-format`).

## 5. Delivery

```
python <project>/source/tools/deliver.py --version NN [--skip-tests] [--to <folder>]
```
Runs the tests of what changed (unless --skip-tests), builds once, backs up, copies Presentation.html and Presentation-source.zip
to the delivery folder (`--to`, or PRESENTATION_DELIVER_DIR, or ~/Downloads/animated-presentation). Add a README line per version
(docs/CHANGELOG.md has the version notes).

## 6. Conventions

- Plain, everyday words in the interface (the users are not technical); every message says what happened and what to do.
- Greyed menu items carry their reason (blockedReason in 20c); an action that cannot run says why in a message.
- Undo: every change to the model goes through `editor.record()` / `editor.edit(fn)` / `editorCanvas.change(fn)`.
- The model (`editor.model`, a parsed copy of the file) is what is saved; the canvas shows a still copy of a slide.
- New editor commands: add to COMMANDS in `js/20-editor-commands.js` ([id, label key, keys, action, needs]), to a MENUS
  entry, and words to COMMAND_WORDS so Ctrl+K finds it; then a test in a suite and a line in the README.
- Comments in the code explain why; docs/MANUAL.md Part 2 explains the structure. Keep both current.

## 7. Browsers on Windows (important)

A Chrome/Edge started with a NEW profile checks whether the Windows password is empty by logging on with an empty one.
Many runs in a row lock the Windows account. `tools/test/harness.mjs` (seedPasswordCheck) and the skill's
`scripts/render_check.mjs` copy the saved answer into the new profile to prevent that. Keep that code; start test
browsers only through those scripts, one run at a time; never in a tight loop.
