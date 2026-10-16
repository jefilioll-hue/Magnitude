/**
 * Version autonome (page partagée, sans serveur) : le jeu en ligne passe par le canal
 * temps réel de la page. Ici ce canal est simulé dans le navigateur (BroadcastChannel entre
 * onglets) avec la même interface que celle de la plateforme : rejoindre un salon nommé,
 * publier sa présence (4 Kio au plus), recevoir celle des autres.
 *
 *   node scripts/build-artifact.mjs && node --test e2e/peer.e2e.ts
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const ROOT = join(process.cwd(), 'dist/artifact');
let server: Server;
let browser: Browser;
let BASE = '';

const MOCK_ROOM = `(() => {
  const me = Math.random().toString(36).slice(2, 12);
  const rooms = new Map();
  function makeRoom(name) {
    const ch = new BroadcastChannel('mockroom:' + name);
    const peers = new Map();
    const lastSeen = new Map();
    const handlers = new Set();
    let mine = Object.freeze({});
    let snapshot = Object.freeze([]);
    const selfPeer = () => Object.freeze({ peer: me, sameTab: true, isMe: true, by: null, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() });
    const fire = (left = []) => {
      snapshot = Object.freeze([...peers.values()]);
      const change = { peers: snapshot, joined: [], left, updated: [] };
      queueMicrotask(() => handlers.forEach((h) => h(change)));
    };
    peers.set(me, selfPeer());
    snapshot = Object.freeze([...peers.values()]);
    let closed = false;
    const post = (m) => { if (!closed) ch.postMessage(m); };
    const announce = (type) => post({ type, from: me, presence: mine });
    ch.onmessage = (ev) => {
      const m = ev.data;
      if (m.from === me) return;
      if (m.type === 'leave') {
        const p = peers.get(m.from);
        if (p) { peers.delete(m.from); lastSeen.delete(m.from); fire([p]); }
        return;
      }
      lastSeen.set(m.from, Date.now());
      const old = peers.get(m.from);
      if (!old || JSON.stringify(old.presence) !== JSON.stringify(m.presence)) {
        peers.set(m.from, Object.freeze({ peer: m.from, sameTab: false, isMe: false, by: null, kind: 'viewer', guest: false, presence: Object.freeze(m.presence), updatedAt: Date.now() }));
        fire();
      }
      if (m.type === 'hello') announce('presence');
    };
    announce('hello');
    const hb = setInterval(() => {
      announce('presence');
      const now = Date.now();
      for (const [k, t] of lastSeen) if (now - t > 3500 && peers.has(k)) { const p = peers.get(k); peers.delete(k); lastSeen.delete(k); fire([p]); }
    }, 1000);
    addEventListener('pagehide', () => post({ type: 'leave', from: me }));
    return {
      name,
      presence(patch) {
        if (closed) return Promise.reject({ code: 'invalid_argument', message: 'left' });
        const next = { ...mine };
        for (const [k, v] of Object.entries(patch)) { if (v === null) delete next[k]; else next[k] = v; }
        if (new TextEncoder().encode(JSON.stringify(next)).length > 4096) return Promise.reject({ code: 'invalid_argument', message: 'presence > 4 KiB' });
        for (const v of Object.values(next)) if (Array.isArray(v)) for (const s of v) if (typeof s === 'string' && s.length > 1024) return Promise.reject({ code: 'invalid_argument', message: 'string > 1 KiB' });
        mine = Object.freeze(next);
        window.__maxPresence = Math.max(window.__maxPresence || 0, JSON.stringify(next).length);
        peers.set(me, selfPeer());
        fire();
        announce('presence');
        return Promise.resolve();
      },
      peers: () => snapshot,
      onPeers(h) { handlers.add(h); queueMicrotask(() => h({ peers: snapshot, joined: snapshot, left: [], updated: [] })); return () => handlers.delete(h); },
      leave() { if (closed) return Promise.resolve(); clearInterval(hb); post({ type: 'leave', from: me }); closed = true; ch.close(); rooms.delete(name); handlers.clear(); return Promise.resolve(); },
      connected: () => true,
      emit: () => Promise.resolve(),
      on: () => () => {},
    };
  }
  window.claude = {
    use: async (n) => (n === 'room' ? { join: async (name) => { if (!rooms.has(name)) rooms.set(name, makeRoom(name)); return rooms.get(name); } } : null),
  };
})();`;

const MIME: Record<string, string> = { '.json': 'application/json', '.webm': 'audio/webm', '.mp4': 'audio/mp4', '.woff': 'font/woff' };

before(async () => {
  assert.ok(existsSync(join(ROOT, 'magnitude.html')), 'lancez d’abord node scripts/build-artifact.mjs');
  const page = readFileSync(join(ROOT, 'magnitude.html'), 'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${page}</body></html>`;
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (path === '/' || path === '/index.html') return void res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT) || !existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  BASE = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function context(withRoom: boolean): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 860 } });
  if (withRoom) await ctx.addInitScript(MOCK_ROOM);
  return ctx;
}

async function open(ctx: BrowserContext): Promise<{ page: Page; errors: string[] }> {
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebGL|GPU|swiftshader/i.test(m.text())) errors.push(m.text());
  });
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: 'Entrer sur le plateau' }).click();
  return { page, errors };
}

test('sans canal temps réel : le jeu en ligne explique pourquoi et désactive la création', async () => {
  const ctx = await context(false);
  const { page } = await open(ctx);
  await page.getByRole('button', { name: /Créer une partie en ligne/ }).click();
  await page.getByText('Le jeu en ligne n’est pas disponible dans cette fenêtre').waitFor({ timeout: 12000 });
  assert.equal(await page.getByRole('button', { name: 'Créer le salon' }).isDisabled(), true);
  await ctx.close();
});

test('page partagée : création, code, partie synchronisée, rechargements de l’invité et de l’hôte', async () => {
  const ctx = await context(true);
  const host = await open(ctx);
  const guest = await open(ctx);
  await guest.page.setViewportSize({ width: 390, height: 844 });

  await host.page.getByRole('button', { name: /Créer une partie en ligne/ }).click();
  await host.page.getByRole('button', { name: 'Créer le salon' }).click();
  const codeEl = host.page.locator('.code-display');
  await codeEl.waitFor();
  const code = (await codeEl.textContent())!.replace(/\s/g, '');
  assert.match(code, /^[A-Z2-9]{5}$/);

  // Un code inconnu est refusé clairement.
  await guest.page.getByRole('button', { name: /Rejoindre avec un code/ }).click();
  await guest.page.locator('.code-input').fill(code === 'ZZZZZ' ? 'YYYYY' : 'ZZZZZ');
  await guest.page.getByRole('button', { name: 'Rejoindre' }).click();
  await guest.page.getByRole('alert').filter({ hasText: 'Aucun salon' }).waitFor({ timeout: 15000 });

  await guest.page.locator('.code-input').fill(code);
  await guest.page.getByRole('button', { name: 'Rejoindre' }).click();
  await guest.page.locator('.code-display').waitFor({ timeout: 10000 });
  await host.page.locator('.lobby__team .player').nth(1).waitFor({ timeout: 10000 });

  // L'invité change d'équipe si besoin pour qu'il y ait un joueur de chaque côté.
  const teamsOk = async () => (await host.page.getByRole('button', { name: 'Lancer la partie' }).isEnabled());
  if (!(await teamsOk())) {
    await guest.page.locator('.lobby__team.team-b').getByRole('button').first().click();
    await host.page.waitForTimeout(800);
  }
  await host.page.getByRole('button', { name: 'Lancer la partie' }).click();
  await host.page.locator('.intro').waitFor();
  await guest.page.locator('.intro').waitFor({ timeout: 8000 });
  assert.equal(await host.page.locator('.intro__round').textContent(), await guest.page.locator('.intro__round').textContent());
  await host.page.getByRole('button', { name: 'Passer l’introduction' }).click();

  await host.page.locator('.qcard__text').waitFor();
  await guest.page.locator('.qcard__text').waitFor({ timeout: 8000 });
  assert.equal(await host.page.locator('.qcard__text').textContent(), await guest.page.locator('.qcard__text').textContent());

  const estimator = (await host.page.locator('.estimate__input').count()) > 0 ? host : guest;
  const contester = estimator === host ? guest : host;
  const input = estimator.page.locator('.estimate__input');
  const placeholder = await input.getAttribute('placeholder');
  await input.fill(placeholder === 'Année' ? '1800' : '250');
  await estimator.page.keyboard.press('Enter');
  await contester.page.locator('.call--moins').click({ timeout: 10000 });

  await host.page.locator('.verdict').waitFor({ timeout: 10000 });
  await guest.page.locator('.verdict').waitFor({ timeout: 10000 });
  await host.page.waitForTimeout(1500);
  const sHost = await host.page.locator('.plate__score .num').allTextContents();
  assert.deepEqual(await guest.page.locator('.plate__score .num').allTextContents(), sHost, 'scores identiques');
  assert.equal(await host.page.locator('.verdict__title').textContent(), await guest.page.locator('.verdict__title').textContent());

  // L'invité recharge : il retrouve la partie.
  await guest.page.reload();
  await guest.page.locator('.scoreboard').waitFor({ timeout: 20000 });
  assert.deepEqual(await guest.page.locator('.plate__score .num').allTextContents(), sHost, 'état retrouvé (invité)');

  // L'hôte recharge : son appareil restaure le salon, l'invité se reconnecte.
  await host.page.reload();
  await host.page.locator('.scoreboard').waitFor({ timeout: 20000 });
  assert.deepEqual(await host.page.locator('.plate__score .num').allTextContents(), sHost, 'état restauré (hôte)');
  await host.page.getByRole('button', { name: 'Continuer' }).click({ timeout: 15000 });
  await guest.page.locator('.intro, .qcard__text').first().waitFor({ timeout: 25000 });

  const maxPresence = Math.max(await host.page.evaluate(() => (window as unknown as { __maxPresence?: number }).__maxPresence ?? 0));
  assert.ok(maxPresence > 0 && maxPresence <= 4096, `présence de l’hôte ≤ 4 Kio (${maxPresence})`);
  assert.deepEqual(host.errors, []);
  assert.deepEqual(guest.errors, []);
  await ctx.close();
});
