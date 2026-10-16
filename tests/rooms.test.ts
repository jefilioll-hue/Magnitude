/** Gestionnaire de salons sans réseau : persistance, porte-parole, expiration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../src/server/rooms.ts';
import { createBank } from '../src/shared/deck.ts';
import { QUESTIONS } from '../src/shared/questions/index.ts';
import type { RoomView, ServerMessage } from '../src/shared/protocol.ts';

const bank = createBank(QUESTIONS);

function setup() {
  let now = 1_700_000_000_000;
  const inbox = new Map<string, ServerMessage[]>();
  const mgr = new RoomManager({ bank, now: () => now, send: (c, m) => inbox.set(c, [...(inbox.get(c) ?? []), m]) });
  const lastRoom = (c: string): RoomView => {
    const r = [...(inbox.get(c) ?? [])].reverse().find((m) => m.t === 'room');
    if (!r || r.t !== 'room') throw new Error(`pas d'état pour ${c}`);
    return r.room;
  };
  return { mgr, inbox, lastRoom, advance: (ms: number) => (now += ms) };
}

test('porte-parole : rotation à chaque manche parmi les joueurs connectés', () => {
  const { mgr, lastRoom } = setup();
  for (const c of ['h', 'a', 'b', 'c']) mgr.connect(c);
  mgr.handle('h', { t: 'create', name: 'Hôte', avatar: 0, settings: { revealSeconds: 30 } });
  const code = lastRoom('h').code;
  for (const c of ['a', 'b', 'c']) mgr.handle(c, { t: 'join', code, name: c, avatar: 1 });
  mgr.handle('h', { t: 'start' });
  const r1 = lastRoom('h');
  const teamA = r1.players.filter((p) => p.team === 'A').map((p) => p.id);
  assert.equal(teamA.length, 2);
  assert.equal(r1.spokesperson.A, teamA[0]);
  // Manche suivante : on passe l'intro puis on résout la manche par expiration des délais.
  const room = mgr.debugRoom(code)!;
  room.game!.deadline = 0;
  mgr.tick(); // intro → estimation
  room.game!.deadline = 0;
  mgr.tick(); // estimation expirée → révélation
  room.game!.deadline = 0;
  mgr.tick(); // révélation → manche 2
  assert.equal(room.game!.round, 2);
  assert.equal(lastRoom('h').spokesperson.A, teamA[1], 'le second joueur de l’équipe prend la parole');
});

test('persistance : un redémarrage du serveur conserve les salons et les parties', () => {
  const a = setup();
  a.mgr.connect('h');
  a.mgr.connect('g');
  a.mgr.handle('h', { t: 'create', name: 'Hôte', avatar: 0, settings: {} });
  const code = a.lastRoom('h').code;
  a.mgr.handle('g', { t: 'join', code, name: 'Invité', avatar: 2 });
  a.mgr.handle('h', { t: 'start' });
  const session = [...(a.inbox.get('g') ?? [])].find((m) => m.t === 'welcome');
  assert.ok(session && session.t === 'welcome');
  const snap = a.mgr.snapshot();
  assert.ok(!snap.includes('"conn":"g"'), 'les connexions ne sont pas sauvegardées');

  const b = setup();
  assert.equal(b.mgr.restore(snap), 1);
  b.mgr.connect('g2');
  b.mgr.handle('g2', { t: 'hello', v: 1, session: session.session });
  const r = b.lastRoom('g2');
  assert.equal(r.code, code);
  assert.equal(r.status, 'playing');
  assert.equal(r.you.id, session.session.playerId);
  assert.ok(r.game?.question, 'la partie reprend avec sa question en cours');
});

test('expiration : un salon vide est supprimé après le délai', () => {
  const { mgr, lastRoom, advance } = setup();
  mgr.connect('h');
  mgr.handle('h', { t: 'create', name: 'Hôte', avatar: 0, settings: {} });
  const code = lastRoom('h').code;
  mgr.disconnect('h');
  mgr.tick();
  assert.ok(mgr.debugRoom(code), 'toujours là juste après la déconnexion');
  advance(11 * 60_000);
  mgr.tick();
  assert.equal(mgr.debugRoom(code), undefined);
});

test('codes de salon uniques et lisibles', () => {
  const { mgr, lastRoom } = setup();
  const codes = new Set<string>();
  for (let i = 0; i < 300; i++) {
    mgr.connect(`c${i}`);
    mgr.handle(`c${i}`, { t: 'create', name: 'X', avatar: 0, settings: {} });
    codes.add(lastRoom(`c${i}`).code);
  }
  assert.equal(codes.size, 300);
  for (const c of codes) assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{5}$/);
});
