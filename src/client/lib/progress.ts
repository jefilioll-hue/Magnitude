/**
 * Enregistrement des résultats : statistiques, records, expérience et succès.
 * Les statistiques ne proviennent QUE de parties réellement jouées sur cet appareil.
 */
import type { SoloState } from '../../shared/solo.ts';
import { soloStars, SOLO_MODES } from '../../shared/solo.ts';
import type { VersusState } from '../../shared/engine.ts';
import { summarize } from '../../shared/engine.ts';
import type { QuestionBank } from '../../shared/deck.ts';
import type { TeamId } from '../../shared/types.ts';
import { DIFFICULTY_PROFILES } from '../../shared/config.ts';
import { getState, pushHistory, rememberQuestions, update, type PersistedState } from './store.ts';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  check: (s: PersistedState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-pile', title: 'Dans le mille', desc: 'Réussir un premier Tout Pile.', check: (s) => s.stats.solo.piles + s.stats.versus.piles >= 1 },
  { id: 'exact', title: 'Au chiffre près', desc: 'Donner la valeur exacte, sans le moindre écart.', check: (s) => s.stats.solo.exact >= 1 },
  { id: 'piles-25', title: 'Métronome', desc: 'Cumuler 25 Tout Pile en solo.', check: (s) => s.stats.solo.piles >= 25 },
  { id: 'streak-5', title: 'Sur la lancée', desc: 'Enchaîner 5 bonnes réponses en solo.', check: (s) => s.stats.solo.bestStreak >= 5 },
  { id: 'streak-10', title: 'Inarrêtable', desc: 'Enchaîner 10 bonnes réponses en solo.', check: (s) => s.stats.solo.bestStreak >= 10 },
  { id: 'survive-15', title: 'Survivant', desc: 'Atteindre 15 questions en Survie.', check: (s) => s.stats.solo.bestSurvival >= 15 },
  { id: 'survive-30', title: 'Increvable', desc: 'Atteindre 30 questions en Survie.', check: (s) => s.stats.solo.bestSurvival >= 30 },
  { id: 'three-stars', title: 'Trois étoiles', desc: 'Obtenir 3 étoiles sur une Série.', check: (s) => Object.values(s.progress.records).some((r) => (r?.stars ?? 0) >= 3) },
  { id: 'master-star', title: 'Maître estimateur', desc: 'Obtenir au moins une étoile en difficulté Maître.', check: (s) => Object.entries(s.progress.records).some(([k, r]) => k.endsWith(':maitre') && (r?.stars ?? 0) >= 1) },
  { id: 'all-cats', title: 'Touche-à-tout', desc: 'Répondre à des questions de toutes les catégories.', check: (s) => Object.keys(s.stats.categories).length >= 17 },
  { id: 'q-200', title: 'Encyclopédiste', desc: 'Répondre à 200 questions en solo.', check: (s) => s.stats.solo.questions >= 200 },
  { id: 'beat-ai', title: 'Plus fort que la machine', desc: 'Battre l’ordinateur.', check: (s) => Boolean(s.progress.achievements['beat-ai']) },
  { id: 'beat-oracle', title: 'Oracle détrôné', desc: 'Battre l’ordinateur en niveau Expert.', check: (s) => Boolean(s.progress.achievements['beat-oracle']) },
  { id: 'online-win', title: 'Champion du salon', desc: 'Gagner une partie en ligne.', check: (s) => s.stats.online.wins >= 1 },
  { id: 'contest-10', title: 'Flair infaillible', desc: 'Réussir 10 contestations.', check: (s) => s.stats.versus.contestsRight >= 10 },
  { id: 'rank-3', title: 'Expert confirmé', desc: 'Atteindre le rang Expert.', check: (s) => s.progress.xp >= 4000 },
];

/** Applique les succès nouvellement obtenus ; renvoie leurs titres. */
export function checkAchievements(): Achievement[] {
  const s = getState();
  const fresh = ACHIEVEMENTS.filter((a) => !s.progress.achievements[a.id] && a.check(s));
  if (fresh.length) {
    update((d) => {
      for (const a of fresh) d.progress.achievements[a.id] = Date.now();
    });
  }
  return fresh;
}

export interface SoloOutcome {
  xp: number;
  stars: number;
  newRecord: boolean;
  accuracy: number;
  achievements: Achievement[];
}

/** Précision 0-100 d'après les écarts normalisés (100 = toujours Tout Pile). */
export function accuracyOf(errors: (number | null)[]): number {
  if (errors.length === 0) return 0;
  const pts = errors.map((e) => (e === null ? 0 : Math.max(0, 100 - Math.min(e, 10) * 10)));
  return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
}

