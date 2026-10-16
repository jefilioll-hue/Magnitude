/**
 * Vérifications de qualité propres au projet (complètent `tsc --strict`).
 *  - pas de console.log oublié ni de « debugger » ;
 *  - pas de valeur de points codée en dur dans l'interface (le barème vient de config.ts) ;
 *  - pas de secret ni de clé dans le code ;
 *  - pas de Math.random dans le moteur (déterminisme) ;
 *  - intégrité de la base de questions ;
 *  - chaque son référencé par le code existe dans le manifeste audio.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const problems = [];
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const src = walk(join(root, 'src')).filter((f) => /\.(ts|tsx)$/.test(f));

for (const f of src) {
  const rel = f.slice(root.length);
  const text = readFileSync(f, 'utf8');
  text.split('\n').forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (/console\.log\(/.test(line) && !rel.startsWith('src/server/')) problems.push(`${at} console.log oublié`);
    if (/\bdebugger\b/.test(line)) problems.push(`${at} debugger`);
    if (/(api[_-]?key|secret|password)\s*[:=]\s*['"][^'"]{6,}/i.test(line)) problems.push(`${at} secret potentiel`);
    if (rel.startsWith('src/shared/') && /Math\.random\(/.test(line)) problems.push(`${at} Math.random dans le code partagé (non déterministe)`);
    if (rel.startsWith('src/client/') && /\b(pileEstimator|contestRight)\s*:\s*\d/.test(line)) problems.push(`${at} barème codé en dur dans l'interface`);
  });
}

const { QUESTIONS, auditQuestions } = await import(join(root, 'src/shared/questions/index.ts'));
for (const p of auditQuestions(QUESTIONS)) problems.push(`questions : ${p}`);

const manifestPath = join(root, 'public/audio/manifest.json');
if (!existsSync(manifestPath)) problems.push('public/audio/manifest.json manquant (npm run audio)');
else {
  const sounds = JSON.parse(readFileSync(manifestPath, 'utf8')).sounds;
  const used = new Set();
  for (const f of src) {
    for (const m of readFileSync(f, 'utf8').matchAll(/['"`]((?:st|ui)_[a-z_]+)['"`]/g)) used.add(m[1]);
    for (const m of readFileSync(f, 'utf8').matchAll(/ui\('([a-z_]+)'\)/g)) used.add(`ui_${m[1]}`);
  }
  for (const s of used) {
    if (!sounds[s]) problems.push(`son « ${s} » utilisé mais absent du manifeste audio`);
    else for (const ext of ['webm', 'm4a']) if (!existsSync(join(root, `public/audio/${s}.${ext}`))) problems.push(`fichier public/audio/${s}.${ext} manquant`);
  }
  for (const m of ['theme', 'lobby', 'think_a', 'think_b', 'results']) if (!sounds[m]) problems.push(`musique « ${m} » absente`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problème(s).`);
  process.exit(1);
}
console.log(`Lint : ${src.length} fichiers, ${QUESTIONS.length} questions, aucun problème.`);
