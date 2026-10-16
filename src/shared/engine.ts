/**
 * Moteur de la partie à deux équipes (mode Classique, Rapide, Personnalisé,
 * Défi contre l'ordinateur et parties en ligne).
 *
 * C'est une machine à états PURE :
 *   reduce(état, action, banque) → { état, événements } ou { erreur }
 *
 *  - aucune lecture d'horloge (l'heure est fournie dans chaque action) ;
 *  - aucun hasard non maîtrisé (graine de partie + rng dérivé) ;
 *  - toute action invalide est refusée sans modifier l'état.
 *
 * Le serveur l'exécute pour les parties en ligne (il fait autorité) ;
 * le client l'exécute pour les parties locales.
 *
 * Déroulement d'une manche :
 *   intro → estimate → contest → reveal → (manche suivante | fin)
 * Départage en cas d'égalité finale :
 *   tb_intro → tb_estimate → tb_reveal → (fin | nouveau départage)
 */
import { introMs, MAX_TIEBREAKS, DIFFICULTY_PROFILES, type GameSettings } from './config.ts';
import { buildDeck, requireQuestion, type QuestionBank } from './deck.ts';
import { effectiveTolerance, evaluate, roundNice, toScaled, validateValue, type Direction } from './numbers.ts';
import { derive } from './rng.ts';
import {
  otherTeam,
  toPublicQuestion,
  type ContestCall,
  type JokerId,
  type PublicQuestion,
  type Question,
  type TeamId,
} from './types.ts';

/* ------------------------------------------------------------------ */
/* État                                                                */
/* ------------------------------------------------------------------ */

export type VersusPhase = 'intro' | 'estimate' | 'contest' | 'reveal' | 'tb_intro' | 'tb_estimate' | 'tb_reveal' | 'over';

export type Outcome =
  | 'pile' // estimation dans la zone, l'adversaire a annoncé Plus/Moins (ou rien)
  | 'pile_shared' // estimation dans la zone, l'adversaire a annoncé Tout Pile
  | 'contest_right' // Plus/Moins correct
  | 'contest_wrong' // Plus/Moins incorrect
  | 'pile_call_wrong' // Tout Pile annoncé à tort
  | 'no_estimate' // aucune estimation verrouillée à temps
  | 'no_contest'; // aucune annonce à temps (hors zone)

export interface TeamState {
  name: string;
  score: number;
  jokers: Record<JokerId, number>;
}

export interface RoundResult {
  round: number;
  questionId: string;
  estimator: TeamId;
  estimate: number | null;
  bet: boolean;
  call: ContestCall | null;
  doubled: boolean;
  /** Multiplicateur total appliqué (Manche Prime × Quitte ou double). */
  multiplier: number;
  answer: number;
  tolerance: number;
  inZone: boolean;
  exact: boolean;
  direction: Direction | null;
  outcome: Outcome;
  points: Record<TeamId, number>;
  hintUsed: boolean;
  swapped: boolean;
}

export interface TiebreakResult {
  index: number;
  questionId: string;
  answer: number;
  estimates: Record<TeamId, number | null>;
  /** null = égalité parfaite sur cette question. */
  winner: TeamId | null;
}

export interface VersusState {
  v: 1;
  seed: number;
  settings: GameSettings;
  teams: Record<TeamId, TeamState>;
  deck: string[];
  deckPos: number;
  phase: VersusPhase;
  /** Compteur de transitions : une action client référence l'étape qu'elle vise. */
  step: number;
  round: number;
  startTeam: TeamId;
  estimator: TeamId;
  questionId: string | null;
  /** Tolérance effective (écart absolu) de la question en cours. */
  tolerance: number;
  estimate: number | null;
  bet: boolean;
  hint: { lo: number; hi: number } | null;
  hintUsed: boolean;
  swapped: boolean;
  doubled: boolean;
  call: ContestCall | null;
  multiplier: number;
  /** Échéance de la phase courante (ms epoch), null = pas de limite. */
  deadline: number | null;
  phaseStartedAt: number;
  history: RoundResult[];
  tb: {
    index: number;
    questionId: string;
    estimates: Partial<Record<TeamId, number>>;
    results: TiebreakResult[];
  } | null;
  winner: TeamId | 'draw' | null;
  endReason: 'target' | 'rounds' | 'tiebreak' | 'forfeit' | 'draw' | 'exhausted' | null;
}

