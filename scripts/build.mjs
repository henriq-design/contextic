import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceFiles = [
  'src/utils.js',
  'src/collect-colors.js',
  'src/collect-typography.js',
  'src/collect-spacing.js',
  'src/collect-components.js',
  'src/behavioral-model.js',
  'src/detect-frictions.js',
  'src/export-markdown.js',
  'src/index.js'
];

const chunks = [];

for (const file of sourceFiles) {
  const absolutePath = path.join(root, file);
  const source = await readFile(absolutePath, 'utf8');
  const transformed = source
    .replace(/^import .*;\n/gm, '')
    .replace(/^export /gm, '');

  chunks.push(`// ---- ${file} ----\n${transformed}`);
}

const bundle = `(() => {\n'use strict';\n${chunks.join('\n\n')}\n})();\n`;

await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/contextic.iife.js'), bundle, 'utf8');

const bookmarklet = `javascript:(()=>{const s=document.createElement('script');s.src='https://TU_USUARIO.github.io/contextic/contextic.iife.js?v='+Date.now();document.documentElement.appendChild(s);})();`;
await writeFile(path.join(root, 'dist/bookmarklet.txt'), bookmarklet, 'utf8');

console.log('Generado dist/contextic.iife.js');
console.log('Generado dist/bookmarklet.txt');
