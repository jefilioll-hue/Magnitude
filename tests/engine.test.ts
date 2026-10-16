import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSIC_SCORING, presetSettings, sanitizeSettings } from '../src/shared/config.ts';
import { createVersus, reduce, scoreRound, summarize, versusView, computeHint } from '../src/shared/engine.ts';
import { must, newGame, openEstimate, playRound, settings, T0, testBank } from './helpers.ts';

const S = settings({ primeEvery: 0 });
const base = { estimator: 'A' as const, bet: false, doubled: false, prime: 1, answer: 100, tolerance: 10 };

test('barème : estimation exacte', () => {
  const r = scoreRound(S, { ...base, estimate: 100, call: 'plus' });
  assert.equal(r.outcome, 'pile');
  assert.equal(r.exact, true);
  assert.deepEqual(r.points, { A: CLASSIC_SCORING.pileEstimator + CLASSIC_SCORING.exactBonus, B: 0 });
});

test('barème : dans la tolérance (bornes incluses)', () => {
  for (const est of [90, 95, 110]) {
    const r = scoreRound(S, { ...base, estimate: est, call: 'moins' });
    assert.equal(r.outcome, 'pile', `estimation ${est}`);
    assert.deepEqual(r.points, { A: 3, B: 0 });
  }
});

test('barème : Tout Pile partagé', () => {
  const r = scoreRound(S, { ...base, estimate: 95, call: 'pile' });
  assert.equal(r.outcome, 'pile_shared');
  assert.deepEqual(r.points, { A: 2, B: 1 });
});

test('barème : estimation trop basse / trop haute et contestation', () => {
  // Estimation trop basse : la vraie valeur est « plus ».
  assert.deepEqual(scoreRound(S, { ...base, estimate: 50, call: 'plus' }).points, { A: 0, B: 1 });
  assert.equal(scoreRound(S, { ...base, estimate: 50, call: 'plus' }).outcome, 'contest_right');
  assert.deepEqual(scoreRound(S, { ...base, estimate: 50, call: 'moins' }).points, { A: 1, B: 0 });
  assert.equal(scoreRound(S, { ...base, estimate: 50, call: 'moins' }).outcome, 'contest_wrong');
  // Estimation trop haute : la vraie valeur est « moins ».
  assert.deepEqual(scoreRound(S, { ...base, estimate: 150, call: 'moins' }).points, { A: 0, B: 1 });
  assert.deepEqual(scoreRound(S, { ...base, estimate: 150, call: 'plus' }).points, { A: 1, B: 0 });
  // Tout Pile annoncé à tort.
  const w = scoreRound(S, { ...base, estimate: 150, call: 'pile' });
  assert.equal(w.outcome, 'pile_call_wrong');
  assert.deepEqual(w.points, { A: 2, B: 0 });
});

test('barème : absence d’estimation ou de contestation', () => {
  const n = scoreRound(S, { ...base, estimate: null, call: null });
  assert.equal(n.outcome, 'no_estimate');
  assert.deepEqual(n.points, { A: 0, B: 1 });
  const c = scoreRound(S, { ...base, estimate: 150, call: null });
  assert.equal(c.outcome, 'no_contest');
  assert.deepEqual(c.points, { A: 1, B: 0 });
  // Sans contestation mais dans la zone : la précision paie quand même.
  assert.equal(scoreRound(S, { ...base, estimate: 100, call: null }).outcome, 'pile');
});

test('barème : pari, quitte ou double et manche prime', () => {
  assert.deepEqual(scoreRound(S, { ...base, estimate: 100, call: 'plus', bet: true }).points, { A: 8, B: 0 }); // (3+1)×2
  assert.deepEqual(scoreRound(S, { ...base, estimate: 50, call: 'plus', bet: true }).points, { A: 0, B: 2 }); // 1 + pénalité
  assert.deepEqual(scoreRound(S, { ...base, estimate: 50, call: 'plus', doubled: true }).points, { A: 0, B: 2 });
  assert.deepEqual(scoreRound(S, { ...base, estimate: 50, call: 'moins', doubled: true }).points, { A: 2, B: 0 });
  const p = scoreRound(S, { ...base, estimate: 95, call: 'pile', prime: 2, doubled: true });
  assert.equal(p.multiplier, 4);
  assert.deepEqual(p.points, { A: 8, B: 4 });
});

