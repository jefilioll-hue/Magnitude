/**
 * Mode développement : recompile le client à chaque modification et relance le
 * serveur (TypeScript exécuté directement par Node ≥ 22.18) quand son code change.
 *   npm run dev   →  http://localhost:8080
 */
import { spawn } from 'node:child_process';

const procs = [
  spawn(process.execPath, ['scripts/build.mjs', '--watch'], { stdio: 'inherit' }),
  spawn(process.execPath, ['--watch-path=src/server', '--watch-path=src/shared', 'src/server/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, STATIC_DIR: 'dist/public', DATA_DIR: process.env.DATA_DIR ?? '' },
  }),
];
const stop = () => {
  for (const p of procs) p.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
