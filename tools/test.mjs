#!/usr/bin/env node
// Tests for the presentation, on Windows, macOS and Linux (Node 22+ and Chrome or Edge; nothing to install).
//
//   node tools/test.mjs              only the suites for what changed in src/ since the last run that passed
//   node tools/test.mjs --all        every suite (once before delivering)
//   node tools/test.mjs smoke editor-canvas      these suites
//   node tools/test.mjs --list       the suites and the files each one covers
//
// It builds _preview.html first when src/ is newer (python build.py --preview). The suites are in tools/test/suites:
// each says which files of src/ it covers (`covers`), so a change to the editor never runs the presenting suites.
// One browser, several suites at the same time, each in its own isolated tab. After a run in which every selected
// suite passed, tools/test/last-pass.json keeps a fingerprint of src/, so the next run only tests what changed after.
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import { pathToFileURL } from 'node:url';
import { PROJECT, PAGE, startBrowser, makePage } from './test/harness.mjs';

const SRC = join(PROJECT, 'src');
const SUITES = join(PROJECT, 'tools', 'test', 'suites');
const LAST_PASS = join(PROJECT, 'tools', 'test', 'last-pass.json');
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const named = args.filter(arg => !arg.startsWith('--'));

const files = dir => readdirSync(dir, { withFileTypes: true }).filter(entry => !entry.name.startsWith('.'))   // no hidden system files (.DS_Store)
  .flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
const sourceFiles = () => files(SRC).map(path => relative(SRC, path).split(sep).join('/')).sort();
const hashOf = path => createHash('sha1').update(readFileSync(path)).digest('hex').slice(0, 12);
/** What the tests depend on: every file of src/, and (with a # name) build.py, the runner, the harness and each suite. */
const fingerprint = () => Object.assign(Object.fromEntries(sourceFiles().map(name => [name, hashOf(join(SRC, name))])), {
  '#build.py': hashOf(join(PROJECT, 'build.py')), '#tools/test.mjs': hashOf(join(PROJECT, 'tools', 'test.mjs')), '#tools/test/harness.mjs': hashOf(join(PROJECT, 'tools', 'test', 'harness.mjs')),
  ...Object.fromEntries(readdirSync(SUITES).filter(name => name.endsWith('.mjs')).map(name => ['#suite:' + name.replace(/\.mjs$/, ''), hashOf(join(SUITES, name))])),
});
/** Does `suite` test the file `name`? A suite tests its own file; build.py, the runner and the harness concern every suite. */
const coversFile = (suite, name) => name.startsWith('#suite:') ? name === '#suite:' + suite.name : name.startsWith('#') || suite.covers.some(prefix => name.startsWith(prefix) || prefix === '*');

/** Builds _preview.html when src/ or build.py changed since it was built (by content, not by file dates). */
const BUILT = join(PROJECT, 'tools', 'test', 'built-from.txt');
function buildIfNeeded() {
  const sources = createHash('sha1').update(JSON.stringify(sourceFiles().map(name => [name, hashOf(join(SRC, name))]))).update(readFileSync(join(PROJECT, 'build.py'))).digest('hex');
  if (existsSync(PAGE) && existsSync(BUILT) && readFileSync(BUILT, 'utf8') === sources) return;
  for (const python of process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python']) {
    try {
      execFileSync(python, ['build.py', '--preview'], { cwd: PROJECT, stdio: ['ignore', 'ignore', 'pipe'] });
      writeFileSync(BUILT, sources);
      console.log('built _preview.html');
      return;
    } catch (error) { if (error.code !== 'ENOENT') { console.error(String(error.stderr || error.message).trim()); process.exit(1); } }   // build.py says why
  }
  throw new Error('No Python found to run build.py');
}

async function loadSuites() {
  const list = [];
  for (const file of readdirSync(SUITES).filter(name => name.endsWith('.mjs')).sort()) {
    const name = file.replace(/\.mjs$/, '');
    try {
      const module = await import(pathToFileURL(join(SUITES, file)).href);
      list.push({ name, covers: module.covers || [], run: module.default, timeout: module.timeoutMs || 180000 });
    } catch (error) {   // a suite that does not load fails by itself; the others still run
      list.push({ name, covers: ['*'], run: () => { throw new Error('the suite file does not load: ' + error.message); }, timeout: 1000 });
    }
  }
  return list;
}