test('barème : valeurs négatives et décimales', () => {
  const t = { ...base, answer: -89.2, tolerance: 2 };
  assert.equal(scoreRound(S, { ...t, estimate: -88, call: 'plus' }).outcome, 'pile');
  assert.equal(scoreRound(S, { ...t, estimate: -95, call: 'plus' }).outcome, 'contest_right');
  assert.equal(scoreRound(S, { ...t, estimate: -80, call: 'plus' }).outcome, 'contest_wrong');
});

test('déroulement : intro → estimation → contestation → révélation → manche suivante', () => {
  const bank = testBank();
  let s = newGame(bank, { primeEvery: 0 });
  assert.equal(s.phase, 'intro');
  assert.equal(s.round, 1);
  assert.equal(s.estimator, 'A');
  s = openEstimate(s, bank);
  assert.equal(s.phase, 'estimate');
  s = must(s, { type: 'estimate', team: 'A', value: 100, now: T0 + 5000 }, bank);
  assert.equal(s.phase, 'contest');
  s = must(s, { type: 'contest', team: 'B', call: 'plus', now: T0 + 8000 }, bank);
  assert.equal(s.phase, 'reveal');
  assert.equal(s.teams.A.score, 4);
  s = must(s, { type: 'advance', now: T0 + 9000 }, bank);
  assert.equal(s.round, 2);
  assert.equal(s.estimator, 'B', 'les équipes alternent');
  assert.equal(s.phase, 'intro');
});

test('intégrité : actions hors phase, hors tour, doublons et valeurs invalides refusées', () => {
  const bank = testBank();
  let s = newGame(bank);
  assert.equal(reduce(s, { type: 'estimate', team: 'A', value: 5, now: T0 }, bank).ok, false, 'pas d’estimation pendant l’intro');
  s = openEstimate(s, bank);
  const wrongTeam = reduce(s, { type: 'estimate', team: 'B', value: 5, now: T0 }, bank);
  assert.equal(wrongTeam.ok, false);
  assert.equal(!wrongTeam.ok && wrongTeam.error, 'not_your_turn');
  for (const v of [Number.NaN, -1, 1.5, Infinity]) {
    assert.equal(reduce(s, { type: 'estimate', team: 'A', value: v, now: T0 }, bank).ok, false, `valeur ${v}`);
  }
  s = must(s, { type: 'estimate', team: 'A', value: 80, now: T0 }, bank);
  const again = reduce(s, { type: 'estimate', team: 'A', value: 100, now: T0 }, bank);
  assert.equal(again.ok, false, 'pas de modification après verrouillage');
  assert.equal(s.estimate, 80);
  assert.equal(reduce(s, { type: 'contest', team: 'A', call: 'plus', now: T0 }, bank).ok, false, 'l’estimatrice ne conteste pas');
  s = must(s, { type: 'contest', team: 'B', call: 'plus', now: T0 }, bank);
  const scoreAfter = s.teams.B.score;
  assert.equal(reduce(s, { type: 'contest', team: 'B', call: 'plus', now: T0 }, bank).ok, false, 'pas de double contestation');
  assert.equal(s.teams.B.score, scoreAfter, 'pas de double attribution');
});

test('intégrité : l’état d’origine n’est jamais modifié', () => {
  const bank = testBank();
  const s = openEstimate(newGame(bank), bank);
  const snapshot = JSON.stringify(s);
  reduce(s, { type: 'estimate', team: 'A', value: 100, now: T0 }, bank);
  reduce(s, { type: 'estimate', team: 'B', value: 100, now: T0 }, bank);
  assert.equal(JSON.stringify(s), snapshot);
});