/* ------------------------------------------------------------------ */
/* Actions & événements                                                 */
/* ------------------------------------------------------------------ */

export type VersusAction =
  | { type: 'estimate'; team: TeamId; value: number; bet?: boolean; now: number }
  | { type: 'joker'; team: TeamId; joker: 'hint' | 'swap'; now: number }
  | { type: 'contest'; team: TeamId; call: ContestCall; double?: boolean; now: number }
  | { type: 'tb_estimate'; team: TeamId; value: number; now: number }
  /** Fait avancer le temps : applique l'échéance de la phase si elle est dépassée. */
  | { type: 'tick'; now: number }
  /** Passe l'introduction ou la révélation sans attendre la fin du délai. */
  | { type: 'advance'; now: number }
  | { type: 'forfeit'; team: TeamId; now: number };

export type VersusEvent =
  | { type: 'round_intro'; round: number; estimator: TeamId; multiplier: number }
  | { type: 'estimate_open'; round: number }
  | { type: 'hint'; team: TeamId; lo: number; hi: number }
  | { type: 'swap'; team: TeamId }
  | { type: 'locked'; team: TeamId; value: number; bet: boolean }
  | { type: 'contested'; team: TeamId; call: ContestCall; doubled: boolean }
  | { type: 'timeout'; phase: VersusPhase }
  | { type: 'reveal'; result: RoundResult }
  | { type: 'tb_intro'; index: number }
  | { type: 'tb_locked'; team: TeamId }
  | { type: 'tb_reveal'; result: TiebreakResult }
  | { type: 'game_over'; winner: TeamId | 'draw'; reason: NonNullable<VersusState['endReason']> };

export type ReduceError =
  | 'wrong_phase'
  | 'not_your_turn'
  | 'invalid_value'
  | 'no_joker'
  | 'already_used'
  | 'pile_disabled'
  | 'already_locked'
  | 'no_question'
  | 'not_due';

export type ReduceResult =
  | { ok: true; state: VersusState; events: VersusEvent[] }
  | { ok: false; error: ReduceError; state: VersusState };

/* ------------------------------------------------------------------ */
/* Création                                                            */
/* ------------------------------------------------------------------ */

export function deckSizeFor(s: GameSettings): number {
  return s.maxRounds + s.jokers.swap * 2 + MAX_TIEBREAKS + 2;
}

export function createVersus(
  bank: QuestionBank,
  settings: GameSettings,
  seed: number,
  now: number,
  avoid: readonly string[] = [],
): VersusState {
  const deck = buildDeck(bank, {
    difficulty: settings.difficulty,
    categories: settings.categories,
    count: deckSizeFor(settings),
    seed,
    avoid,
  });
  if (deck.length === 0) throw new Error('Aucune question disponible pour ces catégories.');
  const startTeam: TeamId =
    settings.startingTeam === 'random' ? (derive(seed, 'start')() < 0.5 ? 'A' : 'B') : settings.startingTeam;
  const team = (t: TeamId): TeamState => ({ name: settings.teamNames[t], score: 0, jokers: { ...settings.jokers } });
  const s: VersusState = {
    v: 1,
    seed,
    settings,
    teams: { A: team('A'), B: team('B') },
    deck,
    deckPos: 0,
    phase: 'intro',
    step: 0,
    round: 0,
    startTeam,
    estimator: startTeam,
    questionId: null,
    tolerance: 0,
    estimate: null,
    bet: false,
    hint: null,
    hintUsed: false,
    swapped: false,
    doubled: false,
    call: null,
    multiplier: 1,
    deadline: null,
    phaseStartedAt: now,
    history: [],
    tb: null,
    winner: null,
    endReason: null,
  };
  const events: VersusEvent[] = [];
  startRound(s, bank, now, events);
  return s;
}

/* ------------------------------------------------------------------ */
/* Réducteur                                                           */
/* ------------------------------------------------------------------ */

