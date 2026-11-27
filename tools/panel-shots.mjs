// Panel screenshots: every tab of the editor's Properties panel (and the Element tab for a few kinds of element), at
// 1920×1080 and 960×1080, cropped to the panel. Quicker than tools/ui-audit.mjs (~1 min) for work on the panel's look.
// Usage: python build.py --preview, then: node tools/panel-shots.mjs [outDir] [--tips]
//   --tips   with Tips switched on (the panel's explanations shown)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startBrowser, makePage, sleep } from './test/harness.mjs';

const args = process.argv.slice(2);
const OUT = args.find(arg => !arg.startsWith('--')) || join(tmpdir(), 'deck-panel-shots');
const TIPS = args.includes('--tips');
const SIZES = [[1920, 1080, 'fullhd'], [960, 1080, 'half']];

const { connection, close } = await startBrowser();
try {
  for (const [width, height, label] of SIZES) {
    const dir = join(OUT, label); mkdirSync(dir, { recursive: true });
    const t = await makePage(connection, 'panel-' + label);
    await t.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await t.open('numbers', { clear: true });
    if (TIPS) { await t.eval(`localStorage.setItem('presentation-editor.tips', 'on'); true`); }
    await t.editor.open('numbers');
    // the panel pinned open, also in a narrow window (so it can be seen)
    await t.eval(`(() => { const panel = document.querySelector('.editor-panel'); if (panel && !panel.getBoundingClientRect().width) document.querySelector('.editor-edge-tab.is-right')?.click(); return true; })()`);
    const shot = async name => {
      await sleep(400); await t.settle(2000);
      const box = await t.eval(`(() => { const r = document.querySelector('.editor-panel').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`);
      const clip = box.width > 40 ? { x: Math.max(0, box.x - 1), y: 0, width: Math.min(width, box.width + 2), height, scale: 1 } : undefined;
      await t.screenshot(join(dir, name + '.png'), clip ? { clip } : {});
      console.log(label, name);
    };
    const scrollPanel = how => t.eval(`(() => { const b = document.querySelector('.editor-panel-body'); b.scrollTop = ${how === 'bottom' ? 'b.scrollHeight' : '0'}; return true; })()`);
    for (const tab of ['animations', 'layers', 'slide', 'deck', 'code']) {
      await t.editor.tab(tab); await scrollPanel('top'); await shot('tab-' + tab);
      await scrollPanel('bottom'); await shot('tab-' + tab + '-bottom');
    }
    for (const [name, selector] of [['heading', 'h1, h2'], ['card', '.card'], ['number', '.stat-value, [data-count-up], .count-up']]) {
      try {
        await t.editor.pick('.editor-stage .scene :is(' + selector + ')');
        await t.editor.tab('element'); await scrollPanel('top'); await shot('element-' + name);
        await scrollPanel('bottom'); await shot('element-' + name + '-bottom');
      } catch (error) { console.log(label, name, 'skipped:', error.message.slice(0, 100)); }
    }
    await t.editor.tab('animations'); await scrollPanel('top'); await shot('animations-selected');
  }
} finally {
  await close();
}
console.log('screenshots in', OUT);
