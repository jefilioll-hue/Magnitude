import { presetSettings, sanitizeSettings, type GameSettings } from '../src/shared/config.ts';
import { createBank, type QuestionBank } from '../src/shared/deck.ts';
import { createVersus, reduce, type VersusAction, type VersusState } from '../src/shared/engine.ts';
import type { Question } from '../src/shared/types.ts';

/** Banque de test : toutes les réponses valent 100 (tolérance ±10 en Normal) sauf mention contraire. */
export function testBank(n = 40, over: Partial<Question> = {}): QuestionBank {
  const qs: Question[] = [];
  for (let i = 0; i < n; i++) {
    qs.push({
      id: `t${i}`,
      text: `Question de test numéro ${i} ?`,
      cat: i % 2 === 0 ? 'sciences' : 'histoire',
      level: (1 + (i % 3)) as 1 | 2 | 3,
      answer: 100,
      unit: '',
      kind: 'count',
      tol: { abs: 10 },
      explain: 'Explication de test suffisamment longue.',
      source: 'Test',
      ...over,
    });
  }
  return createBank(qs);
}

export function settings(over: Partial<GameSettings> = {}): GameSettings {
  return sanitizeSettings({ ...presetSettings('classique'), startingTeam: 'A', ...over }, { allowUnlimited: true });
}

export const T0 = 1_700_000_000_000;

export function newGame(bank = testBank(), over: Partial<GameSettings> = {}, seed = 42): VersusState {
  return createVersus(bank, settings(over), seed, T0);
}

/** Applique une action et échoue bruyamment si elle est refusée. */
export function must(s: VersusState, a: VersusAction, bank: QuestionBank): VersusState {
  const r = reduce(s, a, bank);
  if (!r.ok) throw new Error(`Action refusée : ${a.type} → ${r.error} (phase ${s.phase})`);
  return r.state;
}

/** Passe l'introduction de la manche. */
export function openEstimate(s: VersusState, bank: QuestionBank): VersusState {
  return must(s, { type: 'advance', now: s.phaseStartedAt + 1 }, bank);
}

/** Joue une manche complète : estimation puis contestation. */
export function playRound(
  s: VersusState,
  bank: QuestionBank,
  estimate: number,
  call: 'plus' | 'moins' | 'pile',
  opts: { bet?: boolean; double?: boolean } = {},
): VersusState {
  let st = s.phase === 'intro' ? openEstimate(s, bank) : s;
  const E = st.estimator;
  const C = E === 'A' ? 'B' : 'A';
  st = must(st, { type: 'estimate', team: E, value: estimate, bet: opts.bet ?? false, now: st.phaseStartedAt + 10 }, bank);
  st = must(st, { type: 'contest', team: C, call, double: opts.double ?? false, now: st.phaseStartedAt + 10 }, bank);
  return st;
}
