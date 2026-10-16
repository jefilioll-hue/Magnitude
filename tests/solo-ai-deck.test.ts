import test from 'node:test';
import assert from 'node:assert/strict';
import { createBank, buildDeck } from '../src/shared/deck.ts';
import { QUESTIONS, auditQuestions, fingerprint } from '../src/shared/questions/index.ts';
import { createSolo, reduceSolo, gradeFor, soloStars, SOLO_MODES } from '../src/shared/solo.ts';
import { aiContest, aiEstimate, AI_PROFILES, type AiLevel } from '../src/shared/ai.ts';
import { mulberry32 } from '../src/shared/rng.ts';
import { DIFFICULTY_PROFILES } from '../src/shared/config.ts';
import { effectiveTolerance, evaluate } from '../src/shared/numbers.ts';
import { ALL_CATEGORY_IDS } from '../src/shared/categories.ts';
import { settings, T0 } from './helpers.ts';
import type { Question } from '../src/shared/types.ts';

const bank = createBank(QUESTIONS);

test('base de questions : au moins 300 questions intègres, toutes catégories couvertes', () => {
  assert.ok(QUESTIONS.length >= 300, `${QUESTIONS.length} questions`);
  assert.deepEqual(auditQuestions(QUESTIONS), []);
  for (const c of ALL_CATEGORY_IDS) {
    assert.ok(QUESTIONS.filter((q) => q.cat === c).length >= 15, `catégorie ${c}`);
  }
  for (const l of [1, 2, 3, 4]) assert.ok(QUESTIONS.some((q) => q.level === l), `niveau ${l}`);
});

test('base : la réponse exacte est toujours « Tout Pile » à toutes les difficultés', () => {
  for (const q of QUESTIONS) {
    for (const d of Object.values(DIFFICULTY_PROFILES)) {
      const t = effectiveTolerance(q, d.tolFactor);
      assert.ok(evaluate(q.answer, q.answer, t).exact, q.id);
      assert.ok(t >= 0);
    }
  }
});

test('audit : détecte doublons et formulations quasi identiques', () => {
  const q = QUESTIONS[0] as Question;
  const problems = auditQuestions([q, { ...q }, { ...q, id: 'autre', text: q.text.replace('?', ' ?') }]);
  assert.ok(problems.some((p) => p.includes('double')));
  assert.ok(problems.some((p) => p.includes('quasi identique')));
  assert.equal(fingerprint('Combien de cases ?'), fingerprint('combien   de CASES ?'));
});

test('paquet : sans doublon, sujets distincts, catégories respectées, déterministe', () => {
  const opts = { difficulty: 'normal' as const, categories: [], count: 24, seed: 5 };
  const d1 = buildDeck(bank, opts);
  assert.equal(d1.length, 24);
  assert.equal(new Set(d1).size, 24);
  assert.deepEqual(d1, buildDeck(bank, opts));
  const topics = d1.map((id) => bank.byId.get(id)!.tags?.[0]).filter(Boolean);
  assert.equal(new Set(topics).size, topics.length, 'pas deux questions du même sujet');
  const geo = buildDeck(bank, { ...opts, categories: ['geo', 'espace'] });
  assert.ok(geo.every((id) => ['geo', 'espace'].includes(bank.byId.get(id)!.cat)));
});

test('paquet : la difficulté change réellement les niveaux tirés', () => {
  const avgLevel = (difficulty: 'decouverte' | 'maitre') => {
    const d = buildDeck(bank, { difficulty, categories: [], count: 20, seed: 11 });
    return d.reduce((s, id) => s + bank.byId.get(id)!.level, 0) / d.length;
  };
  assert.ok(avgLevel('decouverte') < 1.6, `découverte ${avgLevel('decouverte')}`);
  assert.ok(avgLevel('maitre') > 3.2, `maître ${avgLevel('maitre')}`);
});

test('paquet : les questions vues récemment passent en dernier', () => {
  const first = buildDeck(bank, { difficulty: 'normal', categories: [], count: 15, seed: 1 });
  const second = buildDeck(bank, { difficulty: 'normal', categories: [], count: 15, seed: 1, avoid: first });
  const overlap = second.filter((id) => first.includes(id));
  assert.equal(overlap.length, 0, 'aucune question rejouée tant qu’il en reste de nouvelles');
});

test('paquet : sélection étroite de catégories ne bloque pas', () => {
  const d = buildDeck(bank, { difficulty: 'maitre', categories: ['culture'], count: 30, seed: 2 });
  assert.ok(d.length >= 15);
});

test('solo : notation de la précision', () => {
  assert.equal(gradeFor(true, 0.5), 'pile');
  assert.equal(gradeFor(false, 1.5), 'proche');
  assert.equal(gradeFor(false, 3), 'correct');
  assert.equal(gradeFor(false, 6), 'loin');
  assert.equal(gradeFor(false, 20), 'rate');
  assert.equal(gradeFor(false, null), 'temps');
});

