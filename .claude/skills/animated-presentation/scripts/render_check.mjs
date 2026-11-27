// render_check.mjs: opens an animated presentation file in a headless Chrome (or Edge) and checks that it really works:
//   - no script errors while it loads, while every slide is shown (each click played), and when the editor opens (E);
//   - every slide in the file is reachable, and nothing on a slide lies outside the slide (cut off when presenting),
//     no text is cut off inside its box;
//   - the order the audience sees when you present from the first slide with Next only (skipped and backup slides
//     are passed over): printed, and in report.json (presentingOrder, notShownWhenPresenting);
//   - a screenshot of every slide (its end state, after all its clicks: data-steps or the highest data-reveal-step)
//     for a person or a model to look at.
//
//   node render_check.mjs <file.html> [outDir] [--slide NAME] [--templates] [--width 1600 --height 900]
//   --templates: the slide templates (+ Slide layouts) are checked too, after the slides (?templates=1)
//
// Node 22+ (built-in WebSocket), Chrome or Edge installed (CHROME_PATH to choose). Nothing else, no npm packages.
// Writes <outDir>/NN-name.png and <outDir>/report.json; prints a summary; exit code 1 when there are problems.
// outDir defaults to <temp>/deck-render-check. The browser gets its own throw-away profile and is closed at the end.
//
// Windows: a browser that starts with a NEW profile checks whether the Windows password is empty by trying to log
// on with an empty one; many such runs in a row can LOCK the Windows account. This script copies the answer the
// person's own Chrome/Edge already saved into the throw-away profile, so the check is not made (seedPasswordCheck).
// Do not remove that, and do not start browsers for this file another way in a loop.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const onlySlide = flag('--slide', null);
const withTemplates = args.includes('--templates'); if (withTemplates) args.splice(args.indexOf('--templates'), 1);
const width = Number(flag('--width', 1600)), height = Number(flag('--height', 900));
const [file, outArg] = args;
if (!file) { console.log('node render_check.mjs <file.html> [outDir] [--slide NAME] [--width W --height H]'); process.exit(2); }
const page = resolve(file);
const out = resolve(outArg || join(tmpdir(), 'deck-render-check'));
mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const env = process.env, home = homedir();
  const list = {
    win32: [join(env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'), join(env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      join(env.LOCALAPPDATA || join(home, 'AppData\\Local'), 'Google\\Chrome\\Application\\chrome.exe'), join(env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
      join(env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe')],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'), '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
  }[platform()] || [];
  const found = list.find(path => existsSync(path));
  if (!found) throw new Error('No Chrome or Edge found. Set CHROME_PATH to the browser program.');
  return found;
}

/** Windows: copy the saved "is the Windows password empty?" answer into the new profile (see the top of this file). */
function seedPasswordCheck(profile, browser) {
  if (platform() !== 'win32' || !process.env.LOCALAPPDATA) return;
  const vendor = /msedge/i.test(browser) ? ['Microsoft', 'Edge'] : ['Google', 'Chrome'];
  try {
    const saved = JSON.parse(readFileSync(join(process.env.LOCALAPPDATA, ...vendor, 'User Data', 'Local State'), 'utf8')).password_manager || {};
    if (!saved.os_password_last_changed) return;
    writeFileSync(join(profile, 'Local State'), JSON.stringify({ password_manager: { os_password_blank: saved.os_password_blank === true, os_password_last_changed: saved.os_password_last_changed } }));
  } catch { /* no saved answer */ }
}

const browserPath = findBrowser();
const profile = mkdtempSync(join(tmpdir(), 'deck-render-'));
seedPasswordCheck(profile, browserPath);
const child = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--allow-file-access-from-files', `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore', detached: platform() !== 'win32' });
let finished = false;
const kill = () => {
  try { if (platform() === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked: the temp folder is cleaned later */ }
};
process.on('exit', () => { if (!finished) kill(); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130));

let port = null, wsPath = null;
for (let i = 0; i < 150 && !port; i++) { await sleep(100); try { [port, wsPath] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/); } catch { /* not yet */ } }
if (!port) { console.error('The browser did not start.'); process.exit(2); }
const socket = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
await new Promise((ok, fail) => { socket.onopen = ok; socket.onerror = fail; });
let id = 0; const pending = new Map(), listeners = [];
socket.onmessage = message => { const data = JSON.parse(message.data); if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); } else listeners.forEach(l => l(data)); };
const send = (method, params = {}, sessionId) => new Promise(done => { const n = ++id; pending.set(n, done); socket.send(JSON.stringify(sessionId ? { id: n, method, params, sessionId } : { id: n, method, params })); });