export function reduce(state: VersusState, action: VersusAction, bank: QuestionBank): ReduceResult {
  const fail = (error: ReduceError): ReduceResult => ({ ok: false, error, state });
  if (state.phase === 'over') return fail('wrong_phase');

  const s: VersusState = structuredClone(state);
  const events: VersusEvent[] = [];
  const now = action.now;

  switch (action.type) {
    case 'estimate': {
      if (s.phase !== 'estimate') return fail('wrong_phase');
      if (action.team !== s.estimator) return fail('not_your_turn');
      const q = currentQuestion(s, bank);
      if (!validateValue(action.value, { decimals: q.decimals ?? 0, kind: q.kind, allowNegative: q.signed ?? false })) {
        return fail('invalid_value');
      }
      const team = s.teams[action.team];
      if (action.bet) {
        if (team.jokers.bet <= 0) return fail('no_joker');
        team.jokers.bet -= 1;
      }
      s.estimate = action.value;
      s.bet = Boolean(action.bet);
      events.push({ type: 'locked', team: action.team, value: action.value, bet: s.bet });
      setPhase(s, 'contest', now, s.settings.contestSeconds * 1000);
      break;
    }

    case 'joker': {
      if (s.phase !== 'estimate') return fail('wrong_phase');
      if (action.team !== s.estimator) return fail('not_your_turn');
      const team = s.teams[action.team];
      if (action.joker === 'hint') {
        if (s.hintUsed) return fail('already_used');
        if (team.jokers.hint <= 0) return fail('no_joker');
        team.jokers.hint -= 1;
        s.hint = computeHint(s, currentQuestion(s, bank));
        s.hintUsed = true;
        events.push({ type: 'hint', team: action.team, lo: s.hint.lo, hi: s.hint.hi });
      } else {
        if (s.swapped) return fail('already_used');
        if (team.jokers.swap <= 0) return fail('no_joker');
        const next = drawQuestion(s);
        if (!next) return fail('no_question');
        team.jokers.swap -= 1;
        s.questionId = next;
        s.tolerance = toleranceFor(s, requireQuestion(bank, next));
        s.swapped = true;
        s.hint = null; // l'indice portait sur l'ancienne question
        events.push({ type: 'swap', team: action.team });
        setPhase(s, 'estimate', now, s.settings.estimateSeconds * 1000);
      }
      break;
    }

    case 'contest': {
      if (s.phase !== 'contest') return fail('wrong_phase');
      if (action.team !== otherTeam(s.estimator)) return fail('not_your_turn');
      if (action.call !== 'plus' && action.call !== 'moins' && action.call !== 'pile') return fail('invalid_value');
      if (action.call === 'pile' && !s.settings.allowPileCall) return fail('pile_disabled');
      const team = s.teams[action.team];
      if (action.double) {
        if (team.jokers.double <= 0) return fail('no_joker');
        team.jokers.double -= 1;
        s.doubled = true;
      }
      s.call = action.call;
      events.push({ type: 'contested', team: action.team, call: action.call, doubled: s.doubled });
      resolveRound(s, bank, now, events);
      break;
    }

    case 'tb_estimate': {
      if (s.phase !== 'tb_estimate' || !s.tb) return fail('wrong_phase');
      if (action.team !== 'A' && action.team !== 'B') return fail('not_your_turn');
      if (s.tb.estimates[action.team] !== undefined) return fail('already_locked');
      const q = requireQuestion(bank, s.tb.questionId);
      if (!validateValue(action.value, { decimals: q.decimals ?? 0, kind: q.kind, allowNegative: q.signed ?? false })) {
        return fail('invalid_value');
      }
      s.tb.estimates[action.team] = action.value;
      events.push({ type: 'tb_locked', team: action.team });
      if (s.tb.estimates.A !== undefined && s.tb.estimates.B !== undefined) resolveTiebreak(s, bank, now, events);
      break;
    }

    case 'tick': {
      if (s.deadline === null || now < s.deadline) return fail('not_due');
      events.push({ type: 'timeout', phase: s.phase });
      onDeadline(s, bank, now, events);
      break;
    }

    case 'advance': {
      if (s.phase !== 'intro' && s.phase !== 'reveal' && s.phase !== 'tb_intro' && s.phase !== 'tb_reveal') {
        return fail('wrong_phase');
      }
      onDeadline(s, bank, now, events);
      break;
    }

    case 'forfeit': {
      if (action.team !== 'A' && action.team !== 'B') return fail('not_your_turn');
      endGame(s, otherTeam(action.team), 'forfeit', now, events);
      break;
    }

    default:
      return fail('wrong_phase');
  }

  s.step += 1;
  return { ok: true, state: s, events };
}

