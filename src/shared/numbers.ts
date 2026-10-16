/**
 * Saisie, affichage et comparaison des valeurs numériques.
 *
 * Toutes les comparaisons passent par des entiers mis à l'échelle (BigInt),
 * ce qui garantit qu'une estimation exacte n'est jamais jugée fausse
 * à cause d'une erreur d'arrondi en virgule flottante (ex. 0,1 + 0,2).
 */
import type { Question, ValueKind } from './types.ts';

export const MAX_ABS_VALUE = 1e15;
export const MAX_YEAR = 9999;
const SCALE_DECIMALS = 6;

/* ------------------------------------------------------------------ */
/* Saisie                                                              */
/* ------------------------------------------------------------------ */

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  mille: 1e3,
  m: 1e6,
  million: 1e6,
  millions: 1e6,
  md: 1e9,
  mds: 1e9,
  mrd: 1e9,
  g: 1e9,
  milliard: 1e9,
  milliards: 1e9,
};

/**
 * Interprète une saisie au format français ou international :
 * « 1 234 », « 1 234,5 », « 1.234.567 », « 3,5 M », « 2,1 milliards », « -12 ».
 * `decimals` = nombre de décimales autorisées pour la question.
 */
export function parseEstimate(input: string, decimals = 0, allowNegative = false, kind?: ValueKind): ParseResult {
  let s = input.trim().toLowerCase();
  if (s.length === 0) return { ok: false, error: 'Entrez un nombre.' };
  if (s.length > 40) return { ok: false, error: 'Saisie trop longue.' };

  // Suffixe multiplicateur éventuel.
  let mult = 1;
  const suffix = s.match(/\s*([a-z]+)\.?$/);
  if (suffix) {
    const m = MULTIPLIERS[suffix[1] as string];
    if (m === undefined) return { ok: false, error: 'Utilisez uniquement des chiffres.' };
    mult = m;
    s = s.slice(0, suffix.index).trim();
  }

  // Espaces (y compris insécables et fines) utilisés comme séparateurs de milliers.
  s = s.replace(/[\s\u00a0\u202f\u2009']/g, '');
  let negative = false;
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return { ok: false, error: 'Utilisez uniquement des chiffres.' };

  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;
  let normalized: string;
  if (dots > 0 && commas > 0) {
    // Le dernier séparateur rencontré est le séparateur décimal.
    const decSep = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const thouSep = decSep === '.' ? ',' : '.';
    const [intPart, ...rest] = s.split(decSep);
    if (rest.length !== 1) return { ok: false, error: 'Format de nombre invalide.' };
    if (!isGrouped(intPart as string, thouSep)) return { ok: false, error: 'Format de nombre invalide.' };
    normalized = `${(intPart as string).split(thouSep).join('')}.${rest[0]}`;
  } else if (dots + commas === 0) {
    normalized = s;
  } else {
    const sep = dots > 0 ? '.' : ',';
    const count = dots + commas;
    const parts = s.split(sep);
    // « 1.234.567 » ou « 1,234 » sans décimales autorisées : séparateur de milliers.
    const looksGrouped = isGrouped(s, sep);
    if (count > 1) {
      if (!looksGrouped) return { ok: false, error: 'Format de nombre invalide.' };
      normalized = parts.join('');
    } else if (looksGrouped && (decimals === 0 || (sep === '.' && mult === 1 && decimals < 3))) {
      normalized = parts.join('');
    } else {
      normalized = `${parts[0] === '' ? '0' : parts[0]}.${parts[1]}`;
    }
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false, error: 'Format de nombre invalide.' };
  let value = Number(normalized) * mult;
  if (negative) value = -value;
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABS_VALUE) return { ok: false, error: 'Nombre trop grand.' };
  if (value < 0 && !allowNegative) return { ok: false, error: 'La réponse ne peut pas être négative.' };
  if (!hasAtMostDecimals(value, decimals)) {
    return {
      ok: false,
      error: decimals === 0 ? 'Entrez un nombre entier.' : `${decimals} décimale${decimals > 1 ? 's' : ''} maximum.`,
    };
  }
  if (kind === 'year' && Math.abs(value) > MAX_YEAR) return { ok: false, error: 'Une année s’écrit avec 4 chiffres au plus.' };
  // Supprime les résidus flottants de la multiplication (1,1 M → 1100000 et non 1100000.0000000002).
  value = Number(value.toFixed(Math.min(decimals, SCALE_DECIMALS)));
  if (Object.is(value, -0)) value = 0;
  return { ok: true, value };
}

function isGrouped(s: string, sep: string): boolean {
  const parts = s.split(sep);
  if (parts.length < 2) return false;
  if (!/^\d{1,3}$/.test(parts[0] as string)) return false;
  return parts.slice(1).every((p) => /^\d{3}$/.test(p));
}

export function hasAtMostDecimals(value: number, decimals: number): boolean {
  const scaled = toScaled(value);
  const unit = 10n ** BigInt(SCALE_DECIMALS - Math.min(decimals, SCALE_DECIMALS));
  return scaled % unit === 0n;
}

/** Valide une valeur déjà numérique (côté serveur ou moteur). */
export function validateValue(value: unknown, q: Pick<Question, 'decimals' | 'kind'> & { allowNegative?: boolean }): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (Math.abs(value) > MAX_ABS_VALUE) return false;
  if (value < 0 && !q.allowNegative) return false;
  if (q.kind === 'year' && Math.abs(value) > MAX_YEAR) return false;
  return hasAtMostDecimals(value, q.decimals ?? 0);
}

