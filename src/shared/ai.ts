/**
 * Adversaire contrôlé par l'ordinateur.
 *
 * Modèle de connaissance : l'IA « se souvient » de la réponse avec une erreur
 * aléatoire, comme un joueur humain plus ou moins cultivé. Concrètement, sa
 * croyance est la vraie valeur déformée par un bruit dont l'ampleur dépend
 * de son niveau et de la difficulté de la question (bruit multiplicatif en
 * échelle logarithmique pour les grandeurs, additif pour les années).
 *
 * Elle n'a accès à rien d'autre que ce qu'un joueur voit : la question,
 * l'estimation adverse une fois verrouillée, l'indice si elle l'a demandé,
 * le score et le barème. Elle joue via les mêmes actions que les humains.
 */
import type { GameSettings } from './config.ts';
import { scoreRound } from './engine.ts';
import { gaussian, type Rng } from './rng.ts';
import type { ContestCall, Question, TeamId } from './types.ts';

export type AiLevel = 'debutant' | 'intermediaire' | 'expert';

export interface AiProfile {
  id: AiLevel;
  label: string;
  persona: string;
  /** Écart-type du bruit log pour les grandeurs relatives, à niveau de question 2. */
  sigmaRel: number;
  /** Écart-type du bruit absolu, en multiples de la tolérance de référence. */
  sigmaAbs: number;
  /** Probabilité de décision impulsive (aléatoire) en contestation. */
  impulsive: number;
  /** Raisonnement en espérance de points (sinon simple comparaison). */
  strategic: boolean;
  usesJokers: boolean;
  thinkMs: [number, number];
}

export const AI_PROFILES: Record<AiLevel, AiProfile> = {
  debutant: {
    id: 'debutant',
    label: 'Débutant',
    persona: 'Néo, l’estimateur enthousiaste',
    sigmaRel: 0.85,
    sigmaAbs: 7,
    impulsive: 0.25,
    strategic: false,
    usesJokers: false,
    thinkMs: [4500, 9000],
  },
  intermediaire: {
    id: 'intermediaire',
    label: 'Intermédiaire',
    persona: 'Vega, la calculatrice prudente',
    sigmaRel: 0.42,
    sigmaAbs: 3.2,
    impulsive: 0.08,
    strategic: true,
    usesJokers: true,
    thinkMs: [3500, 7500],
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    persona: 'Oracle, la mémoire encyclopédique',
    sigmaRel: 0.2,
    sigmaAbs: 1.5,
    impulsive: 0,
    strategic: true,
    usesJokers: true,
    thinkMs: [2500, 6000],
  },
};

interface Belief {
  mode: 'log' | 'lin';
  /** centre (en log pour mode 'log') */
  mu: number;
  sigma: number;
}

const levelScale = (q: Question): number => 0.6 + 0.2 * q.level; // 0,8 (niv. 1) → 1,4 (niv. 4)

function makeBelief(q: Question, p: AiProfile, rng: Rng, hint?: { lo: number; hi: number } | null): Belief {
  if ('rel' in q.tol && q.answer > 0) {
    const sigma = p.sigmaRel * levelScale(q);
    let mu = Math.log(q.answer) + gaussian(rng) * sigma;
    let sig = sigma;
    if (hint && hint.lo > 0) {
      const lo = Math.log(hint.lo);
      const hi = Math.log(hint.hi);
      mu = Math.min(hi, Math.max(lo, mu));
      sig = Math.min(sigma, (hi - lo) / 3.5);
    }
    return { mode: 'log', mu, sigma: Math.max(sig, 0.02) };
  }
  const ref = 'abs' in q.tol ? Math.max(q.tol.abs, 1) : Math.max(Math.abs(q.answer) * 0.05, 1);
  const sigma = p.sigmaAbs * ref * levelScale(q);
  let mu = q.answer + gaussian(rng) * sigma;
  let sig = sigma;
  if (hint) {
    mu = Math.min(hint.hi, Math.max(hint.lo, mu));
    sig = Math.min(sigma, (hint.hi - hint.lo) / 3.5);
  }
  return { mode: 'lin', mu, sigma: Math.max(sig, 0.25) };
}

/** Fonction de répartition de la loi normale (approximation d'Abramowitz-Stegun). */
function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/** Probabilité, selon la croyance, que la valeur soit ≤ x. */
function cdf(b: Belief, x: number): number {
  if (b.mode === 'log') return x <= 0 ? 0 : phi((Math.log(x) - b.mu) / b.sigma);
  return phi((x - b.mu) / b.sigma);
}

function roundEstimate(value: number, q: Question): number {
  const d = q.decimals ?? 0;
  if (q.kind === 'year') return Math.round(value);
  const abs = Math.abs(value);
  if (abs < 20) return Number(value.toFixed(Math.min(d, abs < 2 ? 2 : 1)));
  // Les humains arrondissent : 2 à 3 chiffres significatifs.
  const digits = abs >= 1000 ? 2 : 3;
  const mag = 10 ** (Math.floor(Math.log10(abs)) - digits + 1);
  return Number((Math.round(value / mag) * mag).toFixed(d));
}

