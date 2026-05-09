import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const publicBundleUrl = 'https://henriq-design.github.io/contextic/contextic.iife.js';

test('build:pages generates the GitHub Pages install assets', () => {
  const result = spawnSync('npm', ['run', 'build:pages'], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const bundlePath = path.join(root, 'docs/contextic.iife.js');
  const bookmarkletPath = path.join(root, 'docs/bookmarklet.txt');
  const indexPath = path.join(root, 'docs/index.html');

  assert.equal(existsSync(bundlePath), true);
  assert.equal(existsSync(bookmarkletPath), true);
  assert.equal(existsSync(indexPath), true);
  assert.match(readFileSync(bundlePath, 'utf8'), /function evaluateBehavioralRules/);
  assert.match(readFileSync(bookmarkletPath, 'utf8'), new RegExp(escapeRegExp(publicBundleUrl)));
  assert.match(readFileSync(indexPath, 'utf8'), /Contextic/);
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