/* ------------------------------------------------------------------ */
/* Transitions internes                                                 */
/* ------------------------------------------------------------------ */

function setPhase(s: VersusState, phase: VersusPhase, now: number, durationMs: number | null): void {
  s.phase = phase;
  s.phaseStartedAt = now;
  s.deadline = durationMs && durationMs > 0 ? now + durationMs : null;
}

function currentQuestion(s: VersusState, bank: QuestionBank): Question {
  if (!s.questionId) throw new Error('Aucune question en cours');
  return requireQuestion(bank, s.questionId);
}

function drawQuestion(s: VersusState): string | null {
  const id = s.deck[s.deckPos];
  if (id === undefined) return null;
  s.deckPos += 1;
  return id;
}

export function toleranceFactor(settings: GameSettings): number {
  return DIFFICULTY_PROFILES[settings.difficulty].tolFactor * settings.tolFactor;
}

function toleranceFor(s: VersusState, q: Question): number {
  return effectiveTolerance(q, toleranceFactor(s.settings));
}

function startRound(s: VersusState, bank: QuestionBank, now: number, events: VersusEvent[]): void {
  const qid = drawQuestion(s);
  if (!qid) {
    finishByScore(s, 'exhausted', now, events);
    return;
  }
  s.round += 1;
  s.estimator = s.round === 1 ? s.startTeam : otherTeam(s.estimator);
  s.questionId = qid;
  s.tolerance = toleranceFor(s, requireQuestion(bank, qid));
  s.estimate = null;
  s.bet = false;
  s.hint = null;
  s.hintUsed = false;
  s.swapped = false;
  s.doubled = false;
  s.call = null;
  s.multiplier = s.settings.primeEvery > 0 && s.round % s.settings.primeEvery === 0 ? s.settings.primeMultiplier : 1;
  events.push({ type: 'round_intro', round: s.round, estimator: s.estimator, multiplier: s.multiplier });
  setPhase(s, 'intro', now, introMs(s.settings));
}

function onDeadline(s: VersusState, bank: QuestionBank, now: number, events: VersusEvent[]): void {
  switch (s.phase) {
    case 'intro':
      setPhase(s, 'estimate', now, s.settings.estimateSeconds * 1000);
      events.push({ type: 'estimate_open', round: s.round });
      return;
    case 'estimate':
      // Temps écoulé sans estimation verrouillée.
      resolveRound(s, bank, now, events);
      return;
    case 'contest':
      resolveRound(s, bank, now, events);
      return;
    case 'reveal':
      afterReveal(s, bank, now, events);
      return;
    case 'tb_intro':
      setPhase(s, 'tb_estimate', now, s.settings.estimateSeconds * 1000);
      return;
    case 'tb_estimate':
      resolveTiebreak(s, bank, now, events);
      return;
    case 'tb_reveal': {
      const last = s.tb?.results[s.tb.results.length - 1];
      if (last?.winner) endGame(s, last.winner, 'tiebreak', now, events);
      else if (s.tb && s.tb.index < MAX_TIEBREAKS) startTiebreak(s, bank, now, events);
      else endGame(s, 'draw', 'draw', now, events);
      return;
    }
    default:
      return;
  }
}

