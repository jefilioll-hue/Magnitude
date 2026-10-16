/**
 * Tests d'intégration du multijoueur : le VRAI serveur est lancé dans un processus
 * séparé et plusieurs VRAIS clients WebSocket s'y connectent, comme des navigateurs.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import type { RoomView, ServerMessage, Session } from '../src/shared/protocol.ts';
import { PROTOCOL_VERSION, isValidCode } from '../src/shared/protocol.ts';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const URL = `ws://127.0.0.1:${PORT}/ws`;
let server: ChildProcess;

before(async () => {
  server = spawn(process.execPath, ['src/server/index.ts'], {
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: '', STATIC_DIR: 'tests', HOST_GRACE_MS: '600', JOIN_RATE_PER_MIN: '1000', FORFEIT_GRACE_MS: '500', LOBBY_DROP_MS: '60000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  server.stdout?.on('data', (d) => (out += d));
  server.stderr?.on('data', (d) => (out += d));
  const start = Date.now();
  while (!out.includes('Magnitude prêt')) {
    if (Date.now() - start > 15000) throw new Error(`Le serveur ne démarre pas :\n${out}`);
    await new Promise((r) => setTimeout(r, 50));
  }
});

after(() => {
  server.kill('SIGTERM');
});

/** Client de test : garde le dernier état reçu et permet d'attendre un message. */
class Client {
  ws!: WebSocket;
  messages: ServerMessage[] = [];
  room: RoomView | null = null;
  session: Session | null = null;
  private waiters: { pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];

