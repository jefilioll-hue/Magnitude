import type { Question } from '../types.ts';
import { hasAtMostDecimals } from '../numbers.ts';
import culture from './culture.ts';
import histoire from './histoire.ts';
import geo from './geo.ts';
import sciences from './sciences.ts';
import nature from './nature.ts';
import espace from './espace.ts';
import sport from './sport.ts';
import football from './football.ts';
import cinema from './cinema.ts';
import musique from './musique.ts';
import tech from './tech.ts';
import jeuxvideo from './jeuxvideo.ts';
import gastro from './gastro.ts';
import quotidien from './quotidien.ts';
import records from './records.ts';
import insolite from './insolite.ts';
import eco from './eco.ts';

export const QUESTIONS: readonly Question[] = [
  ...culture, ...histoire, ...geo, ...sciences, ...nature, ...espace, ...sport, ...football, ...cinema,
  ...musique, ...tech, ...jeuxvideo, ...gastro, ...quotidien, ...records, ...insolite, ...eco,
];

/** Normalise un texte pour détecter les questions quasi identiques. */
export function fingerprint(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .sort()
    .join(' ');
}

/**
 * Contrôle d'intégrité de la base. Renvoie la liste des problèmes (vide si tout va bien).
 * Exécuté par les tests et au démarrage du serveur.
 */
export function auditQuestions(qs: readonly Question[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const prints = new Map<string, string>();
  for (const q of qs) {
    const where = `[${q.id}]`;
    if (ids.has(q.id)) problems.push(`${where} identifiant en double`);
    ids.add(q.id);
    if (q.text.trim().length < 15 || !q.text.trim().endsWith('?')) problems.push(`${where} texte invalide`);
    if (!Number.isFinite(q.answer)) problems.push(`${where} réponse non numérique`);
    if (q.answer < 0 && !q.signed) problems.push(`${where} réponse négative sans « signed »`);
    if (!hasAtMostDecimals(q.answer, q.decimals ?? 0)) problems.push(`${where} la réponse a plus de décimales que la saisie n'en permet`);
    if ('abs' in q.tol && q.tol.abs < 0) problems.push(`${where} tolérance négative`);
    if ('rel' in q.tol && (q.tol.rel <= 0 || q.tol.rel > 0.5)) problems.push(`${where} tolérance relative hors bornes`);
    if (q.kind === 'year' && 'rel' in q.tol) problems.push(`${where} une année doit avoir une tolérance absolue`);
    if (q.explain.trim().length < 20) problems.push(`${where} explication trop courte`);
    if (q.source.trim().length < 4) problems.push(`${where} source manquante`);
    const fp = fingerprint(q.text);
    const twin = prints.get(fp);
    if (twin) problems.push(`${where} formulation quasi identique à ${twin}`);
    prints.set(fp, q.id);
  }
  return problems;
}
