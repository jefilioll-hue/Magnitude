/**
 * Serveur Magnitude : fichiers statiques du jeu + temps réel WebSocket (/ws).
 *
 * Variables d'environnement :
 *   PORT              port d'écoute (défaut 8080)
 *   HOST              interface (défaut 0.0.0.0)
 *   STATIC_DIR        dossier du client compilé (défaut ./dist/public)
 *   DATA_DIR          dossier de sauvegarde des salons (défaut ./data ; vide = pas de sauvegarde)
 *   ALLOWED_ORIGINS   origines autorisées pour le WebSocket, séparées par des virgules (défaut : toutes)
 *   TRUST_PROXY       "1" pour lire l'IP client dans X-Forwarded-For (derrière un proxy)
 *   EXTRA_QUESTIONS   fichier JSON de questions privées, jamais envoyées au navigateur avant révélation
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { createBank } from '../shared/deck.ts';
import { QUESTIONS, auditQuestions } from '../shared/questions/index.ts';
import type { Question } from '../shared/types.ts';
import { MAX_MESSAGE_BYTES, parseClientMessage, type ServerMessage } from '../shared/protocol.ts';
import { RoomManager } from './rooms.ts';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? 'dist/public');
const DATA_DIR = process.env.DATA_DIR === undefined ? resolve('data') : process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : null;
const ALLOWED = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const JOIN_RATE = Number(process.env.JOIN_RATE_PER_MIN ?? 15);

const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }));

/* ------------------------------------------------------------------ questions */

let questions: Question[] = [...QUESTIONS];
if (process.env.EXTRA_QUESTIONS) {
  try {
    const extra = JSON.parse(readFileSync(process.env.EXTRA_QUESTIONS, 'utf8')) as Question[];
    questions = questions.concat(extra);
    log('questions supplémentaires chargées', { count: extra.length });
  } catch (e) {
    log('EXTRA_QUESTIONS illisible', { error: String(e) });
  }
}
const problems = auditQuestions(questions);
if (problems.length) {
  log('base de questions invalide', { problems: problems.slice(0, 10) });
  process.exit(1);
}
const bank = createBank(questions);

/* ------------------------------------------------------------------ salons */

const sockets = new Map<string, WebSocket>();
const manager = new RoomManager({
  bank,
  send: (connId, msg: ServerMessage) => {
    const ws = sockets.get(connId);
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  },
  log,
});

