import type { CategoryId, Question, QuestionLevel, Tolerance, ValueKind } from '../types.ts';

/**
 * Ligne compacte de la base :
 * [id, niveau, texte, réponse, unité, nature, tolérance, explication, source, options]
 */
export type Row = [
  id: string,
  level: QuestionLevel,
  text: string,
  answer: number,
  unit: string,
  kind: ValueKind,
  tol: Tolerance,
  explain: string,
  source: string,
  extra?: Partial<Pick<Question, 'decimals' | 'minTol' | 'signed' | 'asOf' | 'tags'>>,
];

export function make(cat: CategoryId, rows: Row[]): Question[] {
  return rows.map(([id, level, text, answer, unit, kind, tol, explain, source, extra]) => {
    const q: Question = { id, text, cat, level, answer, unit, kind, tol, explain, source };
    if (extra) Object.assign(q, extra);
    return q;
  });
}

/* Raccourcis de tolérance */
export const abs = (n: number): Tolerance => ({ abs: n });
export const rel = (n: number): Tolerance => ({ rel: n });
