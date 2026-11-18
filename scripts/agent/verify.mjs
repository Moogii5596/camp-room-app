#!/usr/bin/env node
// npm run verify  — tsc (app + worker) + domain unit тест. Гаралт богино: зөвхөн алдааны сүүл.
// --hook          — Claude Code Stop hook: .ts/.tsx өөрчлөгдөөгүй бол алгасна; унавал exit 2 (агент засна).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const hook = process.argv.includes('--hook');
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
process.chdir(root);

if (hook) {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
    if (input.stop_hook_active) process.exit(0); // давталтаас сэргийлнэ
  } catch {}
  const st = spawnSync('git', ['status', '--porcelain', '--', '*.ts', '*.tsx'], { encoding: 'utf8' });
  if (!st.stdout?.trim()) process.exit(0);
}

if (!existsSync('node_modules')) {
  console.error('verify: node_modules алга — `npm install` хийнэ үү (алгаслаа).');
  process.exit(0);
}

const run = (label, cmd) => {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  const ok = r.status === 0;
  if (!ok) {
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-30).join('\n');
    console.error(`✖ ${label}\n${out}`);
  } else if (!hook) console.log(`✔ ${label}`);
  return ok;
};

const hasTests = (dir) => {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { recursive: true }).some((f) => /\.test\.ts$/.test(String(f)));
};

let ok = run('tsc (app)', 'npx tsc --noEmit -p .');
if (existsSync('worker/tsconfig.json')) ok = run('tsc (worker)', 'npx tsc --noEmit -p worker') && ok;
if (hasTests('src/domain') || hasTests('worker/src')) {
  ok = run('vitest', 'npx vitest run --reporter=dot --silent') && ok;
}

if (!ok) process.exit(hook ? 2 : 1);
