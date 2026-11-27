// Theme screenshots: chosen slides (at their last click) in every built-in theme, 1920×1080, one folder per theme.
// For checking a new or changed theme (colours, fonts, corners) on real slides.
// Usage: python build.py --preview, then: node tools/theme-shots.mjs [outDir] [--page file.html] [--slides a,b,c] [--themes Dark,Swiss]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const option = name => { const at = args.indexOf(name); return at >= 0 ? args.splice(at, 2)[1] : null; };
const page = option('--page');
const chosen = option('--slides');
const onlyThemes = option('--themes');
const OUT = args[0] || join(tmpdir(), 'deck-theme-shots');
if (page) process.env.DECK_TEST_PAGE = resolve(page);   // (harness.mjs opens this page instead of _preview.html)
const { startBrowser, makePage, sleep } = await import('./test/harness.mjs');   // (after the line above)

const { connection, close } = await startBrowser();
try {
  const t = await makePage(connection, 'themes');
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await t.open('title', { clear: true });
  const themes = onlyThemes ? onlyThemes.split(',') : await t.eval(`Object.keys(JSON.parse(document.getElementById('deckThemes').textContent).themes)`);
  const slides = chosen ? chosen.split(',') : await t.eval(`[...document.querySelectorAll('#stage .scene')].map(s => s.dataset.name)`);
  for (const theme of themes) {
    const dir = join(OUT, theme.replace(/[^\w-]+/g, '-')); mkdirSync(dir, { recursive: true });
    for (const name of slides) {
      await t.open(name);
      await t.eval(`(() => { const id = (document.getElementById('deck').dataset.deckId || 'deck').replace(/[^\\w-]/g, '') || 'deck'; localStorage.setItem(id + '-deck.theme', JSON.stringify(${JSON.stringify(theme)})); localStorage.removeItem(id + '-deck.colors'); return true; })()`);
      await t.open(name);
      // every click of the slide (the end state), then a moment for count-ups and fonts
      for (let i = 0; i < 12; i++) { await t.key('ArrowRight', 'ArrowRight', 39); await sleep(250); if (await t.eval(`location.hash.slice(1) !== ${JSON.stringify(name)}`)) { await t.key('ArrowLeft', 'ArrowLeft', 37); await sleep(900); break; } }
      await sleep(1600);
      await t.screenshot(join(dir, name + '.png'));
    }
    console.log(theme);
  }
} finally {
  await close();
}
console.log('screenshots in', OUT);