/** Calcule les points de la manche selon le barème. Fonction pure, exportée pour les tests. */
export function scoreRound(
  settings: GameSettings,
  input: {
    estimator: TeamId;
    estimate: number | null;
    call: ContestCall | null;
    bet: boolean;
    doubled: boolean;
    prime: number;
    answer: number;
    tolerance: number;
  },
): Pick<RoundResult, 'outcome' | 'points' | 'inZone' | 'exact' | 'direction' | 'multiplier'> {
  const r = settings.scoring;
  const E = input.estimator;
  const C = otherTeam(E);
  const pts: Record<TeamId, number> = { A: 0, B: 0 };
  let outcome: Outcome;
  let inZone = false;
  let exact = false;
  let direction: Direction | null = null;

  if (input.estimate === null) {
    outcome = 'no_estimate';
    pts[C] += r.noEstimate;
  } else {
    const ev = evaluate(input.estimate, input.answer, input.tolerance);
    inZone = ev.inZone;
    exact = ev.exact;
    direction = ev.direction;
    if (inZone) {
      if (input.call === 'pile') {
        outcome = 'pile_shared';
        pts[E] += r.pileSharedEstimator;
        pts[C] += r.pileSharedContester;
      } else {
        outcome = 'pile';
        pts[E] += r.pileEstimator;
      }
      if (exact) pts[E] += r.exactBonus;
      if (input.bet) pts[E] *= r.betMultiplier;
    } else {
      if (input.call === null) {
        outcome = 'no_contest';
        pts[E] += r.noContest;
      } else if (input.call === 'pile') {
        outcome = 'pile_call_wrong';
        pts[E] += r.pileCallWrong;
      } else if (input.call === direction) {
        outcome = 'contest_right';
        pts[C] += r.contestRight;
      } else {
        outcome = 'contest_wrong';
        pts[E] += r.contestWrong;
      }
      if (input.bet) pts[C] += r.betMissPenalty;
    }
  }
  const multiplier = input.prime * (input.doubled ? r.doubleMultiplier : 1);
  pts.A *= multiplier;
  pts.B *= multiplier;
  return { outcome, points: pts, inZone, exact, direction, multiplier };
}

function resolveRound(s: VersusState, bank: QuestionBank, now: number, events: VersusEvent[]): void {
  const q = currentQuestion(s, bank);
  const scored = scoreRound(s.settings, {
    estimator: s.estimator,
    estimate: s.estimate,
    call: s.estimate === null ? null : s.call,
    bet: s.bet,
    doubled: s.doubled,
    prime: s.multiplier,
    answer: q.answer,
    tolerance: s.tolerance,
  });
  const result: RoundResult = {
    round: s.round,
    questionId: q.id,
    estimator: s.estimator,
    estimate: s.estimate,
    bet: s.bet,
    call: s.call,
    doubled: s.doubled,
    answer: q.answer,
    tolerance: s.tolerance,
    hintUsed: s.hintUsed,
    swapped: s.swapped,
    ...scored,
  };
  s.teams.A.score += result.points.A;
  s.teams.B.score += result.points.B;
  s.history.push(result);
  events.push({ type: 'reveal', result });
  setPhase(s, 'reveal', now, s.settings.revealSeconds * 1000);
}

function afterReveal(s: VersusState, bank: QuestionBank, now: number, events: VersusEvent[]): void {
  const { A, B } = s.teams;
  const target = s.settings.targetScore;
  const reachedTarget = target > 0 && (A.score >= target || B.score >= target);
  const outOfRounds = s.round >= s.settings.maxRounds;
  if (reachedTarget || outOfRounds) {
    finishByScore(s, reachedTarget ? 'target' : 'rounds', now, events, bank);
    return;
  }
  startRound(s, bank, now, events);
}

function finishByScore(
  s: VersusState,
  reason: 'target' | 'rounds' | 'exhausted',
  now: number,
  events: VersusEvent[],
  bank?: QuestionBank,
): void {
  const { A, B } = s.teams;
  if (A.score !== B.score) {
    endGame(s, A.score > B.score ? 'A' : 'B', reason, now, events);
  } else if (s.settings.tiebreak && bank && s.deckPos < s.deck.length) {
    startTiebreak(s, bank, now, events);
  } else {
    endGame(s, 'draw', 'draw', now, events);
  }
}

function startTiebreak(s: VersusState, bank: QuestionBank, now: number, events: VersusEvent[]): void {
  const qid = drawQuestion(s);
  if (!qid) {
    endGame(s, 'draw', 'draw', now, events);
    return;
  }
  const index = (s.tb?.index ?? 0) + 1;
  s.tb = { index, questionId: qid, estimates: {}, results: s.tb?.results ?? [] };
  s.questionId = qid;
  s.tolerance = toleranceFor(s, requireQuestion(bank, qid));
  events.push({ type: 'tb_intro', index });
  setPhase(s, 'tb_intro', now, introMs(s.settings));
}