/* ------------------------------------------------------------------ */
/* Comparaison exacte                                                   */
/* ------------------------------------------------------------------ */

/** Convertit en entier à 6 décimales fixes. Sûr jusqu'à 1e15. */
export function toScaled(x: number): bigint {
  const fixed = Math.abs(x).toFixed(SCALE_DECIMALS);
  const [i, f = ''] = fixed.split('.');
  const v = BigInt(i as string) * 10n ** BigInt(SCALE_DECIMALS) + BigInt(f.padEnd(SCALE_DECIMALS, '0'));
  return x < 0 ? -v : v;
}

export type Direction = 'plus' | 'moins' | 'egal';

export interface Evaluation {
  /** |estimation − valeur| ≤ tolérance */
  inZone: boolean;
  /** écart strictement nul */
  exact: boolean;
  /** Position de la vraie valeur par rapport à l'estimation. */
  direction: Direction;
  /** Écart absolu (nombre flottant, pour l'affichage et les statistiques). */
  diff: number;
}

export function evaluate(estimate: number, answer: number, tolerance: number): Evaluation {
  const e = toScaled(estimate);
  const a = toScaled(answer);
  const t = toScaled(Math.max(0, tolerance));
  const d = a - e;
  const ad = d < 0n ? -d : d;
  return {
    inZone: ad <= t,
    exact: ad === 0n,
    direction: d > 0n ? 'plus' : d < 0n ? 'moins' : 'egal',
    diff: Math.abs(answer - estimate),
  };
}

/** Arrondit vers le bas au pas de la question (10^-decimals), de façon exacte. */
function floorToStep(x: number, decimals: number): number {
  const step = 10 ** decimals;
  // Petite marge pour absorber les erreurs flottantes (ex. 2 * 0.35 = 0.7000000000000001).
  return Math.floor(x * step + 1e-9) / step;
}

/**
 * Tolérance effective (écart absolu maximal) d'une question pour un facteur donné.
 * Le résultat est arrondi au pas de saisie : une tolérance de 0,7 an devient 0 an
 * (réponse exacte exigée), jamais une valeur impossible à atteindre.
 */
export function effectiveTolerance(q: Pick<Question, 'tol' | 'answer' | 'decimals' | 'minTol'>, factor: number): number {
  const decimals = q.decimals ?? 0;
  const raw = 'abs' in q.tol ? q.tol.abs * factor : Math.abs(q.answer) * q.tol.rel * factor;
  const t = floorToStep(raw, decimals);
  return Math.max(q.minTol ?? 0, t);
}