test('déterminisme : mêmes données et mêmes actions → même partie', () => {
  const bank = testBank();
  const run = () => {
    let s = createVersus(bank, settings({ startingTeam: 'random' }), 1234, T0);
    for (let i = 0; i < 6 && s.phase !== 'over'; i++) {
      s = playRound(s, bank, 90 + i * 5, i % 2 ? 'plus' : 'pile');
      s = must(s, { type: 'advance', now: s.phaseStartedAt + 1 }, bank);
    }
    return JSON.stringify(s);
  };
  assert.equal(run(), run());
  const other = createVersus(bank, settings({ startingTeam: 'random' }), 999, T0);
  assert.ok(other.deck.length > 0);
});

test('chronomètre : échéances et absence de réponse', () => {
  const bank = testBank();
  let s = newGame(bank, { estimateSeconds: 30, contestSeconds: 15, revealSeconds: 10 });
  assert.equal(reduce(s, { type: 'tick', now: T0 + 1 }, bank).ok, false, 'pas encore dû');
  s = must(s, { type: 'tick', now: s.deadline! }, bank);
  assert.equal(s.phase, 'estimate');
  assert.equal(s.deadline, s.phaseStartedAt + 30_000);
  s = must(s, { type: 'tick', now: s.deadline! + 50 }, bank);
  assert.equal(s.phase, 'reveal');
  assert.equal(s.history[0]?.outcome, 'no_estimate');
  assert.equal(s.teams.B.score, 1);
  // La révélation passe seule à la manche suivante : la partie ne se bloque jamais.
  s = must(s, { type: 'tick', now: s.deadline! }, bank);
  assert.equal(s.round, 2);
  // Contestation absente
  s = openEstimate(s, bank);
  s = must(s, { type: 'estimate', team: 'B', value: 40, now: s.phaseStartedAt + 1 }, bank);
  s = must(s, { type: 'tick', now: s.deadline! }, bank);
  assert.equal(s.history[1]?.outcome, 'no_contest');
});

test('jokers : indice, échange, pari et quitte ou double sont limités', () => {
  const bank = testBank();
  let s = openEstimate(newGame(bank, { targetScore: 0, jokers: { hint: 1, swap: 1, double: 1, bet: 1 } }), bank);
  const q1 = s.questionId;
  s = must(s, { type: 'joker', team: 'A', joker: 'hint', now: T0 }, bank);
  assert.ok(s.hint && s.hint.lo <= 100 && s.hint.hi >= 100, 'l’indice contient la réponse');
  assert.equal(reduce(s, { type: 'joker', team: 'A', joker: 'hint', now: T0 }, bank).ok, false);
  assert.equal(reduce(s, { type: 'joker', team: 'B', joker: 'swap', now: T0 }, bank).ok, false, 'réservé à l’estimatrice');
  s = must(s, { type: 'joker', team: 'A', joker: 'swap', now: T0 + 1000 }, bank);
  assert.notEqual(s.questionId, q1);
  assert.equal(s.hint, null, 'l’indice portait sur l’ancienne question');
  assert.equal(s.deadline, T0 + 1000 + s.settings.estimateSeconds * 1000, 'le chrono repart');
  s = must(s, { type: 'estimate', team: 'A', value: 100, bet: true, now: T0 + 2000 }, bank);
  s = must(s, { type: 'contest', team: 'B', call: 'plus', double: true, now: T0 + 3000 }, bank);
  assert.equal(s.teams.A.score, 4 * 2 * 2, 'pari ×2 et quitte ou double ×2');
  assert.deepEqual(s.teams.A.jokers, { hint: 0, swap: 0, double: 1, bet: 0 });
  assert.equal(s.teams.B.jokers.double, 0);
  s = must(s, { type: 'advance', now: T0 + 4000 }, bank);
  s = openEstimate(s, bank);
  // B estime : A n'a plus de pari… mais B en a encore un.
  const noBet = reduce(s, { type: 'estimate', team: 'B', value: 100, bet: true, now: T0 }, bank);
  assert.equal(noBet.ok, true);
});