function resolveTiebreak(s: VersusState, bank: QuestionBank, now: number, events: VersusEvent[]): void {
  if (!s.tb) return;
  const q = requireQuestion(bank, s.tb.questionId);
  const a = s.tb.estimates.A ?? null;
  const b = s.tb.estimates.B ?? null;
  const dist = (x: number | null): bigint | null => {
    if (x === null) return null;
    const d = toScaled(q.answer) - toScaled(x);
    return d < 0n ? -d : d;
  };
  const da = dist(a);
  const db = dist(b);
  let winner: TeamId | null = null;
  if (da !== null && db !== null) winner = da < db ? 'A' : db < da ? 'B' : null;
  else if (da !== null) winner = 'A';
  else if (db !== null) winner = 'B';
  const result: TiebreakResult = { index: s.tb.index, questionId: q.id, answer: q.answer, estimates: { A: a, B: b }, winner };
  s.tb.results.push(result);
  events.push({ type: 'tb_reveal', result });
  setPhase(s, 'tb_reveal', now, s.settings.revealSeconds * 1000);
}

function endGame(
  s: VersusState,
  winner: TeamId | 'draw',
  reason: NonNullable<VersusState['endReason']>,
  now: number,
  events: VersusEvent[],
): void {
  s.winner = winner;
  s.endReason = reason;
  events.push({ type: 'game_over', winner, reason });
  setPhase(s, 'over', now, null);
}

/**
 * Indice : une fourchette « ronde » contenant la réponse, décentrée de façon
 * pseudo-aléatoire pour que le milieu de la fourchette ne soit pas la réponse.
 */
export function computeHint(s: Pick<VersusState, 'seed' | 'round' | 'questionId'>, q: Question): { lo: number; hi: number } {
  const rng = derive(s.seed, 'hint', s.round, q.id);
  const d = q.decimals ?? 0;
  const v = q.answer;
  let lo: number;
  let hi: number;
  if ('rel' in q.tol && v > 0) {
    const spread = 2.2 + rng() * 1.4; // largeur totale (rapport hi/lo) entre ×2,2 et ×3,6
    const split = 0.2 + rng() * 0.6; // position de la réponse dans la fourchette (log)
    lo = v / spread ** split;
    hi = v * spread ** (1 - split);
  } else {
    const base = 'abs' in q.tol ? q.tol.abs : Math.abs(v) * 0.1;
    const width = Math.max(base * 10, 10 ** -d * 10);
    const split = 0.2 + rng() * 0.6;
    lo = v - width * split;
    hi = v + width * (1 - split);
  }
  lo = roundNice(lo, 'down', d);
  hi = roundNice(hi, 'up', d);
  if (!q.signed) lo = Math.max(0, lo);
  if (q.kind === 'year') {
    lo = Math.floor(lo);
    hi = Math.ceil(hi);
  }
  // Garantie : la réponse est strictement dans la fourchette.
  if (lo > v) lo = v;
  if (hi < v) hi = v;
  return { lo, hi };
}

/* ------------------------------------------------------------------ */
/* Vue filtrée (ce qu'un joueur a le droit de voir)                      */
/* ------------------------------------------------------------------ */

export interface RevealedQuestion extends PublicQuestion {
  answer: number;
  explain: string;
  source: string;
}

export interface VersusView {
  phase: VersusPhase;
  step: number;
  round: number;
  settings: GameSettings;
  teams: Record<TeamId, TeamState>;
  estimator: TeamId;
  multiplier: number;
  deadline: number | null;
  phaseStartedAt: number;
  question: PublicQuestion | null;
  /** Description de la tolérance sans révéler d'ordre de grandeur (« ±10 % », « ±2 ans »). */
  toleranceLabel: string | null;
  estimate: number | null;
  bet: boolean;
  call: ContestCall | null;
  doubled: boolean;
  hint: { lo: number; hi: number } | null;
  hintUsed: boolean;
  swapped: boolean;
  /** Résultat de la dernière manche révélée, avec la question complète. */
  last: (RoundResult & { question: RevealedQuestion }) | null;
  history: RoundResult[];
  tb: {
    index: number;
    question: PublicQuestion;
    locked: Record<TeamId, boolean>;
    /** Estimation de l'équipe du joueur (ou des deux après la révélation). */
    estimates: Partial<Record<TeamId, number>>;
    results: (TiebreakResult & { question: RevealedQuestion })[];
  } | null;
  winner: TeamId | 'draw' | null;
  endReason: VersusState['endReason'];
}

