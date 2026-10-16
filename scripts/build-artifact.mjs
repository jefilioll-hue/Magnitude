/**
 * Version autonome (sans serveur) : une seule page HTML + audio/ et fonts/ à côté.
 *   node scripts/build-artifact.mjs  → dist/artifact/
 * Le jeu en ligne passe par le canal temps réel de la page partagée (capacité « room »).
 */
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'dist/artifact');
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: [join(root, 'src/client/main.tsx')],
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  outdir: out,
  target: ['es2022', 'chrome100', 'safari15', 'firefox100'],
  jsx: 'automatic',
  external: ['/fonts/*'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"', __STATIC__: 'true', __AUDIO_BASE__: '"audio/"', __AAC_EXT__: '"mp4"' },
  logLevel: 'warning',
});
const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
const css = result.outputFiles.find((f) => f.path.endsWith('.css')).text.replaceAll('/fonts/', 'fonts/').replace(/<\/style/gi, '<\\/style');

const html = `<title>Magnitude</title>
<meta name="description" content="Jeu d’estimation : estimez, contestez, visez Tout Pile.">
<meta name="theme-color" content="#101640">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(join(out, 'magnitude.html'), html);
mkdirSync(join(out, 'audio'));
for (const f of readdirSync(join(root, 'public/audio'))) {
  // .m4a n'est pas servi par l'hébergeur : même contenu AAC sous l'extension .mp4.
  cpSync(join(root, 'public/audio', f), join(out, 'audio', f.replace(/\.m4a$/, '.mp4')));
}
cpSync(join(root, 'public/fonts'), join(out, 'fonts'), { recursive: true });
console.log(`dist/artifact/magnitude.html : ${(html.length / 1024).toFixed(0)} Ko`);
