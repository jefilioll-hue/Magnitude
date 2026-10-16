/**
 * Banque de questions et constitution des « paquets » d'une partie.
 *
 * Objectifs :
 *  - respecter les poids de niveau de la difficulté choisie ;
 *  - ne jamais tirer deux fois la même question, ni deux questions du même sujet ;
 *  - repousser en fin de paquet les questions vues récemment par le joueur ;
 *  - éviter d'enchaîner deux questions de la même catégorie ;
 *  - rester entièrement déterministe pour une graine donnée.
 */
import type { CategoryId, Difficulty, Question, QuestionLevel } from './types.ts';
import { DIFFICULTY_PROFILES } from './config.ts';
import { derive, shuffle, weightedPick, type Rng } from './rng.ts';

export interface QuestionBank {
  readonly all: readonly Question[];
  readonly byId: ReadonlyMap<string, Question>;
}

export function createBank(questions: readonly Question[]): QuestionBank {
  const byId = new Map<string, Question>();
  for (const q of questions) {
    if (byId.has(q.id)) throw new Error(`Identifiant de question en double : ${q.id}`);
    byId.set(q.id, q);
  }
  return { all: questions, byId };
}

export function requireQuestion(bank: QuestionBank, id: string): Question {
  const q = bank.byId.get(id);
  if (!q) throw new Error(`Question inconnue : ${id}`);
  return q;
}

const LEVELS: readonly QuestionLevel[] = [1, 2, 3, 4];
const topicOf = (q: Question): string => q.tags?.[0] ?? q.id;

export interface DeckOptions {
  difficulty: Difficulty;
  categories: readonly CategoryId[];
  count: number;
  seed: number;
  /** Identifiants vus récemment, du plus récent au plus ancien. */
  avoid?: readonly string[];
  /** Poids de niveau personnalisés (sinon ceux de la difficulté). */
  levelWeights?: Record<QuestionLevel, number>;
  progressive?: boolean;
}

function categoryPool(bank: QuestionBank, categories: readonly CategoryId[]): Question[] {
  if (categories.length === 0) return bank.all.slice();
  const set = new Set(categories);
  const pool = bank.all.filter((q) => set.has(q.cat));
  return pool.length > 0 ? pool : bank.all.slice();
}

/** Ordonne les candidats : jamais vus d'abord (mélangés), puis vus il y a longtemps, puis récemment. */
function rankByFreshness(cands: Question[], recency: Map<string, number>, rng: Rng): Question[] {
  const fresh = shuffle(cands.filter((q) => !recency.has(q.id)), rng);
  const seen = cands.filter((q) => recency.has(q.id)).sort((a, b) => (recency.get(b.id) ?? 0) - (recency.get(a.id) ?? 0));
  return fresh.concat(seen);
}

export function buildDeck(bank: QuestionBank, opts: DeckOptions): string[] {
  const rng = derive(opts.seed, 'deck');
  const weights = opts.levelWeights ?? DIFFICULTY_PROFILES[opts.difficulty].levelWeights;
  const progressive = opts.progressive ?? DIFFICULTY_PROFILES[opts.difficulty].progressive;
  const recency = new Map<string, number>();
  (opts.avoid ?? []).forEach((id, i) => recency.set(id, i)); // plus petit = plus récent

  const catPool = categoryPool(bank, opts.categories);
  const byLevel = new Map<QuestionLevel, Question[]>();
  for (const l of LEVELS) byLevel.set(l, rankByFreshness(catPool.filter((q) => q.level === l), recency, rng));

  // Niveaux disponibles : ceux de la difficulté, élargis aux voisins si la sélection de catégories est trop étroite.
  let allowed = LEVELS.filter((l) => (weights[l] ?? 0) > 0 && (byLevel.get(l)?.length ?? 0) > 0);
  const availableCount = () => allowed.reduce((s, l) => s + (byLevel.get(l)?.length ?? 0), 0);
  if (availableCount() < opts.count) allowed = LEVELS.filter((l) => (byLevel.get(l)?.length ?? 0) > 0);

  const effWeight = (l: QuestionLevel) => (weights[l] && weights[l] > 0 ? weights[l] : 0.05);
  const picked: Question[] = [];
  const usedTopics = new Set<string>();

  const takeFrom = (l: QuestionLevel, strictTopic: boolean): Question | undefined => {
    const list = byLevel.get(l) ?? [];
    for (let i = 0; i < list.length; i++) {
      const q = list[i] as Question;
      if (picked.includes(q)) continue;
      if (strictTopic && usedTopics.has(topicOf(q))) continue;
      return q;
    }
    return undefined;
  };

  const target = Math.min(opts.count, catPool.length);
  let guard = 0;
  while (picked.length < target && guard++ < target * 20) {
    const live = allowed.filter((l) => takeFrom(l, false) !== undefined);
    if (live.length === 0) break;
    const level = weightedPick(live, effWeight, rng) as QuestionLevel;
    const q = takeFrom(level, true) ?? takeFrom(level, false);
    if (!q) continue;
    picked.push(q);
    usedTopics.add(topicOf(q));
  }

  let ordered = progressive
    ? picked
        .map((q, i) => ({ q, k: q.level + rng() * 0.9 + i * 0.0001 }))
        .sort((a, b) => a.k - b.k)
        .map((x) => x.q)
    : shuffle(picked, rng);
  ordered = spreadCategories(ordered);
  return ordered.map((q) => q.id);
}

/** Réordonne légèrement pour éviter deux catégories identiques consécutives. */
function spreadCategories(list: Question[]): Question[] {
  const out = list.slice();
  for (let i = 1; i < out.length; i++) {
    if ((out[i] as Question).cat !== (out[i - 1] as Question).cat) continue;
    for (let j = i + 1; j < Math.min(out.length, i + 5); j++) {
      if ((out[j] as Question).cat !== (out[i - 1] as Question).cat) {
        const [q] = out.splice(j, 1);
        out.splice(i, 0, q as Question);
        break;
      }
    }
  }
  return out;
}

/** Paquets séparés par niveau (mode Survie, qui monte en difficulté au fil des questions). */
export function buildLeveledDecks(
  bank: QuestionBank,
  opts: { categories: readonly CategoryId[]; seed: number; avoid?: readonly string[] },
): Record<QuestionLevel, string[]> {
  const rng = derive(opts.seed, 'leveled');
  const recency = new Map<string, number>();
  (opts.avoid ?? []).forEach((id, i) => recency.set(id, i));
  const pool = categoryPool(bank, opts.categories);
  const out = {} as Record<QuestionLevel, string[]>;
  for (const l of LEVELS) out[l] = spreadCategories(rankByFreshness(pool.filter((q) => q.level === l), recency, rng)).map((q) => q.id);
  return out;
}
