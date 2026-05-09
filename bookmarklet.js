// Contextic — bookmarklet de producción
// 1. Ejecuta: npm run build
// 2. Publica dist/contextic.iife.js en GitHub Pages u otro alojamiento HTTPS.
// 3. Sustituye TU_USUARIO por tu usuario de GitHub.
// 4. Crea un marcador en el navegador y pega la URL javascript: de una sola línea como ubicación.

javascript:(()=>{const s=document.createElement('script');s.src='https://TU_USUARIO.github.io/contextic/contextic.iife.js?v='+Date.now();document.documentElement.appendChild(s);})();
