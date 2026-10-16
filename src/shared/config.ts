/**
 * Configuration centrale des règles.
 *
 * Toutes les valeurs de points, de temps et de tolérance du jeu viennent d'ici.
 * Aucun composant d'interface ni le serveur ne définit ses propres valeurs :
 * ils lisent `GameSettings` (validé par `sanitizeSettings`).
 */
import type { CategoryId, Difficulty, JokerId, QuestionLevel, TeamId } from './types.ts';

/* ------------------------------------------------------------------ */
/* Barème                                                              */
/* ------------------------------------------------------------------ */

/**
 * Barème d'une manche « Estimation / Contestation ».
 *
 * Vocabulaire :
 *  - l'équipe *estimatrice* propose un nombre ;
 *  - l'équipe *contestataire* annonce « Plus » (la vraie valeur est supérieure),
 *    « Moins » (inférieure) ou « Tout Pile » (l'estimation est dans la zone de tolérance).
 *  - « dans la zone » : |estimation − valeur| ≤ tolérance effective.
 */
export interface ScoringRules {
  /** Estimation dans la zone alors que l'adversaire a annoncé Plus ou Moins → estimatrice. */
  pileEstimator: number;
  /** Estimation dans la zone ET adversaire a annoncé « Tout Pile » → estimatrice. */
  pileSharedEstimator: number;
  /** Estimation dans la zone ET adversaire a annoncé « Tout Pile » → contestataire. */
  pileSharedContester: number;
  /** Bonus supplémentaire si l'estimation est strictement égale à la valeur (écart nul) → estimatrice. */
  exactBonus: number;
  /** Plus/Moins correct (hors zone) → contestataire. */
  contestRight: number;
  /** Plus/Moins incorrect (hors zone) → estimatrice. */
  contestWrong: number;
  /** « Tout Pile » annoncé à tort (hors zone) → estimatrice. */
  pileCallWrong: number;
  /** L'estimatrice n'a rien verrouillé avant la fin du temps → contestataire. */
  noEstimate: number;
  /** La contestataire n'a rien annoncé avant la fin du temps → estimatrice. */
  noContest: number;
  /** Multiplicateur des points de l'estimatrice quand son « Pari Tout Pile » réussit. */
  betMultiplier: number;
  /** Points offerts à la contestataire quand le « Pari Tout Pile » échoue. */
  betMissPenalty: number;
  /** Multiplicateur de tous les points de la manche quand « Quitte ou double » est joué. */
  doubleMultiplier: number;
}

export const CLASSIC_SCORING: ScoringRules = {
  pileEstimator: 3,
  pileSharedEstimator: 2,
  pileSharedContester: 1,
  exactBonus: 1,
  contestRight: 1,
  contestWrong: 1,
  pileCallWrong: 2,
  noEstimate: 1,
  noContest: 1,
  betMultiplier: 2,
  betMissPenalty: 1,
  doubleMultiplier: 2,
};

/* ------------------------------------------------------------------ */
/* Difficultés                                                         */
/* ------------------------------------------------------------------ */

export interface DifficultyProfile {
  id: Difficulty;
  label: string;
  tagline: string;
  /** Poids de tirage par niveau de question (0 = jamais tiré). */
  levelWeights: Record<QuestionLevel, number>;
  /** Facteur appliqué à la tolérance de référence de chaque question. */
  tolFactor: number;
  estimateSeconds: number;
  contestSeconds: number;
  /** Les questions sont ordonnées de la plus accessible à la plus pointue. */
  progressive: boolean;
  /** Ajustements du barème propres à la difficulté. */
  scoring: Partial<ScoringRules>;
  /** Afficher l'explication détaillée et la méthode de comparaison. */
  pedagogic: boolean;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  decouverte: {
    id: 'decouverte',
    label: 'Découverte',
    tagline: 'Questions accessibles, tolérance large, tout le temps de réfléchir.',
    levelWeights: { 1: 0.75, 2: 0.25, 3: 0, 4: 0 },
    tolFactor: 1.6,
    estimateSeconds: 60,
    contestSeconds: 30,
    progressive: true,
    scoring: {},
    pedagogic: true,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    tagline: 'Un mélange de classiques et de surprises, difficulté progressive.',
    levelWeights: { 1: 0.25, 2: 0.5, 3: 0.25, 4: 0 },
    tolFactor: 1,
    estimateSeconds: 45,
    contestSeconds: 25,
    progressive: true,
    scoring: {},
    pedagogic: true,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    tagline: 'Valeurs pointues, zone Tout Pile resserrée : la stratégie compte.',
    levelWeights: { 1: 0, 2: 0.3, 3: 0.5, 4: 0.2 },
    tolFactor: 0.6,
    estimateSeconds: 40,
    contestSeconds: 20,
    progressive: false,
    scoring: { pileEstimator: 4 },
    pedagogic: false,
  },
  maitre: {
    id: 'maitre',
    label: 'Maître',
    tagline: 'Tolérance minimale, la précision rapporte gros.',
    levelWeights: { 1: 0, 2: 0.1, 3: 0.45, 4: 0.45 },
    tolFactor: 0.35,
    estimateSeconds: 35,
    contestSeconds: 15,
    progressive: false,
    scoring: { pileEstimator: 5, exactBonus: 2 },
    pedagogic: false,
  },
};