test('solo Série : 10 questions, série et multiplicateur, fin propre', () => {
  let s = createSolo(bank, { mode: 'serie', difficulty: 'normal', categories: [], seed: 3 }, T0);
  assert.equal(s.deck.length, SOLO_MODES.serie.count);
  let t = T0;
  for (let i = 0; i < 10; i++) {
    const q = bank.byId.get(s.questionId)!;
    const r = reduceSolo(s, { type: 'answer', value: q.answer, now: (t += 4000) }, bank);
    assert.ok(r.ok);
    s = r.state;
    assert.equal(s.answers[i]?.grade, 'pile');
    assert.equal(reduceSolo(s, { type: 'answer', value: q.answer, now: t }, bank).ok, false, 'pas de double réponse');
    s = (reduceSolo(s, { type: 'next', now: (t += 100) }, bank) as { state: typeof s }).state;
  }
  assert.equal(s.phase, 'over');
  assert.equal(s.bestStreak, 10);
  assert.ok(s.answers[9]!.points > s.answers[0]!.points, 'le multiplicateur de série augmente les points');
  assert.equal(soloStars(s), 3);
});

test('solo Survie : vies perdues, regagnées, niveau croissant', () => {
  let s = createSolo(bank, { mode: 'survie', difficulty: 'normal', categories: [], seed: 8 }, T0);
  assert.equal(s.lives, 3);
  const levels: number[] = [];
  let t = T0;
  // 2 ratés, 1 Tout Pile (vie regagnée), puis ratés jusqu'à la fin.
  const plan = ['rate', 'rate', 'pile', 'rate', 'rate', 'rate'];
  for (const p of plan) {
    if (s.phase === 'over') break;
    const q = bank.byId.get(s.questionId)!;
    levels.push(q.level);
    const miss = q.kind === 'year' ? q.answer + 500 : Math.round((Math.abs(q.answer) + 1) * 1000);
    const value = p === 'pile' ? q.answer : miss;
    s = (reduceSolo(s, { type: 'answer', value, now: (t += 1000) }, bank) as { state: typeof s }).state;
    s = (reduceSolo(s, { type: 'next', now: (t += 10) }, bank) as { state: typeof s }).state;
  }
  assert.equal(s.phase, 'over');
  assert.ok(s.answers.length >= 4);
  assert.deepEqual(s.answers.map((a) => a.lives), [2, 1, 2, 1, 0]);
  assert.ok(levels.every((l) => l === 1), 'les premières questions de Survie sont de niveau 1');
});

test('solo : temps écoulé', () => {
  const s = createSolo(bank, { mode: 'rapide', difficulty: 'normal', categories: [], seed: 4 }, T0);
  assert.equal(s.deadline, T0 + 20_000);
  assert.equal(reduceSolo(s, { type: 'tick', now: T0 + 19_000 }, bank).ok, false);
  const r = reduceSolo(s, { type: 'tick', now: T0 + 20_000 }, bank);
  assert.ok(r.ok);
  assert.equal(r.state.answers[0]?.grade, 'temps');
});

test('IA : estimations plausibles, meilleures avec le niveau, jamais systématiquement exactes', () => {
  const sample = QUESTIONS.filter((q) => q.kind !== 'year' && 'rel' in q.tol).slice(0, 120);
  const meanLogErr = (level: AiLevel) => {
    const rng = mulberry32(99);
    let sum = 0;
    let exact = 0;
    for (const q of sample) {
      const d = aiEstimate(q, level, rng, { jokers: { hint: 0, bet: 0 } });
      assert.ok(Number.isFinite(d.value) && d.value >= 0, `${q.id} ${d.value}`);
      if (d.value === q.answer) exact++;
      sum += Math.abs(Math.log(Math.max(d.value, 1e-9) / q.answer));
    }
    return { err: sum / sample.length, exact };
  };
  const deb = meanLogErr('debutant');
  const inter = meanLogErr('intermediaire');
  const exp = meanLogErr('expert');
  assert.ok(deb.err > inter.err && inter.err > exp.err, `${deb.err} > ${inter.err} > ${exp.err}`);
  assert.ok(exp.exact < sample.length * 0.5, 'l’expert ne triche pas');
});

test('IA : contestation cohérente face à une estimation absurde', () => {
  const q = QUESTIONS.find((x) => x.id === 'esp-02')!; // Terre–Lune : 384 400 km
  const rng = mulberry32(1);
  let correct = 0;
  for (let i = 0; i < 50; i++) {
    const d = aiContest(q, 'expert', rng, {
      estimate: 1000,
      tolerance: 38440,
      settings: settings(),
      me: 'B',
      multiplier: 1,
      bet: false,
      jokers: { double: 1 },
    });
    if (d.call === 'plus') correct++;
  }
  assert.ok(correct >= 48, `${correct}/50`);
  assert.ok(Object.keys(AI_PROFILES).length === 3);
});
