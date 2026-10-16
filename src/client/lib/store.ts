/**
 * Persistance locale (navigateur) : paramètres, progression solo, statistiques,
 * historique et questions vues récemment.
 *
 * Aucune donnée personnelle n'est envoyée au serveur. Le stockage peut être
 * indisponible (navigation privée, cookies bloqués) : toutes les lectures et
 * écritures sont protégées et le jeu fonctionne alors avec des valeurs en mémoire.
 */
import { useSyncExternalStore } from 'react';
import type { CategoryId, Difficulty } from '../../shared/types.ts';
import type { SoloMode } from '../../shared/solo.ts';

const KEY = 'magnitude:v1';

export type MotionPref = 'auto' | 'reduce' | 'full';

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  ui: number;
  muted: boolean;
  motion: MotionPref;
  fastAnimations: boolean;
  playerName: string;
  avatar: number;
  haptics: boolean;
  highContrast: boolean;
}

export interface CategoryStat {
  n: number;
  piles: number;
  /** somme des écarts normalisés (plafonnés à 10) */
  err: number;
}

export interface SoloRecord {
  best: number;
  stars: number;
  plays: number;
}

export interface Stats {
  solo: {
    sessions: number;
    questions: number;
    piles: number;
    exact: number;
    errSum: number;
    timeSum: number;
    bestStreak: number;
    bestSurvival: number;
  };
  versus: { games: number; wins: number; losses: number; draws: number; piles: number; estimates: number; contests: number; contestsRight: number };
  online: { games: number; wins: number; losses: number; draws: number };
  categories: Partial<Record<CategoryId, CategoryStat>>;
  /** Évolution : précision moyenne (0-100) des 30 dernières sessions solo. */
  trend: { at: number; accuracy: number; mode: SoloMode }[];
}

export interface HistoryEntry {
  at: number;
  kind: 'solo' | 'ia' | 'local' | 'online';
  label: string;
  detail: string;
  outcome: 'win' | 'loss' | 'draw' | 'score';
  score?: number;
}

export interface Progress {
  xp: number;
  records: Partial<Record<`${SoloMode}:${Difficulty}`, SoloRecord>>;
  achievements: Record<string, number>;
}

export interface PersistedState {
  settings: Settings;
  stats: Stats;
  progress: Progress;
  history: HistoryEntry[];
  recent: string[];
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.85,
  music: 0.7,
  sfx: 0.9,
  ui: 0.6,
  muted: false,
  motion: 'auto',
  fastAnimations: false,
  playerName: '',
  avatar: 0,
  haptics: true,
  highContrast: false,
};

const blank = (): PersistedState => ({
  settings: { ...DEFAULT_SETTINGS },
  stats: {
    solo: { sessions: 0, questions: 0, piles: 0, exact: 0, errSum: 0, timeSum: 0, bestStreak: 0, bestSurvival: 0 },
    versus: { games: 0, wins: 0, losses: 0, draws: 0, piles: 0, estimates: 0, contests: 0, contestsRight: 0 },
    online: { games: 0, wins: 0, losses: 0, draws: 0 },
    categories: {},
    trend: [],
  },
  progress: { xp: 0, records: {}, achievements: {} },
  history: [],
  recent: [],
  onboarded: false,
});

function read(): PersistedState {
  const base = blank();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw) as Partial<PersistedState>;
    return {
      settings: { ...base.settings, ...(data.settings ?? {}) },
      stats: {
        solo: { ...base.stats.solo, ...(data.stats?.solo ?? {}) },
        versus: { ...base.stats.versus, ...(data.stats?.versus ?? {}) },
        online: { ...base.stats.online, ...(data.stats?.online ?? {}) },
        categories: data.stats?.categories ?? {},
        trend: Array.isArray(data.stats?.trend) ? data.stats.trend.slice(-30) : [],
      },
      progress: {
        xp: Number(data.progress?.xp) || 0,
        records: data.progress?.records ?? {},
        achievements: data.progress?.achievements ?? {},
      },
      history: Array.isArray(data.history) ? data.history.slice(0, 40) : [],
      recent: Array.isArray(data.recent) ? data.recent.filter((x) => typeof x === 'string').slice(0, 220) : [],
      onboarded: Boolean(data.onboarded),
    };
  } catch {
    return base;
  }
}

let state: PersistedState = typeof window === 'undefined' ? blank() : read();
let storageOk = true;
const listeners = new Set<() => void>();

function persist(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export function getState(): PersistedState {
  return state;
}

export function isStorageAvailable(): boolean {
  return storageOk;
}

export function update(fn: (draft: PersistedState) => void): void {
  const next = structuredClone(state);
  fn(next);
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePersisted<T>(select: (s: PersistedState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}

export function setSettings(patch: Partial<Settings>): void {
  update((d) => {
    d.settings = { ...d.settings, ...patch };
  });
}

/** Mémorise les questions vues (du plus récent au plus ancien) pour éviter les répétitions. */
export function rememberQuestions(ids: string[]): void {
  update((d) => {
    const set = new Set(ids);
    d.recent = [...ids.slice().reverse(), ...d.recent.filter((x) => !set.has(x))].slice(0, 220);
  });
}

export function pushHistory(e: HistoryEntry): void {
  update((d) => {
    d.history = [e, ...d.history].slice(0, 40);
  });
}

export function resetAll(): void {
  const keepSettings = state.settings;
  state = { ...blank(), settings: keepSettings, onboarded: true };
  persist();
  listeners.forEach((l) => l());
}

/* ------------------------------------------------------------------ */
/* Rangs de progression                                                 */
/* ------------------------------------------------------------------ */

export const RANKS = [
  { xp: 0, name: 'Recrue' },
  { xp: 600, name: 'Estimateur' },
  { xp: 1800, name: 'Analyste' },
  { xp: 4000, name: 'Expert' },
  { xp: 8000, name: 'Virtuose' },
  { xp: 15000, name: 'Légende' },
] as const;

export function rankOf(xp: number): { index: number; name: string; next: number | null; floor: number } {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= (RANKS[i] as { xp: number }).xp) index = i;
  const cur = RANKS[index] as { xp: number; name: string };
  const nxt = RANKS[index + 1] as { xp: number } | undefined;
  return { index, name: cur.name, next: nxt ? nxt.xp : null, floor: cur.xp };
}

/** Difficultés solo débloquées par le rang (toutes restent jouables en versus). */
export function soloUnlocked(d: Difficulty, xp: number): boolean {
  const need: Record<Difficulty, number> = { decouverte: 0, normal: 0, expert: 1, maitre: 3 };
  return rankOf(xp).index >= need[d];
}
