/**
 * Tests de parcours dans de vrais navigateurs (Chromium via Playwright).
 * Le serveur de production (dist/server.js) est lancé, deux contextes de
 * navigation indépendants jouent une partie en ligne par l'interface.
 *
 *   npm run test:e2e
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 19000 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
let server: ChildProcess;
let browser: Browser;

before(async () => {
  server = spawn(process.execPath, ['dist/server.js'], {
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: '', STATIC_DIR: 'dist/public', JOIN_RATE_PER_MIN: '1000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  server.stdout?.on('data', (d) => (out += d));
  server.stderr?.on('data', (d) => (out += d));
  const t0 = Date.now();
  while (!out.includes('Magnitude prêt')) {
    if (Date.now() - t0 > 15000) throw new Error(out);
    await new Promise((r) => setTimeout(r, 50));
  }
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
});

after(async () => {
  await browser?.close();
  server?.kill('SIGTERM');
});

async function newPage(width = 1280, height = 860, mobile = false): Promise<{ page: Page; errors: string[] }> {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebGL|GPU|swiftshader/i.test(m.text())) errors.push(m.text());
  });
  return { page, errors };
}

async function enter(page: Page, path = '/') {
  await page.goto(BASE + path);
  await page.getByRole('button', { name: 'Entrer sur le plateau' }).click();
}

test('l’application se charge : titre, manifeste, service worker, aucune erreur', async () => {
  const { page, errors } = await newPage();
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'Magnitude' }).waitFor();
  const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
  assert.equal(manifest.short_name, 'Magnitude');
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(reg) || (await navigator.serviceWorker.ready.then(() => true));
  });
  assert.ok(sw, 'service worker enregistré');
  const audio = await (await fetch(`${BASE}/audio/manifest.json`)).json();
  assert.ok(Object.keys(audio.sounds).length >= 30, 'bande-son présente');
  assert.deepEqual(errors, []);
  await page.context().close();
});

test('navigation : chaque entrée du menu mène à un écran fonctionnel, le retour fonctionne', async () => {
  const { page, errors } = await newPage(390, 844, true);
  await enter(page);
  const entries: [RegExp, string][] = [
    [/Jouer en solo/, 'Jouer en solo'],
    [/Défi contre l’ordinateur/, 'Défi contre l’ordinateur'],
    [/Duel sur un écran/, 'Duel sur un écran'],
    [/Créer une partie en ligne/, 'Jouer en ligne'],
    [/Rejoindre avec un code/, 'Jouer en ligne'],
    [/Catégories/, 'Catégories'],
    [/Statistiques/, 'Statistiques'],
    [/Règles du jeu/, 'Règles du jeu'],
    [/Paramètres/, 'Paramètres'],
  ];
  for (const [button, heading] of entries) {
    await page.getByRole('button', { name: button }).first().click();
    await page.getByRole('heading', { level: 1, name: heading }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `pas de défilement horizontal sur « ${heading} » (${overflow}px)`);
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.getByRole('button', { name: /Jouer en solo/ }).waitFor();
  }
  assert.deepEqual(errors, []);
  await page.context().close();
});

test('solo : une série complète de 10 questions jusqu’au bilan, statistiques enregistrées', async () => {
  const { page, errors } = await newPage(1280, 860);
  await enter(page);
  await page.getByRole('button', { name: /Jouer en solo/ }).click();
  await page.getByRole('button', { name: 'Commencer' }).click();
  for (let i = 0; i < 10; i++) {
    const input = page.locator('.estimate__input');
    await input.waitFor();
    // Une année plausible ou un nombre selon la question.
    const placeholder = await input.getAttribute('placeholder');
    await input.fill(placeholder === 'Année' ? '1900' : '100');
    await page.keyboard.press('Enter');
    await page.locator('.verdict').waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: /Question suivante|Voir le bilan/ }).click();
  }
  await page.getByRole('heading', { name: 'Bilan de la session' }).waitFor();
  const rows = await page.locator('.recap tbody tr').count();
  assert.equal(rows, 10);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('magnitude:v1') ?? '{}'));
  assert.equal(stored.stats.solo.sessions, 1);
  assert.equal(stored.stats.solo.questions, 10);
  assert.equal(stored.history.length, 1);
  assert.deepEqual(errors, []);
  await page.context().close();
});

test('défi contre l’ordinateur : l’IA estime et conteste seule', async () => {
  const { page, errors } = await newPage(1280, 860);
  await enter(page);
  await page.getByRole('button', { name: /Défi contre l’ordinateur/ }).click();
  await page.getByRole('radio', { name: /Expert/ }).first().click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await page.getByRole('button', { name: 'Passer l’introduction' }).click();
  // Selon le tirage, l'humain estime ou conteste ; on joue deux manches.
  for (let round = 0; round < 2; round++) {
    const input = page.locator('.estimate__input');
    const plus = page.locator('.call--plus');
    await Promise.race([input.waitFor({ timeout: 15000 }), plus.waitFor({ timeout: 15000 })]);
    if (await input.isVisible()) {
      const placeholder = await input.getAttribute('placeholder');
      await input.fill(placeholder === 'Année' ? '1950' : '500');
      await page.keyboard.press('Enter');
    } else {
      await plus.click();
    }
    await page.locator('.verdict').waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: 'Continuer' }).click();
    const skip = page.getByRole('button', { name: 'Passer l’introduction' });
    if (round === 0) await skip.click({ timeout: 5000 });
  }
  const scores = await page.locator('.plate__score .num').allTextContents();
  assert.equal(scores.length, 2);
  assert.deepEqual(errors, []);
  await page.context().close();
});

test('en ligne : deux navigateurs, création, lien d’invitation, partie synchronisée, reconnexion', async () => {
  const host = await newPage(1280, 860);
  const guest = await newPage(390, 844, true);
  // L'hôte crée un salon.
  await enter(host.page);
  await host.page.getByRole('button', { name: /Créer une partie en ligne/ }).click();
  await host.page.getByRole('button', { name: 'Créer le salon' }).click();
  const codeEl = host.page.locator('.code-display');
  await codeEl.waitFor();
  const code = (await codeEl.textContent())!.replace(/\s/g, '');
  assert.match(code, /^[A-Z2-9]{5}$/);

  // L'invité ouvre le lien d'invitation : le code est prérempli.
  // Le lien d'invitation ouvre directement l'écran « Rejoindre », code prérempli.
  await guest.page.goto(`${BASE}/?code=${code}`);
  const codeInput = guest.page.locator('.code-input');
  await codeInput.waitFor();
  assert.equal(await codeInput.inputValue(), code);
  await guest.page.getByRole('button', { name: 'Rejoindre' }).click();
  await guest.page.locator('.code-display').waitFor();
  await host.page.locator('.player', { hasText: 'Joueur' }).nth(1).waitFor();

  // Lancement par l'hôte.
  await host.page.getByRole('button', { name: 'Lancer la partie' }).click();
  await host.page.locator('.intro').waitFor();
  await guest.page.locator('.intro').waitFor();
  const roundHost = await host.page.locator('.intro__round').textContent();
  const roundGuest = await guest.page.locator('.intro__round').textContent();
  assert.equal(roundHost, roundGuest);
  await host.page.getByRole('button', { name: 'Passer l’introduction' }).click();

  // Les deux voient la même question.
  await host.page.locator('.qcard__text').waitFor();
  await guest.page.locator('.qcard__text').waitFor();
  assert.equal(await host.page.locator('.qcard__text').textContent(), await guest.page.locator('.qcard__text').textContent());

  // Celui qui estime saisit, l'autre conteste.
  const estimator = (await host.page.locator('.estimate__input').count()) > 0 ? host : guest;
  const contester = estimator === host ? guest : host;
  const input = estimator.page.locator('.estimate__input');
  const placeholder = await input.getAttribute('placeholder');
  await input.fill(placeholder === 'Année' ? '1800' : '250');
  await estimator.page.keyboard.press('Enter');
  await contester.page.locator('.call--moins').click();

  // Révélation identique des deux côtés.
  await host.page.locator('.verdict').waitFor({ timeout: 8000 });
  await guest.page.locator('.verdict').waitFor({ timeout: 8000 });
  await host.page.waitForTimeout(1500);
  const sHost = await host.page.locator('.plate__score .num').allTextContents();
  const sGuest = await guest.page.locator('.plate__score .num').allTextContents();
  assert.deepEqual(sHost, sGuest, 'scores identiques');
  assert.equal(await host.page.locator('.verdict__title').textContent(), await guest.page.locator('.verdict__title').textContent());

  // L'invité recharge sa page en pleine partie : il retrouve la partie.
  await guest.page.reload();
  await guest.page.locator('.scoreboard').waitFor({ timeout: 8000 });
  const after = await guest.page.locator('.plate__score .num').allTextContents();
  assert.deepEqual(after, sHost, 'état retrouvé après rechargement');

  assert.deepEqual(host.errors, []);
  assert.deepEqual(guest.errors, []);
  await host.page.context().close();
  await guest.page.context().close();
});

test('en ligne : code inconnu, message explicite', async () => {
  const { page } = await newPage(390, 844, true);
  await enter(page);
  await page.getByRole('button', { name: /Rejoindre avec un code/ }).click();
  await page.locator('.code-input').fill('ZZZZZ');
  await page.getByRole('button', { name: 'Rejoindre' }).click();
  await page.getByRole('alert').filter({ hasText: 'Aucun salon' }).waitFor();
  await page.context().close();
});