export function recordSolo(s: SoloState, bank: QuestionBank): SoloOutcome {
  const stars = soloStars(s);
  const key = `${s.mode}:${s.difficulty}` as const;
  const prev = getState().progress.records[key];
  const newRecord = !prev || s.score > prev.best;
  const xp = Math.round(s.score / 4) + stars * 60 + (s.mode === 'survie' ? s.answers.length * 8 : 0);
  const accuracy = accuracyOf(s.answers.map((a) => a.error));
  update((d) => {
    const st = d.stats.solo;
    st.sessions += 1;
    for (const a of s.answers) {
      st.questions += 1;
      if (a.grade === 'pile') st.piles += 1;
      if (a.exact) st.exact += 1;
      st.errSum += Math.min(a.error ?? 10, 10);
      st.timeSum += a.timeMs;
      const q = bank.byId.get(a.questionId);
      if (q) {
        const c = d.stats.categories[q.cat] ?? { n: 0, piles: 0, err: 0 };
        c.n += 1;
        if (a.grade === 'pile') c.piles += 1;
        c.err += Math.min(a.error ?? 10, 10);
        d.stats.categories[q.cat] = c;
      }
    }
    st.bestStreak = Math.max(st.bestStreak, s.bestStreak);
    if (s.mode === 'survie') st.bestSurvival = Math.max(st.bestSurvival, s.answers.length);
    const r = d.progress.records[key] ?? { best: 0, stars: 0, plays: 0 };
    r.best = Math.max(r.best, s.score);
    r.stars = Math.max(r.stars, stars);
    r.plays += 1;
    d.progress.records[key] = r;
    d.progress.xp += xp;
    d.stats.trend = [...d.stats.trend, { at: Date.now(), accuracy, mode: s.mode }].slice(-30);
  });
  rememberQuestions(s.answers.map((a) => a.questionId));
  pushHistory({
    at: Date.now(),
    kind: 'solo',
    label: `Solo ${SOLO_MODES[s.mode].label}`,
    detail: `${DIFFICULTY_PROFILES[s.difficulty].label}, ${s.answers.length} questions`,
    outcome: 'score',
    score: s.score,
  });
  return { xp, stars, newRecord, accuracy, achievements: checkAchievements() };
}

export function recordVersus(
  s: VersusState,
  kind: 'ia' | 'local' | 'online',
  myTeam: TeamId | null,
  extra: { aiLevel?: string } = {},
): Achievement[] {
  const sum = summarize(s);
  const outcome: 'win' | 'loss' | 'draw' =
    s.winner === 'draw' || s.winner === null ? 'draw' : myTeam === null ? 'draw' : s.winner === myTeam ? 'win' : 'loss';
  update((d) => {
    const v = d.stats.versus;
    v.games += 1;
    const mine = myTeam ? [myTeam] : (['A', 'B'] as TeamId[]);
    for (const t of mine) {
      v.piles += sum[t].inZone;
      v.estimates += sum[t].estimates;
      v.contests += sum[t].contests;
      v.contestsRight += sum[t].contestsRight;
    }
    if (myTeam) {
      if (outcome === 'win') v.wins += 1;
      else if (outcome === 'loss') v.losses += 1;
      else v.draws += 1;
    }
    if (kind === 'online') {
      d.stats.online.games += 1;
      if (outcome === 'win') d.stats.online.wins += 1;
      else if (outcome === 'loss') d.stats.online.losses += 1;
      else d.stats.online.draws += 1;
    }
    if (kind === 'ia' && outcome === 'win') {
      d.progress.achievements['beat-ai'] = d.progress.achievements['beat-ai'] ?? Date.now();
      if (extra.aiLevel === 'expert') d.progress.achievements['beat-oracle'] = d.progress.achievements['beat-oracle'] ?? Date.now();
    }
    d.progress.xp += 80 + (outcome === 'win' ? 120 : 0) + sum[myTeam ?? 'A'].inZone * 30;
  });
  rememberQuestions(s.history.map((r) => r.questionId));
  const label = kind === 'ia' ? 'Défi contre l’ordinateur' : kind === 'local' ? 'Duel sur un écran' : 'Partie en ligne';
  pushHistory({
    at: Date.now(),
    kind,
    label,
    detail: `${s.teams.A.name} ${s.teams.A.score} – ${s.teams.B.score} ${s.teams.B.name}`,
    outcome: kind === 'local' ? 'draw' : outcome,
  });
  return checkAchievements();
}