/* ------------------------------------------------------------------ */
/* Paramètres d'une partie à deux équipes                               */
/* ------------------------------------------------------------------ */

export type VersusPreset = 'classique' | 'rapide' | 'perso';
export type AnimSpeed = 'normal' | 'rapide';

export interface GameSettings {
  name: string;
  preset: VersusPreset;
  difficulty: Difficulty;
  /** Catégories autorisées. Vide = toutes. */
  categories: CategoryId[];
  /** Score à atteindre pour gagner. 0 = la partie se joue au nombre de manches. */
  targetScore: number;
  maxRounds: number;
  /** Temps d'estimation en secondes. 0 = illimité (parties locales uniquement). */
  estimateSeconds: number;
  contestSeconds: number;
  /** Durée d'affichage de la révélation avant la manche suivante. */
  revealSeconds: number;
  /** Multiplicateur personnalisé de la tolérance (1 = celle de la difficulté). */
  tolFactor: number;
  scoring: ScoringRules;
  jokers: Record<JokerId, number>;
  /** Une « Manche Prime » toutes les N manches (0 = désactivé). */
  primeEvery: number;
  primeMultiplier: number;
  /** Autoriser l'annonce « Tout Pile » côté contestataire. */
  allowPileCall: boolean;
  /** Départager une égalité finale par une manche de précision. */
  tiebreak: boolean;
  animSpeed: AnimSpeed;
  startingTeam: TeamId | 'random';
  teamNames: Record<TeamId, string>;
}

export const DEFAULT_TEAM_NAMES: Record<TeamId, string> = { A: 'Solaire', B: 'Abysse' };

export const DEFAULT_JOKERS: Record<JokerId, number> = { hint: 1, swap: 1, double: 1, bet: 2 };

export const JOKER_INFO: Record<JokerId, { label: string; short: string; who: 'estimator' | 'contester'; desc: string }> = {
  hint: {
    label: 'Indice',
    short: 'Indice',
    who: 'estimator',
    desc: 'Affiche une fourchette qui contient la réponse. Réservé à l’équipe qui estime.',
  },
  swap: {
    label: 'Échange',
    short: 'Échange',
    who: 'estimator',
    desc: 'Remplace la question par une autre de même difficulté. Le chrono repart.',
  },
  bet: {
    label: 'Pari Tout Pile',
    short: 'Pari',
    who: 'estimator',
    desc: 'Vos points sont doublés si vous tombez dans la zone. Sinon, l’adversaire gagne 1 point de plus.',
  },
  double: {
    label: 'Quitte ou double',
    short: 'Q. ou D.',
    who: 'contester',
    desc: 'Double tous les points de la manche, dans un sens comme dans l’autre.',
  },
};

export function presetSettings(preset: VersusPreset, difficulty: Difficulty = 'normal'): GameSettings {
  const d = DIFFICULTY_PROFILES[difficulty];
  const base: GameSettings = {
    name: 'Partie Magnitude',
    preset,
    difficulty,
    categories: [],
    targetScore: 12,
    maxRounds: 16,
    estimateSeconds: d.estimateSeconds,
    contestSeconds: d.contestSeconds,
    revealSeconds: 12,
    tolFactor: 1,
    scoring: { ...CLASSIC_SCORING, ...d.scoring },
    jokers: { ...DEFAULT_JOKERS },
    primeEvery: 4,
    primeMultiplier: 2,
    allowPileCall: true,
    tiebreak: true,
    animSpeed: 'normal',
    startingTeam: 'random',
    teamNames: { ...DEFAULT_TEAM_NAMES },
  };
  if (preset === 'rapide') {
    return {
      ...base,
      targetScore: 6,
      maxRounds: 8,
      estimateSeconds: Math.min(30, d.estimateSeconds),
      contestSeconds: Math.min(15, d.contestSeconds),
      revealSeconds: 8,
      jokers: { hint: 0, swap: 1, double: 1, bet: 1 },
      primeEvery: 0,
      animSpeed: 'rapide',
    };
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Validation (client ET serveur)                                       */
/* ------------------------------------------------------------------ */

const ALL_CATEGORIES: readonly CategoryId[] = [
  'culture', 'histoire', 'geo', 'sciences', 'nature', 'espace', 'sport', 'football', 'cinema',
  'musique', 'tech', 'jeuxvideo', 'gastro', 'quotidien', 'records', 'insolite', 'eco',
];

export const LIMITS = {
  targetScore: [0, 50],
  maxRounds: [2, 40],
  estimateSeconds: [10, 180],
  contestSeconds: [5, 120],
  revealSeconds: [4, 30],
  tolFactor: [0.25, 3],
  points: [0, 10],
  multiplier: [1, 4],
  jokers: [0, 5],
  primeEvery: [0, 10],
  nameLength: 40,
  teamNameLength: 16,
} as const;

const clampInt = (v: unknown, [lo, hi]: readonly [number, number], fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(hi, Math.max(lo, n));
};
const clampNum = (v: unknown, [lo, hi]: readonly [number, number], fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, Math.round(n * 100) / 100));
};