/* ------------------------------------------------------------------ */
/* Affichage                                                           */
/* ------------------------------------------------------------------ */

const formatters = new Map<number, Intl.NumberFormat>();
function fmt(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
    formatters.set(decimals, f);
  }
  return f;
}

/** « 1 234 567,5 » ; les années ne sont jamais groupées (« 1789 »). */
export function formatNumber(value: number, decimals = 0, kind?: ValueKind): string {
  if (!Number.isFinite(value)) return '—';
  if (kind === 'year') return String(Math.round(value)).replace('-', '−');
  return fmt(decimals).format(value).replace('-', '−');
}

/** Forme courte pour les grands nombres : « 1,2 milliard », « 340 000 ». */
export function formatCompact(value: number, decimals = 0, kind?: ValueKind): string {
  const abs = Math.abs(value);
  if (kind === 'year' || abs < 1e6) return formatNumber(value, decimals, kind);
  const units: [number, string, string][] = [
    [1e12, 'billion', 'billions'],
    [1e9, 'milliard', 'milliards'],
    [1e6, 'million', 'millions'],
  ];
  for (const [u, one, many] of units) {
    if (abs >= u) {
      const v = value / u;
      const s = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: Math.abs(v) < 10 ? 2 : 1 }).format(v);
      return `${s} ${Math.abs(v) < 2 ? one : many}`;
    }
  }
  return formatNumber(value, decimals, kind);
}

/** Texte lisible d'une tolérance : « ±2 ans », « ±5 % (soit ±340 km) », « valeur exacte ». */
export function describeTolerance(q: Pick<Question, 'unit' | 'decimals' | 'kind'>, tolerance: number): string {
  if (tolerance === 0) return 'valeur exacte';
  const unit = q.kind === 'year' ? (tolerance >= 2 ? ' ans' : ' an') : q.unit ? ` ${q.unit}` : '';
  return `±${formatNumber(tolerance, q.decimals ?? 0, q.kind === 'year' ? 'count' : q.kind)}${unit}`;
}

/** Nombre « rond » pour les bornes d'indice : arrondi à 2 chiffres significatifs, vers l'extérieur. */
export function roundNice(x: number, direction: 'down' | 'up', decimals = 0): number {
  if (x === 0) return 0;
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const mag = 10 ** (Math.floor(Math.log10(ax)) - 1);
  const step = Math.max(mag, 10 ** -decimals);
  const goDown = (direction === 'down') === sign > 0;
  const r = goDown ? Math.floor(ax / step) * step : Math.ceil(ax / step) * step;
  return Number((sign * r).toFixed(Math.max(0, decimals)));
}

/**
 * Distance normalisée entre une estimation et la réponse, utilisée pour les
 * statistiques et le score solo : 0 = exact, 1 = bord de la zone de référence.
 * Pour les grandeurs relatives, on mesure l'écart en logarithme (se tromper
 * d'un facteur 2 compte pareil à 10 ou à 10 millions).
 */
export function normalizedError(estimate: number, q: Pick<Question, 'answer' | 'tol' | 'decimals'>): number {
  if ('rel' in q.tol) {
    const ref = Math.log1p(q.tol.rel);
    if (estimate <= 0 || q.answer <= 0) return estimate === q.answer ? 0 : 99;
    return Math.abs(Math.log(estimate / q.answer)) / ref;
  }
  const ref = Math.max(q.tol.abs, 10 ** -(q.decimals ?? 0));
  return Math.abs(estimate - q.answer) / ref;
}

/** Écart relatif en pourcentage, pour l'affichage (« à 4 % de la réponse »). */
export function relativeErrorPct(estimate: number, answer: number): number {
  if (answer === 0) return estimate === 0 ? 0 : 100;
  return (Math.abs(estimate - answer) / Math.abs(answer)) * 100;
}
