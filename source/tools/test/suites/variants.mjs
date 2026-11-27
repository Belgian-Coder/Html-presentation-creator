// Leaving parts out: the file without the editor, without the presenter view, and slides only (build.py --without,
// which cuts out what lies between the EDITOR-ONLY / PRESENTER-ONLY marks). Each opens, presents and has no script
// errors; E and P only open what the file still has.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAGE, PROJECT, sleep } from '../harness.mjs';

export const covers = ['*'];

export default async function (t) {
  const folder = mkdtempSync(join(tmpdir(), 'deck-variants-'));
  const source = join(folder, 'full.html');
  writeFileSync(source, readFileSync(PAGE, 'utf8'));
  for (const parts of ['editor', 'presenter', 'editor,presenter']) {
    const file = join(folder, parts.replace(',', '-') + '.html');
    // the same cut as build.py --without (its without_parts), on the page the tests just built
    execFileSync('python', ['-c', 'import sys; sys.path.insert(0, sys.argv[1]); import build; open(sys.argv[3], "w", encoding="utf-8").write(build.without_parts(open(sys.argv[2], encoding="utf-8").read(), tuple(sys.argv[4].split(","))))',
      PROJECT, source, file, parts]);
    const html = readFileSync(file, 'utf8');
    const noEditor = parts.includes('editor'), noPresenter = parts.includes('presenter');
    t.check(`without ${parts}: no marks or code of it left`, (!noEditor || !/\/\* EDITOR-ONLY-(START|END)|<!-- EDITOR-ONLY-|editorCanvas/.test(html)) && (!noPresenter || !/\/\* PRESENTER-ONLY-(START|END)|function showPresenterView|const presenterView/.test(html)));
    t.errors.length = 0;
    await t.send('Page.navigate', { url: 'about:blank' });
    await t.waitFor(`location.href === 'about:blank'`);
    await t.send('Page.navigate', { url: pathToFileURL(file).href + '#title' });
    await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`, { timeout: 20000, label: `without ${parts}: opens` });
    for (let i = 0; i < 5; i++) { await t.key('ArrowRight', 'ArrowRight', 39); await sleep(200); }
    t.check(`without ${parts}: presents (Next goes on)`, (await t.eval(`document.querySelector('#stage .scene.is-active').dataset.name`)) !== 'title');
    await t.key('e', 'KeyE', 69);
    await sleep(500);
    t.check(`without ${parts}: E ${noEditor ? 'opens nothing' : 'opens the editor'}`, (await t.eval(`!!document.querySelector('.editor .editor-stage .scene')`)) === !noEditor);
    if (!noEditor) { await t.key('Escape', 'Escape', 27); await sleep(300); }
    if (noPresenter) {
      await t.key('p', 'KeyP', 80);
      await t.key('t', 'KeyT', 84);
      await t.key('g', 'KeyG', 71);
      await sleep(400);
      t.check(`without ${parts}: P opens nothing and its button is hidden`, await t.eval(`!document.querySelector('.deck').classList.contains('is-presenter') && getComputedStyle(document.getElementById('btnPresenter')).display === 'none'`));
      for (let i = 0; i < 3; i++) { await t.key('ArrowLeft', 'ArrowLeft', 37); await sleep(200); }
    }
    t.check(`without ${parts}: no script errors`, t.errors.length === 0, t.errors.join(' | '));
    t.errors.length = 0;
  }
}