const { targetId } = (await send('Target.createTarget', { url: 'about:blank' })).result;
const { sessionId } = (await send('Target.attachToTarget', { targetId, flatten: true })).result;
const call = (method, params) => send(method, params, sessionId);
const errors = [];
listeners.push(m => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' ').slice(0, 300));
  if (m.method === 'Page.javascriptDialogOpening') call('Page.handleJavaScriptDialog', { accept: true });
});
await call('Runtime.enable'); await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });   // (as most screens: animations on)
const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'evaluate failed'); return r.result?.result?.value; };
const waitFor = async (expression, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await evaluate(expression)) return true; } catch { /* not yet */ } await sleep(50); } return false; };
const key = async (k, code, keyCode) => { await call('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode }); await call('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode }); };

const report = { file: page, size: { width, height }, slides: [], errors: [], editor: null, problems: [] };
try {
  await call('Page.navigate', { url: pathToFileURL(page).href + (withTemplates ? '?templates=1' : '') });
  if (!await waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage > section.scene.is-active')`)) report.problems.push('the presentation did not start (no active slide after 15 s)');
  // (fresh browser storage: no remembered theme, draft or settings play a part)
  const slides = await evaluate(`[...document.querySelectorAll('#stage > section.scene')].map(s => ({ name: s.dataset.name, title: s.dataset.title || '', steps: Math.max(Number(s.dataset.steps || 0), ...[...s.querySelectorAll('[data-reveal-step]')].map(e => Number(e.dataset.revealStep) || 0)), skip: s.hasAttribute('data-skip'), backup: s.hasAttribute('data-backup') }))`) || [];
  report.slideCount = slides.length;
  const LAYOUT = `(() => {
    const scene = document.querySelector('#stage > section.scene.is-active'); if (!scene) return { missing: true };
    const box = scene.getBoundingClientRect(), found = [];
    const name = e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/)[0] : '') + ' "' + (e.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
    for (const e of scene.querySelectorAll('*')) {
      if (e.closest('.speaker-notes, [aria-hidden="true"], svg, script, style, template')) continue;
      const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
      const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      const margin = 2;
      if ((r.right > box.right + margin || r.bottom > box.bottom + margin || r.left < box.left - margin || r.top < box.top - margin) && (e.innerText || '').trim()) found.push('outside the slide: ' + name(e));
      if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && /(hidden|clip)/.test(s.overflowX + s.overflowY) && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) && s.textOverflow !== 'ellipsis') found.push('text cut off in its box: ' + name(e));
    }
    return { found: [...new Set(found)].slice(0, 12), words: (scene.innerText || '').split(/\\s+/).filter(Boolean).length };
  })()`;
  for (const [index, slide] of slides.entries()) {
    if (onlySlide && slide.name !== onlySlide) continue;
    const before = errors.length;
    await evaluate(`location.hash = ${JSON.stringify(slide.name)}; true`);
    const shown = await waitFor(`document.querySelector('#stage > section.scene.is-active')?.dataset.name === ${JSON.stringify(slide.name)}`, 5000);
    await sleep(1600);
    for (let step = 0; step < slide.steps; step++) { await key('ArrowRight', 'ArrowRight', 39); await sleep(900); }   // every click of the slide
    await sleep(600);
    const still = await evaluate(`document.querySelector('#stage > section.scene.is-active')?.dataset.name`);
    const layout = await evaluate(LAYOUT).catch(e => ({ found: ['layout check failed: ' + e.message] }));
    const fileName = String(index + 1).padStart(2, '0') + '-' + slide.name + '.png';
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(out, fileName), Buffer.from(shot.result.data, 'base64'));
    const row = { number: index + 1, name: slide.name, title: slide.title, screenshot: join(out, fileName), shown, stayed: still === slide.name, errors: errors.slice(before), layout: layout.found || [], words: layout.words };
    report.slides.push(row);
    if (!shown) report.problems.push(`slide ${slide.name}: could not be shown (#${slide.name})`);
    if (row.errors.length) report.problems.push(`slide ${slide.name}: script errors: ${row.errors.join(' | ')}`);
    row.layout.forEach(problem => report.problems.push(`slide ${slide.name}: ${problem}`));
  }
  // presenting from the first slide with Next only: which slides the audience sees, in which order (skipped and backup
  // slides are passed over), and that the talk reaches its last slide
  if (!onlySlide && slides.length) {
    await evaluate(`location.hash = ${JSON.stringify(slides[0].name)}; true`); await sleep(1200);
    // (some slides hold Next while they play, so a press that changes nothing is tried again after a pause; the walk
    //  ends when ten presses in a row change nothing, i.e. at the end of the talk, or after 3 minutes)
    const seen = [];
    const stateNow = () => evaluate(`(() => { const s = document.querySelector('#stage > section.scene.is-active'); return s ? s.dataset.name + '|' + document.querySelectorAll('#stage > section.scene.is-active [data-reveal-step].is-revealed, #stage > section.scene.is-active .is-revealed').length + '|' + (s.className || '') : ''; })()`);
    let still = 0;
    const end = Date.now() + 180000;
    while (still < 10 && Date.now() < end) {
      const before = await stateNow();
      const name = before.split('|')[0];
      if (name && seen[seen.length - 1] !== name) seen.push(name);
      await key('ArrowRight', 'ArrowRight', 39); await sleep(700);
      still = (await stateNow()) === before ? still + 1 : 0;
    }
    report.presentingOrder = seen;
    const skipped = slides.filter(slide => !seen.includes(slide.name)).map(slide => slide.name);
    report.notShownWhenPresenting = skipped;
  }
  // the editor opens (E) without errors, and shows the slides
  if (!onlySlide) {
    const before = errors.length;
    await evaluate(`location.hash = ${JSON.stringify(slides[0]?.name || '')}; true`); await sleep(500);
    await key('e', 'KeyE', 69);
    const opened = await waitFor(`!!document.querySelector('.editor:not([hidden]) .editor-stage .scene')`, 8000);
    const listed = opened ? await evaluate(`document.querySelectorAll('.editor-slide-list > li').length`) : 0;
    report.editor = { opened, slidesListed: listed, errors: errors.slice(before) };
    if (!opened) report.problems.push('the editor (E) did not open (a file saved without the editor has none: then this is expected)');
    else if (listed !== slides.filter(slide => !withTemplates || !slide.name.startsWith('template-')).length) report.problems.push(`the editor lists ${listed} slides, the file has ${slides.length}`);   // (templates are no slides in the editor)
    if (report.editor.errors.length) report.problems.push('editor: script errors: ' + report.editor.errors.join(' | '));
    if (opened) { const shot = await call('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(out, '00-editor.png'), Buffer.from(shot.result.data, 'base64')); }
  }
  report.errors = errors;
} finally {
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1));
  try { socket.close(); } catch { /* closed */ }
  kill(); finished = true;
}
console.log(`${report.slides.length} slides checked, ${report.errors.length} script errors, ${report.problems.length} problems. Screenshots and report.json: ${out}`);
if (report.presentingOrder) console.log('Presenting with Next: ' + report.presentingOrder.join(' → ') + (report.notShownWhenPresenting.length ? '   (passed over: ' + report.notShownWhenPresenting.join(', ') + ')' : ''));
report.problems.forEach(problem => console.log('  - ' + problem));
process.exit(report.problems.length ? 1 : 0);