test('indice déterministe et toujours valide sur la vraie base', async () => {
  const { QUESTIONS } = await import('../src/shared/questions/index.ts');
  for (const q of QUESTIONS) {
    const h = computeHint({ seed: 7, round: 3, questionId: q.id }, q);
    assert.ok(h.lo <= q.answer && q.answer <= h.hi, `${q.id} : ${h.lo} ≤ ${q.answer} ≤ ${h.hi}`);
    assert.ok(h.lo < h.hi, `${q.id} fourchette non vide`);
    assert.deepEqual(h, computeHint({ seed: 7, round: 3, questionId: q.id }, q));
  }
});

test('Manche Prime : points multipliés une manche sur N', () => {
  const bank = testBank();
  let s = newGame(bank, { primeEvery: 2, primeMultiplier: 2, targetScore: 0, maxRounds: 10 });
  s = playRound(s, bank, 50, 'plus');
  assert.equal(s.history[0]?.multiplier, 1);
  s = must(s, { type: 'advance', now: T0 }, bank);
  assert.equal(s.multiplier, 2);
  s = playRound(s, bank, 50, 'plus');
  assert.deepEqual(s.history[1]?.points, { A: 2, B: 0 });
});

test('victoire au score cible et fin au nombre de manches', () => {
  const bank = testBank();
  let s = newGame(bank, { targetScore: 4, maxRounds: 20, primeEvery: 0, tiebreak: false });
  s = playRound(s, bank, 100, 'plus'); // A +4
  s = must(s, { type: 'advance', now: T0 }, bank);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 'A');
  assert.equal(s.endReason, 'target');
  assert.equal(reduce(s, { type: 'advance', now: T0 }, bank).ok, false, 'plus rien après la fin');

  let r = newGame(bank, { targetScore: 0, maxRounds: 2, primeEvery: 0, tiebreak: false });
  r = playRound(r, bank, 50, 'plus'); // B +1
  r = must(r, { type: 'advance', now: T0 }, bank);
  r = playRound(r, bank, 50, 'moins'); // B estime, A se trompe : B +1
  r = must(r, { type: 'advance', now: T0 }, bank);
  assert.equal(r.phase, 'over');
  assert.equal(r.winner, 'B');
  assert.equal(r.endReason, 'rounds');
});

test('égalité : départage par la précision, puis égalité parfaite', () => {
  const bank = testBank();
  let s = newGame(bank, { targetScore: 0, maxRounds: 2, primeEvery: 0, tiebreak: true });
  s = playRound(s, bank, 50, 'plus'); // B +1
  s = must(s, { type: 'advance', now: T0 }, bank);
  s = playRound(s, bank, 50, 'plus'); // B estime, A conteste juste : A +1
  s = must(s, { type: 'advance', now: T0 }, bank);
  assert.equal(s.phase, 'tb_intro');
  s = must(s, { type: 'advance', now: T0 }, bank);
  assert.equal(s.phase, 'tb_estimate');
  s = must(s, { type: 'tb_estimate', team: 'A', value: 97, now: T0 }, bank);
  assert.equal(reduce(s, { type: 'tb_estimate', team: 'A', value: 100, now: T0 }, bank).ok, false, 'une seule estimation');
  const viewB = versusView(s, bank, 'B');
  assert.equal(viewB.tb?.estimates.A, undefined, 'l’estimation adverse reste cachée');
  assert.equal(viewB.tb?.locked.A, true);
  s = must(s, { type: 'tb_estimate', team: 'B', value: 104, now: T0 }, bank);
  assert.equal(s.phase, 'tb_reveal');
  s = must(s, { type: 'advance', now: T0 }, bank);
  assert.equal(s.winner, 'A');
  assert.equal(s.endReason, 'tiebreak');

  // Égalité parfaite à chaque départage → match nul.
  let d = newGame(bank, { targetScore: 0, maxRounds: 2, primeEvery: 0, tiebreak: true });
  d = playRound(d, bank, 50, 'plus');
  d = must(d, { type: 'advance', now: T0 }, bank);
  d = playRound(d, bank, 50, 'plus');
  d = must(d, { type: 'advance', now: T0 }, bank);
  for (let i = 0; i < 3; i++) {
    d = must(d, { type: 'advance', now: T0 }, bank);
    d = must(d, { type: 'tb_estimate', team: 'A', value: 90, now: T0 }, bank);
    d = must(d, { type: 'tb_estimate', team: 'B', value: 110, now: T0 }, bank);
    d = must(d, { type: 'advance', now: T0 }, bank);
  }
  assert.equal(d.phase, 'over');
  assert.equal(d.winner, 'draw');
});