export interface AiEstimateDecision {
  value: number;
  bet: boolean;
  wantsHint: boolean;
}

/**
 * Décision d'estimation. Appelée une première fois sans indice ; si elle
 * renvoie `wantsHint`, l'appelant joue le joker puis rappelle avec l'indice.
 */
export function aiEstimate(
  q: Question,
  level: AiLevel,
  rng: Rng,
  ctx: { hint?: { lo: number; hi: number } | null; jokers: { hint: number; bet: number } },
): AiEstimateDecision {
  const p = AI_PROFILES[level];
  const b = makeBelief(q, p, rng, ctx.hint);
  const center = b.mode === 'log' ? Math.exp(b.mu) : b.mu;
  let value = roundEstimate(center, q);
  if (!q.signed) value = Math.max(0, value);
  const uncertain = b.mode === 'log' ? b.sigma > 0.45 : b.sigma > 6;
  const wantsHint = p.usesJokers && !ctx.hint && ctx.jokers.hint > 0 && uncertain && q.level >= 3;
  // Pari : seulement quand l'IA est sûre d'elle.
  const confident = b.mode === 'log' ? b.sigma < 0.16 : b.sigma < 1.6;
  const bet = p.usesJokers && ctx.jokers.bet > 0 && confident && rng() < 0.55;
  return { value, bet, wantsHint };
}

export interface AiContestDecision {
  call: ContestCall;
  double: boolean;
}

/** Décision de contestation face à l'estimation adverse. */
export function aiContest(
  q: Question,
  level: AiLevel,
  rng: Rng,
  ctx: {
    estimate: number;
    tolerance: number;
    settings: GameSettings;
    me: TeamId;
    multiplier: number;
    bet: boolean;
    jokers: { double: number };
  },
): AiContestDecision {
  const p = AI_PROFILES[level];
  const b = makeBelief(q, p, rng, null);
  const lo = ctx.estimate - ctx.tolerance;
  const hi = ctx.estimate + ctx.tolerance;
  const pBelow = Math.max(0, cdf(b, lo) - 1e-9); // la vraie valeur est sous la zone → « Moins »
  const pAbove = Math.max(0, 1 - cdf(b, hi)); // au-dessus → « Plus »
  const pIn = Math.max(0, 1 - pBelow - pAbove);

  const calls: ContestCall[] = ctx.settings.allowPileCall ? ['plus', 'moins', 'pile'] : ['plus', 'moins'];

  if (rng() < p.impulsive) {
    return { call: calls[Math.floor(rng() * 2)] as ContestCall, double: false };
  }

  if (!p.strategic) {
    const center = b.mode === 'log' ? Math.exp(b.mu) : b.mu;
    return { call: center >= ctx.estimate ? 'plus' : 'moins', double: false };
  }

  // Espérance de points (pour moi, moins pour l'adversaire) de chaque annonce.
  const estimator: TeamId = ctx.me === 'A' ? 'B' : 'A';
  const margin = (call: ContestCall, where: 'below' | 'in' | 'above'): number => {
    const answer = where === 'below' ? lo - 1 : where === 'above' ? hi + 1 : ctx.estimate;
    const r = scoreRound(ctx.settings, {
      estimator,
      estimate: ctx.estimate,
      call,
      bet: ctx.bet,
      doubled: false,
      prime: ctx.multiplier,
      answer: where === 'in' ? ctx.estimate + ctx.tolerance / 2 : answer,
      tolerance: ctx.tolerance,
    });
    return r.points[ctx.me] - r.points[estimator];
  };
  const ev = (call: ContestCall) =>
    pBelow * margin(call, 'below') + pIn * margin(call, 'in') + pAbove * margin(call, 'above');

  let best: ContestCall = 'plus';
  let bestEv = -Infinity;
  for (const c of calls) {
    const v = ev(c) + (level === 'intermediaire' ? gaussian(rng) * 0.25 : 0);
    if (v > bestEv) {
      bestEv = v;
      best = c;
    }
  }
  const pWin = best === 'plus' ? pAbove : best === 'moins' ? pBelow : pIn;
  const threshold = level === 'expert' ? 0.8 : 0.9;
  const double = ctx.jokers.double > 0 && best !== 'pile' && pWin > threshold && rng() < 0.7;
  return { call: best, double };
}

export function aiThinkMs(level: AiLevel, rng: Rng, fast: boolean): number {
  const [a, b] = AI_PROFILES[level].thinkMs;
  const ms = a + rng() * (b - a);
  return Math.round(fast ? ms * 0.55 : ms);
}

/** Estimation pour le départage (précision pure). */
export function aiTiebreak(q: Question, level: AiLevel, rng: Rng): number {
  return aiEstimate(q, level, rng, { jokers: { hint: 0, bet: 0 } }).value;
}