const snapshotFile = DATA_DIR ? join(DATA_DIR, 'rooms.json') : null;
if (snapshotFile && existsSync(snapshotFile)) {
  const n = manager.restore(readFileSync(snapshotFile, 'utf8'));
  log('salons restaurés', { count: n });
}
function save(force = false): void {
  if (!snapshotFile || !DATA_DIR) return;
  if (!manager.isDirty() && !force) return;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${snapshotFile}.tmp`;
    writeFileSync(tmp, manager.snapshot());
    renameSync(tmp, snapshotFile);
  } catch (e) {
    log('sauvegarde impossible', { error: String(e) });
  }
}

const tickTimer = setInterval(() => manager.tick(), 200);
const saveTimer = setInterval(() => save(), 3000);

/* ------------------------------------------------------------------ HTTP statique */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self' blob:; connect-src 'self' ws: wss:; worker-src 'self'; base-uri 'self'; frame-ancestors 'self'",
};

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://local');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = normalize(join(STATIC_DIR, pathname));
  if (!file.startsWith(STATIC_DIR + sep) && file !== STATIC_DIR) {
    res.writeHead(403).end();
    return;
  }
  let target = file;
  let exists = existsSync(target) && statSync(target).isFile();
  if (!exists && !extname(pathname)) {
    // Application monopage : toute route inconnue renvoie l'index (liens d'invitation /?code=…).
    target = join(STATIC_DIR, 'index.html');
    exists = existsSync(target);
  }
  if (!exists) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }).end('Introuvable');
    return;
  }
  const ext = extname(target);
  const immutable = /-[A-Z0-9]{8}\.(js|css)$/.test(target) || target.includes(`${sep}fonts${sep}`);
  const headers: Record<string, string> = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': ext === '.html' || target.endsWith('sw.js') || target.endsWith('manifest.json')
      ? 'no-cache'
      : immutable
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400',
    ...SECURITY_HEADERS,
  };
  const accept = String(req.headers['accept-encoding'] ?? '');
  const compressible = ['.html', '.js', '.css', '.json', '.svg', '.txt', '.webmanifest'].includes(ext);
  if (compressible && accept.includes('gzip') && existsSync(`${target}.gz`)) {
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
    target = `${target}.gz`;
  }
  headers['Content-Length'] = String(statSync(target).size);
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(target).pipe(res);
}

const server = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({ ok: true, rooms: manager.roomCount, players: manager.playerCount, questions: bank.all.length }),
    );
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  serveStatic(req, res);
});

/* ------------------------------------------------------------------ WebSocket */

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES, perMessageDeflate: false });
const joinAttempts = new Map<string, number[]>();

function clientIp(req: IncomingMessage): string {
  if (TRUST_PROXY) {
    const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress ?? 'inconnue';
}

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://local');
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  const origin = req.headers.origin;
  if (ALLOWED.length > 0 && (!origin || !ALLOWED.includes(origin))) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws: WebSocket & { alive?: boolean }, req: IncomingMessage) => {
  const id = randomUUID();
  const ip = clientIp(req);
  sockets.set(id, ws);
  manager.connect(id);
  ws.alive = true;
  let tokens = 40;
  let last = Date.now();
  ws.on('pong', () => (ws.alive = true));
  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    // Seau à jetons : 40 messages d'avance, 10 par seconde ensuite.
    const now = Date.now();
    tokens = Math.min(40, tokens + ((now - last) / 1000) * 10);
    last = now;
    if (tokens < 1) {
      ws.send(JSON.stringify({ t: 'error', code: 'rate_limited', message: 'Trop d’actions en peu de temps. Patientez un instant.' }));
      return;
    }
    tokens -= 1;
    const msg = parseClientMessage(data.toString());
    if (!msg) {
      ws.send(JSON.stringify({ t: 'error', code: 'bad_message', message: 'Message non reconnu.' }));
      return;
    }
    if (msg.t === 'join' || msg.t === 'create') {
      const hits = (joinAttempts.get(ip) ?? []).filter((t) => now - t < 60_000);
      hits.push(now);
      joinAttempts.set(ip, hits);
      if (hits.length > JOIN_RATE) {
        ws.send(JSON.stringify({ t: 'error', code: 'rate_limited', message: 'Trop de tentatives. Réessayez dans une minute.', ref: msg.t }));
        return;
      }
    }
    try {
      manager.handle(id, msg);
    } catch (e) {
      log('erreur de traitement', { error: String(e), type: msg.t });
      ws.send(JSON.stringify({ t: 'error', code: 'invalid_action', message: 'Action impossible à ce moment de la partie.' }));
    }
  });
  ws.on('close', () => {
    sockets.delete(id);
    manager.disconnect(id);
  });
  ws.on('error', () => ws.close());
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients as Set<WebSocket & { alive?: boolean }>) {
    if (ws.alive === false) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
  const now = Date.now();
  for (const [ip, hits] of joinAttempts) if (hits.every((t) => now - t > 60_000)) joinAttempts.delete(ip);
}, 20_000);

server.listen(PORT, HOST, () => {
  log('Magnitude prêt', { url: `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`, static: STATIC_DIR, data: DATA_DIR, questions: bank.all.length });
});

function shutdown(signal: string): void {
  log('arrêt', { signal });
  clearInterval(tickTimer);
  clearInterval(saveTimer);
  clearInterval(heartbeat);
  save(true);
  for (const ws of wss.clients) ws.close(1012, 'Redémarrage du serveur');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
