/**
 * Types partagés entre le client, le serveur et les tests.
 * Aucune dépendance : ce fichier doit rester importable partout.
 */

export type TeamId = 'A' | 'B';
export const TEAMS: readonly TeamId[] = ['A', 'B'];
export const otherTeam = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A');

export type Difficulty = 'decouverte' | 'normal' | 'expert' | 'maitre';
export const DIFFICULTIES: readonly Difficulty[] = ['decouverte', 'normal', 'expert', 'maitre'];

export type CategoryId =
  | 'culture'
  | 'histoire'
  | 'geo'
  | 'sciences'
  | 'nature'
  | 'espace'
  | 'sport'
  | 'football'
  | 'cinema'
  | 'musique'
  | 'tech'
  | 'jeuxvideo'
  | 'gastro'
  | 'quotidien'
  | 'records'
  | 'insolite'
  | 'eco';

/** Niveau intrinsèque d'une question : 1 = accessible … 4 = pointu. */
export type QuestionLevel = 1 | 2 | 3 | 4;

/**
 * Nature de la valeur attendue. Elle détermine la façon de saisir, d'afficher
 * et de comparer la réponse (une année se compare en écart absolu, une
 * population en écart relatif, etc.).
 */
export type ValueKind = 'year' | 'count' | 'measure' | 'money' | 'percent' | 'duration';

/**
 * Tolérance de référence (difficulté « Normal »).
 * - `abs` : écart absolu maximal, dans l'unité de la question.
 * - `rel` : écart relatif maximal (0.1 = ±10 % de la valeur de référence).
 */
export type Tolerance = { abs: number } | { rel: number };

export interface Question {
  id: string;
  text: string;
  cat: CategoryId;
  level: QuestionLevel;
  answer: number;
  /** Unité affichée après le nombre (« km », « habitants »…). Vide si sans unité. */
  unit: string;
  kind: ValueKind;
  tol: Tolerance;
  /** Nombre de décimales acceptées à la saisie (0 par défaut). */
  decimals?: number;
  /** La tolérance ne descend jamais sous cette valeur absolue (ex. 0 pour une année exacte). */
  minTol?: number;
  /** La réponse peut être négative (températures…). Par défaut : non. */
  signed?: boolean;
  explain: string;
  /** Source vérifiable (organisme, publication ou page de référence). */
  source: string;
  /** Date ou période à laquelle la donnée se rapporte, pour les valeurs qui évoluent. */
  asOf?: string;
  tags?: string[];
}

/** Vue publique d'une question : jamais de réponse ni d'explication avant la révélation. */
export interface PublicQuestion {
  id: string;
  text: string;
  cat: CategoryId;
  level: QuestionLevel;
  unit: string;
  kind: ValueKind;
  decimals: number;
  signed: boolean;
  asOf?: string;
}

export function toPublicQuestion(q: Question): PublicQuestion {
  const p: PublicQuestion = {
    id: q.id,
    text: q.text,
    cat: q.cat,
    level: q.level,
    unit: q.unit,
    kind: q.kind,
    decimals: q.decimals ?? 0,
    signed: q.signed ?? false,
  };
  if (q.asOf) p.asOf = q.asOf;
  return p;
}

export type ContestCall = 'plus' | 'moins' | 'pile';

export type JokerId = 'hint' | 'swap' | 'double' | 'bet';
