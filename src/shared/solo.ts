/**
 * Moteur des modes solo : Série, Rapide et Survie.
 *
 * Le joueur estime seul ; ses points dépendent de la précision :
 *   - « Tout Pile » (dans la zone de tolérance de la difficulté) : 100 pts, +50 si exact ;
 *   - sinon, selon l'écart normalisé d (1 = bord de la zone de référence) :
 *       d ≤ 2 « Proche » 70 · d ≤ 4 « Correct » 40 · d ≤ 8 « Loin » 15 · au-delà « Raté » 0.
 * Les bonnes réponses consécutives (Tout Pile ou Proche) font monter un
 * multiplicateur de série jusqu'à ×2. La difficulté multiplie aussi les points.
 *
 * Même philosophie que le moteur à deux équipes : réducteur pur et déterministe.
 */
import { DIFFICULTY_PROFILES } from './config.ts';
import { buildDeck, buildLeveledDecks, requireQuestion, type QuestionBank } from './deck.ts';
import { effectiveTolerance, evaluate, normalizedError, validateValue } from './numbers.ts';
import type { CategoryId, Difficulty, QuestionLevel } from './types.ts';

export type SoloMode = 'serie' | 'rapide' | 'survie';
export type SoloGrade = 'pile' | 'proche' | 'correct' | 'loin' | 'rate' | 'temps';

export const SOLO_MODES: Record<
  SoloMode,
  { label: string; tagline: string; count: number; seconds: number | null; lives: number | null }
> = {
  serie: { label: 'Série', tagline: '10 questions, la précision fait le score.', count: 10, seconds: null, lives: null },
  rapide: { label: 'Rapide', tagline: '6 questions, 20 secondes chacune, bonus de vitesse.', count: 6, seconds: 20, lives: null },
  survie: { label: 'Survie', tagline: 'Difficulté croissante. Trois vies. Jusqu’où irez-vous ?', count: 400, seconds: 30, lives: 3 },
};

export const GRADE_POINTS: Record<SoloGrade, number> = { pile: 100, proche: 70, correct: 40, loin: 15, rate: 0, temps: 0 };
export const EXACT_BONUS = 50;
export const DIFFICULTY_POINTS: Record<Difficulty, number> = { decouverte: 1, normal: 1.25, expert: 1.6, maitre: 2 };
export const SURVIVAL_MAX_LIVES = 3;

export const GRADE_LABEL: Record<SoloGrade, string> = {
  pile: 'Tout Pile',
  proche: 'Proche',
  correct: 'Correct',
  loin: 'Loin',
  rate: 'Raté',
  temps: 'Temps écoulé',
};

export function gradeFor(inZone: boolean, d: number | null): SoloGrade {
  if (d === null) return 'temps';
  if (inZone) return 'pile';
  if (d <= 2) return 'proche';
  if (d <= 4) return 'correct';
  if (d <= 8) return 'loin';
  return 'rate';
}

export const streakMultiplier = (streak: number): number => 1 + 0.25 * Math.min(Math.max(streak, 0), 4);

/** En Survie, le niveau des questions monte toutes les 5 questions. */
export const survivalLevel = (index: number): QuestionLevel => (Math.min(4, 1 + Math.floor(index / 5)) as QuestionLevel);

export interface SoloAnswer {
  questionId: string;
  estimate: number | null;
  answer: number;
  tolerance: number;
  inZone: boolean;
  exact: boolean;
  /** Écart normalisé (null si pas de réponse). */
  error: number | null;
  grade: SoloGrade;
  points: number;
  timeMs: number;
  streak: number;
  lives: number | null;
}

export interface SoloState {
  v: 1;
  mode: SoloMode;
  difficulty: Difficulty;
  categories: CategoryId[];
  seed: number;
  deck: string[];
  leveled: Record<QuestionLevel, string[]> | null;
  used: string[];
  index: number;
  questionId: string;
  tolerance: number;
  phase: 'question' | 'reveal' | 'over';
  deadline: number | null;
  phaseStartedAt: number;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number | null;
  answers: SoloAnswer[];
}

export type SoloAction =
  | { type: 'answer'; value: number; now: number }
  | { type: 'tick'; now: number }
  | { type: 'next'; now: number }
  | { type: 'quit'; now: number };

export type SoloResult = { ok: true; state: SoloState } | { ok: false; error: string; state: SoloState };

export function createSolo(
  bank: QuestionBank,
  cfg: { mode: SoloMode; difficulty: Difficulty; categories: CategoryId[]; seed: number; avoid?: readonly string[] },
  now: number,
): SoloState {
  const meta = SOLO_MODES[cfg.mode];
  let deck: string[] = [];
  let leveled: SoloState['leveled'] = null;
  if (cfg.mode === 'survie') {
    leveled = buildLeveledDecks(bank, { categories: cfg.categories, seed: cfg.seed, avoid: cfg.avoid ?? [] });
  } else {
    deck = buildDeck(bank, { difficulty: cfg.difficulty, categories: cfg.categories, count: meta.count, seed: cfg.seed, avoid: cfg.avoid ?? [] });
  }
  const s: SoloState = {
    v: 1,
    mode: cfg.mode,
    difficulty: cfg.difficulty,
    categories: cfg.categories,
    seed: cfg.seed,
    deck,
    leveled,
    used: [],
    index: 0,
    questionId: '',
    tolerance: 0,
    phase: 'question',
    deadline: null,
    phaseStartedAt: now,
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: meta.lives,
    answers: [],
  };
  if (!loadQuestion(s, bank, now)) throw new Error('Aucune question disponible.');
  return s;
}