test('forfait', () => {
  const bank = testBank();
  const s = must(newGame(bank), { type: 'forfeit', team: 'A', now: T0 }, bank);
  assert.equal(s.winner, 'B');
  assert.equal(s.endReason, 'forfeit');
});

test('vue filtrée : jamais de réponse avant la révélation, indice réservé', () => {
  const bank = testBank();
  let s = openEstimate(newGame(bank), bank);
  s = must(s, { type: 'joker', team: 'A', joker: 'hint', now: T0 }, bank);
  const vB = versusView(s, bank, 'B');
  const vA = versusView(s, bank, 'A');
  const json = JSON.stringify(vB);
  assert.equal(vB.hint, null);
  assert.ok(vA.hint);
  assert.equal(vB.last, null);
  assert.ok(!json.includes('"answer"'), 'aucun champ answer dans la vue');
  assert.ok(!json.includes('Explication de test'), 'pas d’explication avant la révélation');
  assert.ok(!('deck' in vB), 'le paquet n’est pas exposé');
  s = must(s, { type: 'estimate', team: 'A', value: 100, now: T0 }, bank);
  s = must(s, { type: 'contest', team: 'B', call: 'moins', now: T0 }, bank);
  const after = versusView(s, bank, 'B');
  assert.equal(after.last?.question.answer, 100);
  assert.ok(after.last?.question.explain);
});

test('libellé de tolérance relatif : pas de fuite d’ordre de grandeur', async () => {
  const { QUESTIONS } = await import('../src/shared/questions/index.ts');
  const { createBank } = await import('../src/shared/deck.ts');
  const real = createBank(QUESTIONS);
  const s = createVersus(real, settings({ difficulty: 'normal' }), 3, T0);
  const v = versusView(s, real, 'B');
  const q = real.byId.get(s.questionId!)!;
  if ('rel' in q.tol) assert.match(v.toleranceLabel ?? '', /%|exacte/);
});

test('validation des paramètres hostiles', () => {
  const s = sanitizeSettings({
    targetScore: 1e9,
    maxRounds: -5,
    estimateSeconds: 0,
    scoring: { pileEstimator: 9999, contestRight: 'x' },
    jokers: { hint: 99 },
    categories: ['geo', 'pirate', 'geo'],
    name: '\u0000<script>' + 'x'.repeat(200),
    teamNames: { A: '   ', B: 'Les Bleus' },
  });
  assert.equal(s.targetScore, 50);
  assert.equal(s.maxRounds, 2);
  assert.equal(s.estimateSeconds, presetSettings('classique').estimateSeconds, 'illimité refusé en ligne');
  assert.equal(s.scoring.pileEstimator, 10);
  assert.equal(s.scoring.contestRight, CLASSIC_SCORING.contestRight);
  assert.equal(s.jokers.hint, 5);
  assert.deepEqual(s.categories, ['geo']);
  assert.ok(s.name.length <= 40 && !s.name.includes('\u0000'));
  assert.equal(s.teamNames.A, 'Solaire');
  assert.equal(s.teamNames.B, 'Les Bleus');
});

test('bilan de partie', () => {
  const bank = testBank();
  let s = newGame(bank, { primeEvery: 0 });
  s = playRound(s, bank, 100, 'plus');
  s = must(s, { type: 'advance', now: T0 }, bank);
  s = playRound(s, bank, 30, 'plus');
  const sum = summarize(s);
  assert.equal(sum.A.inZone, 1);
  assert.equal(sum.A.exact, 1);
  assert.equal(sum.A.contestsRight, 1);
  assert.equal(sum.A.points, s.teams.A.score);
  assert.equal(sum.B.points, s.teams.B.score);
});