/** Nettoie un texte libre saisi par un joueur (noms de partie, d'équipe, de joueur). */
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]', 'g');

export function cleanText(v: unknown, maxLen: number, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  // Retire les caractères de contrôle et les espaces multiples.
  const s = v.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  return s.length === 0 ? fallback : Array.from(s).slice(0, maxLen).join('');
}

/**
 * Valide et borne des paramètres venant d'une source non fiable.
 * `allowUnlimited` autorise un temps d'estimation nul (illimité) : uniquement en local.
 */
export function sanitizeSettings(input: unknown, opts: { allowUnlimited?: boolean } = {}): GameSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const preset: VersusPreset = raw.preset === 'rapide' || raw.preset === 'perso' ? raw.preset : 'classique';
  const difficulty: Difficulty =
    raw.difficulty === 'decouverte' || raw.difficulty === 'expert' || raw.difficulty === 'maitre' ? raw.difficulty : 'normal';
  const base = presetSettings(preset, difficulty);

  const cats = Array.isArray(raw.categories)
    ? Array.from(new Set(raw.categories.filter((c): c is CategoryId => ALL_CATEGORIES.includes(c as CategoryId))))
    : [];

  const rawScoring = (raw.scoring && typeof raw.scoring === 'object' ? raw.scoring : {}) as Record<string, unknown>;
  const scoring = { ...base.scoring };
  for (const key of Object.keys(scoring) as (keyof ScoringRules)[]) {
    const isMult = key === 'betMultiplier' || key === 'doubleMultiplier';
    scoring[key] = clampInt(rawScoring[key], isMult ? LIMITS.multiplier : LIMITS.points, base.scoring[key]);
  }

  const rawJokers = (raw.jokers && typeof raw.jokers === 'object' ? raw.jokers : {}) as Record<string, unknown>;
  const jokers = { ...base.jokers };
  for (const key of Object.keys(jokers) as JokerId[]) jokers[key] = clampInt(rawJokers[key], LIMITS.jokers, base.jokers[key]);

  const rawNames = (raw.teamNames && typeof raw.teamNames === 'object' ? raw.teamNames : {}) as Record<string, unknown>;

  let estimateSeconds = clampInt(raw.estimateSeconds, [0, LIMITS.estimateSeconds[1]], base.estimateSeconds);
  if (estimateSeconds === 0 && !opts.allowUnlimited) estimateSeconds = base.estimateSeconds;
  if (estimateSeconds !== 0) estimateSeconds = Math.max(LIMITS.estimateSeconds[0], estimateSeconds);
  let contestSeconds = clampInt(raw.contestSeconds, [0, LIMITS.contestSeconds[1]], base.contestSeconds);
  if (contestSeconds === 0 && !opts.allowUnlimited) contestSeconds = base.contestSeconds;
  if (contestSeconds !== 0) contestSeconds = Math.max(LIMITS.contestSeconds[0], contestSeconds);

  const targetScore = clampInt(raw.targetScore, LIMITS.targetScore, base.targetScore);
  const settings: GameSettings = {
    name: cleanText(raw.name, LIMITS.nameLength, base.name),
    preset,
    difficulty,
    categories: cats.length === ALL_CATEGORIES.length ? [] : cats,
    targetScore,
    maxRounds: clampInt(raw.maxRounds, LIMITS.maxRounds, base.maxRounds),
    estimateSeconds,
    contestSeconds,
    revealSeconds: clampInt(raw.revealSeconds, LIMITS.revealSeconds, base.revealSeconds),
    tolFactor: clampNum(raw.tolFactor, LIMITS.tolFactor, base.tolFactor),
    scoring,
    jokers,
    primeEvery: clampInt(raw.primeEvery, LIMITS.primeEvery, base.primeEvery),
    primeMultiplier: clampInt(raw.primeMultiplier, LIMITS.multiplier, base.primeMultiplier),
    allowPileCall: typeof raw.allowPileCall === 'boolean' ? raw.allowPileCall : base.allowPileCall,
    tiebreak: typeof raw.tiebreak === 'boolean' ? raw.tiebreak : base.tiebreak,
    animSpeed: raw.animSpeed === 'rapide' ? 'rapide' : raw.animSpeed === 'normal' ? 'normal' : base.animSpeed,
    startingTeam: raw.startingTeam === 'A' || raw.startingTeam === 'B' ? raw.startingTeam : 'random',
    teamNames: {
      A: cleanText(rawNames.A, LIMITS.teamNameLength, base.teamNames.A),
      B: cleanText(rawNames.B, LIMITS.teamNameLength, base.teamNames.B),
    },
  };
  return settings;
}

/** Durée de l'introduction d'une manche (synchronisée entre tous les joueurs). */
export const introMs = (s: Pick<GameSettings, 'animSpeed'>): number => (s.animSpeed === 'rapide' ? 2200 : 3400);

/** Nombre maximal de manches de départage avant de déclarer l'égalité. */
export const MAX_TIEBREAKS = 3;
