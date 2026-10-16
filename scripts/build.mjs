/**
 * Compilation de production.
 *   node scripts/build.mjs          → dist/public (client) + dist/server.js
 *   node scripts/build.mjs --watch  → recompile le client à chaque modification
 */
import { build, context } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'dist');
const pub = join(out, 'public');
const watch = process.argv.includes('--watch');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function writeHtml(js, css) {
  const tpl = readFileSync(join(root, 'src/client/index.html'), 'utf8');
  const html = tpl.replace('<!--CSS-->', `<link rel="stylesheet" href="/${css}">`).replace('<!--JS-->', `<script type="module" src="/${js}"></script>`);
  writeFileSync(join(pub, 'index.html'), html);
}

function writeServiceWorker() {
  // Précache : tout le client sauf les gros fichiers audio (chargés et mis en cache à la demande).
  const files = walk(pub)
    .map((p) => '/' + relative(pub, p).split('\\').join('/'))
    .filter((p) => !p.endsWith('.gz') && !p.endsWith('sw.js') && !p.includes('/audio/') && !p.endsWith('.txt'));
  const version = createHash('sha1').update(files.join('|') + Date.now()).digest('hex').slice(0, 10);
  const tpl = readFileSync(join(root, 'src/client/sw.js'), 'utf8');
  writeFileSync(join(pub, 'sw.js'), tpl.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(['/', ...files.filter((f) => f !== '/index.html')])));
}

function compress() {
  for (const f of walk(pub)) {
    if (/\.(html|js|css|json|svg|webmanifest|txt)$/.test(f)) writeFileSync(`${f}.gz`, gzipSync(readFileSync(f), { level: 9 }));
  }
}

async function buildClient(opts = {}) {
  const result = await build({
    entryPoints: [join(root, 'src/client/main.tsx')],
    bundle: true,
    format: 'esm',
    splitting: false,
    minify: !watch,
    sourcemap: watch ? 'inline' : 'linked',
    target: ['es2022', 'chrome100', 'safari15', 'firefox100'],
    outdir: join(pub, 'assets'),
    entryNames: watch ? 'app' : 'app-[hash]',
    assetNames: '[name]-[hash]',
    jsx: 'automatic',
    loader: { '.woff': 'file' },
    external: ['/fonts/*'],
    metafile: true,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"', __STATIC__: 'false', __AUDIO_BASE__: '"/audio/"', __AAC_EXT__: '"m4a"' },
    logLevel: 'warning',
    ...opts,
  });
  const outputs = Object.keys(result.metafile.outputs).map((p) => relative(pub, join(root, p)));
  const js = outputs.find((p) => p.endsWith('.js'));
  const css = outputs.find((p) => p.endsWith('.css'));
  writeHtml(js, css);
  return result;
}

async function main() {
  if (!watch && existsSync(out)) rmSync(out, { recursive: true, force: true });
  mkdirSync(pub, { recursive: true });
  cpSync(join(root, 'public'), pub, { recursive: true });

  if (watch) {
    const ctx = await context({
      entryPoints: [join(root, 'src/client/main.tsx')],
      bundle: true,
      format: 'esm',
      sourcemap: 'inline',
      outdir: join(pub, 'assets'),
      entryNames: 'app',
      jsx: 'automatic',
      external: ['/fonts/*'],
      define: { 'process.env.NODE_ENV': '"development"', __STATIC__: 'false', __AUDIO_BASE__: '"/audio/"', __AAC_EXT__: '"m4a"' },
      logLevel: 'info',
    });
    writeHtml('assets/app.js', 'assets/app.css');
    writeFileSync(join(pub, 'sw.js'), "self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));");
    await ctx.watch();
    console.log('Client en surveillance (dist/public).');
    return;
  }

  const res = await buildClient();
  writeServiceWorker();
  compress();

  await build({
    entryPoints: [join(root, 'src/server/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: join(out, 'server.js'),
    external: ['bufferutil', 'utf-8-validate'],
    banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
    sourcemap: 'linked',
    logLevel: 'warning',
  });

  const sizes = Object.entries(res.metafile.outputs)
    .filter(([p]) => !p.endsWith('.map'))
    .map(([p, o]) => `${relative(root, p)} ${(o.bytes / 1024).toFixed(0)} Kio (gzip ${(gzipSync(readFileSync(join(root, p))).length / 1024).toFixed(0)} Kio)`);
  console.log('Client :\n  ' + sizes.join('\n  '));
  console.log('Serveur : dist/server.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