export function revealQuestion(q: Question): RevealedQuestion {
  return { ...toPublicQuestion(q), answer: q.answer, explain: q.explain, source: q.source };
}

/** Libellé de tolérance qui ne trahit pas la réponse avant la révélation. */
export function toleranceLabel(q: Question, factor: number, tolerance: number): string {
  if (tolerance === 0) return 'Valeur exacte';
  if ('rel' in q.tol) {
    const pct = q.tol.rel * factor * 100;
    const shown = pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
    return `±${String(shown).replace('.', ',')} %`;
  }
  const unit = q.kind === 'year' ? (tolerance >= 2 ? ' ans' : ' an') : q.unit ? ` ${q.unit}` : '';
  return `±${String(tolerance).replace('.', ',')}${unit}`;
}

/**
 * @param viewer équipe du joueur, ou 'all' pour un écran partagé (partie locale),
 *               ou null pour un spectateur.
 */
export function versusView(s: VersusState, bank: QuestionBank, viewer: TeamId | 'all' | null): VersusView {
  const q = s.questionId ? requireQuestion(bank, s.questionId) : null;
  const lastResult = s.history[s.history.length - 1] ?? null;
  const showLast = lastResult !== null && (s.phase !== 'intro' && s.phase !== 'estimate' && s.phase !== 'contest');
  const seeHint = viewer === 'all' || viewer === s.estimator;
  const tbRevealed = s.phase === 'tb_reveal' || s.phase === 'over';
  let tb: VersusView['tb'] = null;
  if (s.tb) {
    const tq = requireQuestion(bank, s.tb.questionId);
    const estimates: Partial<Record<TeamId, number>> = {};
    for (const t of ['A', 'B'] as const) {
      const e = s.tb.estimates[t];
      if (e !== undefined && (tbRevealed || viewer === 'all' || viewer === t)) estimates[t] = e;
    }
    tb = {
      index: s.tb.index,
      question: toPublicQuestion(tq),
      locked: { A: s.tb.estimates.A !== undefined, B: s.tb.estimates.B !== undefined },
      estimates,
      results: s.tb.results.map((r) => ({ ...r, question: revealQuestion(requireQuestion(bank, r.questionId)) })),
    };
  }
  return {
    phase: s.phase,
    step: s.step,
    round: s.round,
    settings: s.settings,
    teams: structuredClone(s.teams),
    estimator: s.estimator,
    multiplier: s.multiplier,
    deadline: s.deadline,
    phaseStartedAt: s.phaseStartedAt,
    question: q && s.phase !== 'over' ? toPublicQuestion(q) : null,
    toleranceLabel: q ? toleranceLabel(q, toleranceFactor(s.settings), s.tolerance) : null,
    estimate: s.estimate,
    bet: s.bet,
    call: s.call,
    doubled: s.doubled,
    hint: seeHint ? s.hint : null,
    hintUsed: s.hintUsed,
    swapped: s.swapped,
    last: showLast && lastResult ? { ...lastResult, question: revealQuestion(requireQuestion(bank, lastResult.questionId)) } : null,
    history: s.history,
    tb,
    winner: s.winner,
    endReason: s.endReason,
  };
}

/* ------------------------------------------------------------------ */
/* Bilan de partie                                                      */
/* ------------------------------------------------------------------ */

export interface TeamSummary {
  estimates: number;
  inZone: number;
  exact: number;
  contests: number;
  contestsRight: number;
  points: number;
}

export function summarize(s: Pick<VersusState, 'history'>): Record<TeamId, TeamSummary> {
  const blank = (): TeamSummary => ({ estimates: 0, inZone: 0, exact: 0, contests: 0, contestsRight: 0, points: 0 });
  const out: Record<TeamId, TeamSummary> = { A: blank(), B: blank() };
  for (const r of s.history) {
    const e = out[r.estimator];
    const c = out[otherTeam(r.estimator)];
    if (r.estimate !== null) e.estimates += 1;
    if (r.inZone) e.inZone += 1;
    if (r.exact) e.exact += 1;
    if (r.call !== null && r.estimate !== null) {
      c.contests += 1;
      if (r.outcome === 'contest_right' || r.outcome === 'pile_shared') c.contestsRight += 1;
    }
    out.A.points += r.points.A;
    out.B.points += r.points.B;
  }
  return out;
}