function secondsFor(s: SoloState): number | null {
  return SOLO_MODES[s.mode].seconds ?? DIFFICULTY_PROFILES[s.difficulty].estimateSeconds;
}

function nextQuestionId(s: SoloState): string | null {
  if (s.mode !== 'survie') return s.deck[s.index] ?? null;
  const decks = s.leveled;
  if (!decks) return null;
  // Niveau visé, puis niveaux voisins si épuisé.
  const want = survivalLevel(s.index);
  const order: QuestionLevel[] = [want, ...([4, 3, 2, 1] as QuestionLevel[]).filter((l) => l !== want)];
  for (const l of order) {
    const id = decks[l].find((x) => !s.used.includes(x));
    if (id) return id;
  }
  return null;
}

function loadQuestion(s: SoloState, bank: QuestionBank, now: number): boolean {
  const id = nextQuestionId(s);
  if (!id) return false;
  const q = requireQuestion(bank, id);
  s.questionId = id;
  s.used.push(id);
  s.tolerance = effectiveTolerance(q, DIFFICULTY_PROFILES[s.difficulty].tolFactor);
  s.phase = 'question';
  s.phaseStartedAt = now;
  const sec = secondsFor(s);
  s.deadline = sec ? now + sec * 1000 : null;
  return true;
}

export function reduceSolo(state: SoloState, action: SoloAction, bank: QuestionBank): SoloResult {
  const fail = (error: string): SoloResult => ({ ok: false, error, state });
  if (state.phase === 'over') return fail('over');
  const s: SoloState = structuredClone(state);
  switch (action.type) {
    case 'answer': {
      if (s.phase !== 'question') return fail('wrong_phase');
      const q = requireQuestion(bank, s.questionId);
      if (!validateValue(action.value, { decimals: q.decimals ?? 0, kind: q.kind, allowNegative: q.signed ?? false })) {
        return fail('invalid_value');
      }
      record(s, bank, action.value, action.now);
      return { ok: true, state: s };
    }
    case 'tick': {
      if (s.phase !== 'question' || s.deadline === null || action.now < s.deadline) return fail('not_due');
      record(s, bank, null, action.now);
      return { ok: true, state: s };
    }
    case 'next': {
      if (s.phase !== 'reveal') return fail('wrong_phase');
      const done = s.mode === 'survie' ? (s.lives ?? 0) <= 0 : s.index >= s.deck.length;
      if (done || !loadQuestion(s, bank, action.now)) {
        s.phase = 'over';
        s.deadline = null;
      }
      return { ok: true, state: s };
    }
    case 'quit': {
      s.phase = 'over';
      s.deadline = null;
      return { ok: true, state: s };
    }
    default:
      return fail('unknown');
  }
}

function record(s: SoloState, bank: QuestionBank, estimate: number | null, now: number): void {
  const q = requireQuestion(bank, s.questionId);
  const ev = estimate === null ? null : evaluate(estimate, q.answer, s.tolerance);
  const err = estimate === null ? null : normalizedError(estimate, q);
  const grade = gradeFor(ev?.inZone ?? false, err);
  const good = grade === 'pile' || grade === 'proche';
  s.streak = good ? s.streak + 1 : 0;
  s.bestStreak = Math.max(s.bestStreak, s.streak);

  let points = GRADE_POINTS[grade] + (ev?.exact ? EXACT_BONUS : 0);
  if (s.mode === 'rapide' && s.deadline !== null && (grade === 'pile' || grade === 'proche' || grade === 'correct')) {
    points += Math.round(Math.max(0, s.deadline - now) / 1000) * 3;
  }
  points = Math.round(points * DIFFICULTY_POINTS[s.difficulty] * streakMultiplier(good ? s.streak - 1 : 0));

  if (s.lives !== null) {
    if (grade === 'loin' || grade === 'rate' || grade === 'temps') s.lives -= 1;
    else if (grade === 'pile') s.lives = Math.min(SURVIVAL_MAX_LIVES, s.lives + 1);
  }
  s.score += points;
  s.answers.push({
    questionId: q.id,
    estimate,
    answer: q.answer,
    tolerance: s.tolerance,
    inZone: ev?.inZone ?? false,
    exact: ev?.exact ?? false,
    error: err,
    grade,
    points,
    timeMs: Math.max(0, now - s.phaseStartedAt),
    streak: s.streak,
    lives: s.lives,
  });
  s.index += 1;
  s.phase = 'reveal';
  s.deadline = null;
  s.phaseStartedAt = now;
}

/** Étoiles d'une session (0 à 3), selon le score rapporté au score « tout Proche ». */
export function soloStars(s: Pick<SoloState, 'mode' | 'difficulty' | 'score' | 'answers'>): number {
  if (s.mode === 'survie') {
    const n = s.answers.length;
    return n >= 25 ? 3 : n >= 15 ? 2 : n >= 8 ? 1 : 0;
  }
  const count = SOLO_MODES[s.mode].count;
  const ref = count * GRADE_POINTS.proche * DIFFICULTY_POINTS[s.difficulty];
  const ratio = s.score / ref;
  return ratio >= 1.2 ? 3 : ratio >= 0.8 ? 2 : ratio >= 0.45 ? 1 : 0;
}
