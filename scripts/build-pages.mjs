import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import './build.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const publicBundleUrl = 'https://henriq-design.github.io/contextic/contextic.iife.js';
const bookmarklet = `javascript:(()=>{const s=document.createElement('script');s.async=true;s.onerror=()=>alert('Contextic no pudo cargar: esta pagina puede bloquear scripts externos (CSP).');s.src='${publicBundleUrl}?v='+Date.now();document.documentElement.appendChild(s);})();`;

await mkdir(docsDir, { recursive: true });
await copyFile(path.join(root, 'dist/contextic.iife.js'), path.join(docsDir, 'contextic.iife.js'));
await writeFile(path.join(docsDir, 'bookmarklet.txt'), bookmarklet, 'utf8');

try {
  const installPage = await readFile(path.join(docsDir, 'index.html'), 'utf8');
  await writeFile(path.join(docsDir, 'index.html'), refreshBookmarkletUrl(installPage, bookmarklet), 'utf8');
} catch {
  await writeFile(path.join(docsDir, 'index.html'), buildInstallPage(bookmarklet), 'utf8');
}

console.log('Generado docs/contextic.iife.js');
console.log('Generado docs/bookmarklet.txt');
console.log('Verificado docs/index.html');

function buildInstallPage(bookmarkletUrl) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Contextic</title>
  </head>
  <body>
    <main>
      <h1>Contextic</h1>
      <p>Convierte cualquier página web en un design-context.md listo para IA, handoff y revisión de UI.</p>
      <a href="${bookmarkletUrl}">Contextic</a>
    </main>
  </body>
</html>
`;
}

function refreshBookmarkletUrl(source, bookmarkletUrl) {
  return source.replace(
    /href="javascript:\(\(\)=>\{const s=document\.createElement\('script'\);s\.async=true;s\.onerror=\(\)=>alert\('Contextic no pudo cargar: esta pagina puede bloquear scripts externos \(CSP\)\.'\);s\.src='https:\/\/henriq-design\.github\.io\/contextic\/contextic\.iife\.js\?v='\+Date\.now\(\);document\.documentElement\.appendChild\(s\);\}\)\(\);"/g,
    `href="${bookmarkletUrl}"`
  );
}
