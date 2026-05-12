import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baseUrl = process.env.CONTEXTIC_URL || 'https://TU_USUARIO.github.io/contextic/contextic.iife.js';
const bookmarklet = `javascript:(()=>{const s=document.createElement('script');s.async=true;s.onerror=()=>alert('Contextic no pudo cargar: esta pagina puede bloquear scripts externos (CSP).');s.src='${baseUrl}?v='+Date.now();document.documentElement.appendChild(s);})();`;

await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/bookmarklet.txt'), bookmarklet, 'utf8');
console.log(bookmarklet);
