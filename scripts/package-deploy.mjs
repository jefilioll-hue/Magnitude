/**
 * Paquet de mise en ligne, sans dépendance à installer :
 *   node scripts/build.mjs && node scripts/package-deploy.mjs → deploy/magnitude-en-ligne/
 * Contient le serveur compilé (ws inclus) et le client ; l'hébergeur lance seulement « node dist/server.js ».
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'deploy/magnitude-en-ligne');
if (!existsSync(join(root, 'dist/server.js'))) throw new Error('Lancez d’abord node scripts/build.mjs');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'dist'), join(out, 'dist'), { recursive: true, filter: (p) => !p.endsWith('.map') });

writeFileSync(join(out, 'package.json'), JSON.stringify({
  name: 'magnitude-en-ligne',
  version: '1.0.0',
  private: true,
  type: 'module',
  description: 'Magnitude — serveur de jeu compilé, prêt à héberger.',
  engines: { node: '>=20' },
  scripts: { start: 'node dist/server.js', build: 'echo "Déjà compilé"' },
}, null, 2) + '\n');

writeFileSync(join(out, 'render.yaml'), `# Render (https://render.com), offre gratuite : le service s'endort après 15 min sans visite
# (premier chargement ensuite : environ une minute) et les salons en cours sont perdus au réveil.
services:
  - type: web
    name: magnitude
    runtime: node
    plan: free
    buildCommand: echo "Déjà compilé"
    startCommand: node dist/server.js
    healthCheckPath: /healthz
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: DATA_DIR
        value: ""
      - key: TRUST_PROXY
        value: "1"
`);

writeFileSync(join(out, 'Dockerfile'), `FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0 STATIC_DIR=/app/dist/public DATA_DIR=""
COPY dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
`);

writeFileSync(join(out, 'README.md'), `# Magnitude — mise en ligne

Ce dossier contient le jeu complet déjà compilé. Aucune installation : l'hébergeur lance

    node dist/server.js

Le serveur écoute sur la variable PORT (fournie par l'hébergeur), sert le jeu et le temps réel (WebSocket /ws).
Vérification : https://<votre-adresse>/healthz doit répondre {"ok":true,...}.

Sur Render (gratuit) : New → Web Service → ce dépôt → Runtime Node, Build command \`echo ok\`,
Start command \`node dist/server.js\`, Instance type Free.

Sur un ordinateur (Node 20 ou plus) : \`node dist/server.js\`, puis http://localhost:8080
(sur le même Wi-Fi : http://<adresse-IP-de-l'ordinateur>:8080).
`);
console.log('deploy/magnitude-en-ligne prêt');