const suites = await loadSuites();
if (flag('--list')) {
  for (const suite of suites) console.log(suite.name.padEnd(18), suite.covers.join(' '));
  process.exit(0);
}

// which suites: named, all, or the ones covering a changed file
let selected, changed = [];
const now = fingerprint();
const unknown = named.filter(name => !suites.some(suite => suite.name === name));
if (unknown.length) { console.error('No such suite: ' + unknown.join(', ') + ' (node tools/test.mjs --list)'); process.exit(1); }
if (named.length) selected = suites.filter(suite => named.includes(suite.name));
else if (flag('--all') || !existsSync(LAST_PASS)) selected = suites;
else {
  const last = JSON.parse(readFileSync(LAST_PASS, 'utf8'));
  changed = Object.keys(now).filter(name => now[name] !== last[name]).concat(Object.keys(last).filter(name => !(name in now)));
  selected = suites.filter(suite => changed.some(name => coversFile(suite, name)));
  if (!changed.length) { console.log('Nothing changed since the last run that passed.'); process.exit(0); }
  console.log('changed:', changed.join(' '));
}
if (!selected.length) { console.log('No suite covers these files.'); process.exit(0); }

buildIfNeeded();
const started = Date.now();
const browser = await startBrowser();
// at most 4 browsers at once: more made the drag and two-window timing checks fail now and then on a busy machine
// (TEST_PARALLEL sets another number)
const parallel = Math.max(1, Math.min(Number(process.env.TEST_PARALLEL) || Math.min(4, Math.floor(cpus().length / 2)), selected.length));
const reports = [];
const queue = [...selected];
async function worker() {
  while (queue.length) {
    const suite = queue.shift();
    const t = await makePage(browser.connection, suite.name);
    const begin = Date.now();
    let crash = null;
    const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('suite took longer than ' + suite.timeout / 1000 + ' s')), suite.timeout).unref());
    try { await Promise.race([suite.run(t), timer]); } catch (error) { crash = error.message; }
    if (crash) t.check('the suite ran to its end', false, crash);
    t.check('no page errors', !t.errors.length, t.errors.join(' | ').slice(0, 400));
    await t.close();
    const failed = t.results.filter(result => !result.ok);
    reports.push({ name: suite.name, seconds: (Date.now() - begin) / 1000, passed: t.results.length - failed.length, failed });
    console.log(`${failed.length ? 'FAIL' : 'ok  '} ${suite.name.padEnd(18)} ${String(t.results.length - failed.length).padStart(3)} passed${failed.length ? ', ' + failed.length + ' failed' : ''}  ${((Date.now() - begin) / 1000).toFixed(1)} s`);
    failed.forEach(result => console.log(`       ✗ ${result.label}  ${result.extra}`));
  }
}
await Promise.all(Array.from({ length: parallel }, worker));
await browser.close();
const failures = reports.reduce((sum, report) => sum + report.failed.length, 0);
console.log(`${selected.length} suites, ${reports.reduce((sum, r) => sum + r.passed, 0)} checks passed, ${failures} failed, ${((Date.now() - started) / 1000).toFixed(1)} s (${parallel} at a time)`);
if (!failures) {
  // remember what passed: files the selected suites cover (all of src/ after --all)
  const last = existsSync(LAST_PASS) ? JSON.parse(readFileSync(LAST_PASS, 'utf8')) : {};
  // a file counts as tested only when every suite that covers it ran (and passed) in this run
  for (const name of Object.keys(now)) if (suites.filter(suite => coversFile(suite, name)).every(suite => selected.includes(suite))) last[name] = now[name];
  for (const name of Object.keys(last)) if (!(name in now)) delete last[name];
  writeFileSync(LAST_PASS, JSON.stringify(last, null, 1) + '\n');
}
process.exit(failures ? 1 : 0);