  async connect(session?: Session): Promise<this> {
    this.ws = new WebSocket(URL);
    this.ws.on('message', (raw) => {
      const m = JSON.parse(String(raw)) as ServerMessage;
      this.messages.push(m);
      if (m.t === 'room') this.room = m.room;
      if (m.t === 'welcome') this.session = m.session;
      this.waiters = this.waiters.filter((w) => {
        if (w.pred(m)) {
          w.resolve(m);
          return false;
        }
        return true;
      });
    });
    await once(this.ws, 'open');
    this.send({ t: 'hello', v: PROTOCOL_VERSION, ...(session ? { session } : {}) });
    return this;
  }
  send(m: unknown): void {
    this.ws.send(JSON.stringify(m));
  }
  wait<T extends ServerMessage['t']>(t: T, pred: (m: Extract<ServerMessage, { t: T }>) => boolean = () => true, ms = 4000): Promise<Extract<ServerMessage, { t: T }>> {
    // Déjà reçu ?
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Délai dépassé en attendant « ${t} »`)), ms);
      this.waiters.push({
        pred: (m) => m.t === t && pred(m as Extract<ServerMessage, { t: T }>),
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m as Extract<ServerMessage, { t: T }>);
        },
      });
    });
  }
  waitRoom(pred: (r: RoomView) => boolean, ms = 4000): Promise<RoomView> {
    if (this.room && pred(this.room)) return Promise.resolve(this.room);
    return this.wait('room', (m) => pred(m.room), ms).then((m) => m.room);
  }
  async close(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      await once(this.ws, 'close');
    }
  }
}

const quick = { preset: 'perso', difficulty: 'normal', targetScore: 50, maxRounds: 10, revealSeconds: 30, estimateSeconds: 60, contestSeconds: 60, primeEvery: 0 };

async function lobbyWith(n: number, settings: Record<string, unknown> = quick) {
  const host = await new Client().connect();
  host.send({ t: 'create', name: 'Hôte', avatar: 1, settings });
  const room = await host.waitRoom(() => true);
  const others: Client[] = [];
  for (let i = 0; i < n - 1; i++) {
    const c = await new Client().connect();
    c.send({ t: 'join', code: room.code, name: `Joueur ${i + 2}`, avatar: i + 2 });
    await c.waitRoom(() => true);
    others.push(c);
  }
  await host.waitRoom((r) => r.players.length === n);
  return { host, others, code: room.code };
}

test('création d’un salon : code valide, hôte dans l’équipe A', async () => {
  const c = await new Client().connect();
  c.send({ t: 'create', name: 'Alice', avatar: 3, settings: quick });
  const welcome = await c.wait('welcome');
  const room = await c.waitRoom(() => true);
  assert.ok(isValidCode(room.code), room.code);
  assert.equal(welcome.session.roomCode, room.code);
  assert.equal(room.hostId, room.you.id);
  assert.equal(room.players[0]?.team, 'A');
  assert.equal(room.status, 'lobby');
  await c.close();
});

test('rejoindre : code valide, équipes équilibrées, liste synchronisée', async () => {
  const { host, others, code } = await lobbyWith(3);
  const r = await host.waitRoom((x) => x.players.length === 3);
  assert.equal(r.code, code);
  assert.deepEqual(r.players.map((p) => p.team).sort(), ['A', 'A', 'B']);
  const seenByOther = await others[1]!.waitRoom((x) => x.players.length === 3);
  assert.deepEqual(seenByOther.players.map((p) => p.id), r.players.map((p) => p.id));
  await Promise.all([host.close(), ...others.map((o) => o.close())]);
});

test('refus d’un code invalide ou inexistant, message explicite', async () => {
  const c = await new Client().connect();
  c.send({ t: 'join', code: 'A1', name: 'X', avatar: 0 });
  const e1 = await c.wait('error');
  assert.equal(e1.code, 'room_not_found');
  assert.match(e1.message, /code/);
  c.send({ t: 'join', code: 'ZZZZZ', name: 'X', avatar: 0 });
  const e2 = await c.wait('error');
  assert.equal(e2.code, 'room_not_found');
  c.send({ t: 'nimporte' });
  assert.equal((await c.wait('error')).code, 'bad_message');
  await c.close();
});

test('salon verrouillé puis partie déjà commencée', async () => {
  const { host, others, code } = await lobbyWith(2);
  host.send({ t: 'lock', locked: true });
  await host.waitRoom((r) => r.locked);
  const late = await new Client().connect();
  late.send({ t: 'join', code, name: 'Retard', avatar: 0 });
  assert.equal((await late.wait('error')).code, 'room_locked');
  host.send({ t: 'lock', locked: false });
  await host.waitRoom((r) => !r.locked);
  others[0]!.send({ t: 'start' });
  assert.equal((await others[0]!.wait('error')).code, 'not_host', 'seul l’hôte lance');
  host.send({ t: 'start' });
  await host.waitRoom((r) => r.status === 'playing');
  late.send({ t: 'join', code, name: 'Retard', avatar: 0 });
  assert.equal((await late.wait('error')).code, 'room_started');
  await Promise.all([host.close(), late.close(), ...others.map((o) => o.close())]);
});

test('lancement refusé sans joueur dans chaque équipe', async () => {
  const c = await new Client().connect();
  c.send({ t: 'create', name: 'Solo', avatar: 0, settings: quick });
  await c.waitRoom(() => true);
  c.send({ t: 'start' });
  assert.equal((await c.wait('error')).code, 'not_enough_players');
  await c.close();
});

test('partie complète : synchronisation, autorisations, réponse cachée, scores identiques', async () => {
  const { host, others } = await lobbyWith(4, { ...quick, targetScore: 3, startingTeam: 'A' });
  const all = [host, ...others];
  host.send({ t: 'start' });
  const rooms = await Promise.all(all.map((c) => c.waitRoom((r) => r.status === 'playing' && r.game?.phase === 'intro')));
  assert.ok(rooms.every((r) => r.game?.step === rooms[0]!.game?.step), 'tous voient la même étape');
  assert.ok(rooms.every((r) => r.game?.question?.id === rooms[0]!.game?.question?.id), 'même question');
  const rawIntro = JSON.stringify(rooms[0]);
  assert.ok(!rawIntro.includes('"answer"') && !rawIntro.includes('"explain"'), 'aucune réponse avant la révélation');
  assert.ok(!rawIntro.includes('"deck"'), 'le paquet de questions n’est pas exposé');

  // Seul l'hôte peut passer l'introduction.
  const intro = rooms[0]!.game!;
  others[0]!.send({ t: 'act', id: 'adv-1', step: intro.step, action: { type: 'advance' } });
  const ackNo = await others[0]!.wait('ack', (m) => m.id === 'adv-1');
  assert.equal(ackNo.ok, false);
  host.send({ t: 'act', id: 'adv-2', step: intro.step, action: { type: 'advance' } });
  const est = await host.waitRoom((r) => r.game?.phase === 'estimate');
  const g = est.game!;
  const E = g.estimator;
  const spokesId = est.spokesperson[E];
  const spokes = all.find((c) => c.room?.you.id === spokesId)!;
  const teammate = all.find((c) => c.room?.you.team === E && c.room?.you.id !== spokesId)!;
  const opponent = all.find((c) => c.room?.you.team !== E)!;
  assert.ok(spokes && teammate && opponent);

  // Un coéquipier qui n'est pas porte-parole est refusé ; un adversaire aussi.
  teammate.send({ t: 'act', id: 'tm-1', step: g.step, action: { type: 'estimate', team: E, value: 10 } });
  assert.equal((await teammate.wait('ack', (m) => m.id === 'tm-1')).error, 'not_spokesperson');
  opponent.send({ t: 'act', id: 'op-1', step: g.step, action: { type: 'estimate', team: E, value: 10 } });
  assert.equal((await opponent.wait('ack', (m) => m.id === 'op-1')).ok, false);
  // Propositions d'équipe : visibles des coéquipiers uniquement.
  teammate.send({ t: 'draft', text: '4 200' });
  const d = await spokes.wait('drafts', (m) => m.drafts.length > 0);
  assert.equal(d.drafts[0]?.text, '4 200');

  // Valeur invalide refusée côté serveur.
  spokes.send({ t: 'act', id: 'bad-1', step: g.step, action: { type: 'estimate', team: E, value: -5 } });
  assert.equal((await spokes.wait('ack', (m) => m.id === 'bad-1')).ok, false);

  // Estimation valide, envoyée DEUX fois avec le même identifiant : appliquée une seule fois.
  const value = 1;
  spokes.send({ t: 'act', id: 'est-1', step: g.step, action: { type: 'estimate', team: E, value } });
  spokes.send({ t: 'act', id: 'est-1', step: g.step, action: { type: 'estimate', team: E, value } });
  const t0 = Date.now();
  while (spokes.messages.filter((m) => m.t === 'ack' && m.id === 'est-1').length < 2 && Date.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 20));
  const acks = spokes.messages.filter((m): m is Extract<ServerMessage, { t: 'ack' }> => m.t === 'ack' && m.id === 'est-1');
  assert.equal(acks.length, 2, 'un accusé par envoi');
  assert.ok(acks.every((a) => a.ok), 'même réponse pour le doublon');
  const contestRooms = await Promise.all(all.map((c) => c.waitRoom((r) => r.game?.phase === 'contest')));
  assert.ok(contestRooms.every((r) => r.game?.estimate === value), 'tous voient l’estimation verrouillée');

  // Action périmée (ancienne étape) refusée.
  spokes.send({ t: 'act', id: 'old-1', step: g.step, action: { type: 'estimate', team: E, value: 7 } });
  assert.equal((await spokes.wait('ack', (m) => m.id === 'old-1')).error, 'stale');

  // Contestation par le porte-parole adverse.
  const C = E === 'A' ? 'B' : 'A';
  const cRoom = contestRooms[0]!;
  const cSpokes = all.find((c) => c.room?.you.id === cRoom.spokesperson[C])!;
  cSpokes.send({ t: 'act', id: 'ct-1', step: cRoom.game!.step, action: { type: 'contest', team: C, call: 'plus' } });
  const reveals = await Promise.all(all.map((c) => c.waitRoom((r) => r.game?.phase === 'reveal')));
  const scores = reveals.map((r) => `${r.game!.teams.A.score}-${r.game!.teams.B.score}`);
  assert.equal(new Set(scores).size, 1, `scores identiques partout : ${scores.join(', ')}`);
  assert.ok(reveals[0]!.game!.last?.question.answer !== undefined, 'la réponse est révélée à la révélation');
  const last = reveals[0]!.game!.last!;
  assert.equal(last.estimate, 1);
  assert.equal(last.call, 'plus');

  // Fin de partie : on joue jusqu'au score cible.
  let guard = 0;
  while (host.room?.status !== 'finished' && guard++ < 20) {
    const r = host.room!;
    const gg = r.game!;
    if (gg.phase === 'reveal' || gg.phase === 'intro' || gg.phase === 'tb_intro' || gg.phase === 'tb_reveal') {
      host.send({ t: 'act', id: `loop-adv-${guard}`, step: gg.step, action: { type: 'advance' } });
    } else if (gg.phase === 'estimate') {
      const sp = all.find((c) => c.room?.you.id === r.spokesperson[gg.estimator])!;
      sp.send({ t: 'act', id: `loop-est-${guard}`, step: gg.step, action: { type: 'estimate', team: gg.estimator, value: 1 } });
    } else if (gg.phase === 'contest') {
      const ct = gg.estimator === 'A' ? 'B' : 'A';
      const sp = all.find((c) => c.room?.you.id === r.spokesperson[ct])!;
      sp.send({ t: 'act', id: `loop-ct-${guard}`, step: gg.step, action: { type: 'contest', team: ct, call: 'plus' } });
    }
    await host.waitRoom((x) => x.game?.step !== gg.step || x.status === 'finished', 3000);
  }
  const finals = await Promise.all(all.map((c) => c.waitRoom((r) => r.status === 'finished')));
  assert.ok(finals.every((r) => r.game?.phase === 'over' && r.game.winner === finals[0]!.game!.winner), 'même vainqueur pour tous');
  // Revanche : retour au salon avec les mêmes joueurs.
  host.send({ t: 'rematch' });
  const back = await others[0]!.waitRoom((r) => r.status === 'lobby');
  assert.equal(back.players.length, 4);
  assert.equal(back.game, null);
  await Promise.all(all.map((c) => c.close()));
});

test('reconnexion : même joueur, même place, état autorisé retrouvé', async () => {
  const { host, others } = await lobbyWith(2);
  const guest = others[0]!;
  const session = guest.session!;
  const myId = guest.room!.you.id;
  host.send({ t: 'start' });
  await guest.waitRoom((r) => r.status === 'playing');
  await guest.close();
  const seen = await host.waitRoom((r) => r.players.some((p) => p.id === myId && !p.connected));
  assert.ok(seen);
  const again = await new Client().connect(session);
  const w = await again.wait('welcome');
  assert.equal(w.session.playerId, myId);
  const r = await again.waitRoom((x) => x.status === 'playing');
  assert.equal(r.you.id, myId);
  assert.equal(r.you.team, 'B');
  await host.waitRoom((x) => x.players.every((p) => p.connected));
  // Jeton falsifié refusé.
  const forged = await new Client().connect({ ...session, token: 'x'.repeat(session.token.length) });
  assert.equal((await forged.wait('error')).code, 'session_invalid');
  await Promise.all([host.close(), again.close(), forged.close()]);
});

test('déconnexion de l’hôte : un autre joueur reprend la main', async () => {
  const { host, others } = await lobbyWith(2);
  const guest = others[0]!;
  const guestId = guest.room!.you.id;
  await host.close();
  const r = await guest.waitRoom((x) => x.hostId === guestId, 4000);
  assert.equal(r.hostId, guestId);
  await guest.close();
});

test('départ d’un joueur et équipe vide pendant la partie : forfait, la partie ne bloque pas', async () => {
  const { host, others } = await lobbyWith(2);
  const guest = others[0]!;
  host.send({ t: 'start' });
  await guest.waitRoom((r) => r.status === 'playing');
  guest.send({ t: 'leave' });
  assert.equal((await guest.wait('closed')).reason, 'left');
  const r = await host.waitRoom((x) => x.status === 'finished', 5000);
  assert.equal(r.game?.endReason, 'forfeit');
  assert.equal(r.game?.winner, 'A');
  await Promise.all([host.close(), guest.close()]);
});

test('exclusion et fermeture du salon par l’hôte', async () => {
  const { host, others } = await lobbyWith(3);
  const [a, b] = others as [Client, Client];
  host.send({ t: 'kick', playerId: a.room!.you.id });
  assert.equal((await a.wait('closed')).reason, 'kicked');
  await host.waitRoom((r) => r.players.length === 2);
  host.send({ t: 'close' });
  assert.equal((await b.wait('closed')).reason, 'closed_by_host');
  await Promise.all([host.close(), a.close(), b.close()]);
});

test('paramètres modifiés par l’hôte uniquement, et toujours validés par le serveur', async () => {
  const { host, others } = await lobbyWith(2);
  others[0]!.send({ t: 'settings', settings: { targetScore: 3 } });
  assert.equal((await others[0]!.wait('error')).code, 'not_host');
  host.send({ t: 'settings', settings: { ...quick, targetScore: 9999, estimateSeconds: 0, name: '<b>Ma partie</b>' } });
  const r = await others[0]!.waitRoom((x) => x.settings.targetScore === 50);
  assert.equal(r.settings.estimateSeconds >= 10, true, 'pas de chrono illimité en ligne');
  await Promise.all([host.close(), others[0]!.close()]);
});

test('limitation de débit', async () => {
  const c = await new Client().connect();
  for (let i = 0; i < 80; i++) c.send({ t: 'ping', at: i });
  const e = await c.wait('error', (m) => m.code === 'rate_limited');
  assert.equal(e.code, 'rate_limited');
  await c.close();
});
