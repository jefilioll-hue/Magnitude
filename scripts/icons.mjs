// Génère les icônes PNG de l'application installable à partir de public/icons/icon.svg (nécessite « sharp »).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); } catch { sharp = require('/home/claude/.npm-global/lib/node_modules/sharp'); }
const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url));
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;
await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
// Version « maskable » : marge de sécurité de 20 % et fond plein.
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#101640' } }).composite([{ input: inner, gravity: 'center' }]).png().toFile(out('icon-maskable-512.png'));
console.log('Icônes générées.');
