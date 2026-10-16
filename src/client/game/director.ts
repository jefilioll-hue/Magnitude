/**
 * Régisseur de partie : traduit les changements d'état en mise en scène
 * (musique adaptative, jingles, lumières du plateau, vibrations).
 *
 * Il ne dépend que de la vue (VersusView) : la mise en scène est donc identique
 * en local et en ligne, et chaque joueur entend les sons de SON point de vue
 * (« bien joué » pour son équipe, « raté » quand elle perd des points).
 */
import { useEffect, useRef } from 'react';
import type { VersusView } from '../../shared/engine.ts';
import type { TeamId } from '../../shared/types.ts';
import { audio } from '../audio/engine.ts';
import { stage } from '../stage/Stage.tsx';
import { haptic } from '../ui/kit.tsx';

export const SUSPENSE_MS = { normal: 2600, rapide: 1400 } as const;

export function suspenseMs(v: Pick<VersusView, 'settings'>): number {
  return v.settings.animSpeed === 'rapide' ? SUSPENSE_MS.rapide : SUSPENSE_MS.normal;
}

/** Sons d'issue d'une manche selon le point de vue. */
export function outcomeSound(v: VersusView, me: TeamId | null): 'st_pile' | 'st_pile_shared' | 'st_good' | 'st_bad' {
  const r = v.last;
  if (!r) return 'st_good';
  if (r.outcome === 'pile') return me === null || me === r.estimator ? 'st_pile' : 'st_bad';
  if (r.outcome === 'pile_shared') return 'st_pile_shared';
  if (me === null) return 'st_good';
  return r.points[me] > 0 ? 'st_good' : 'st_bad';
}

export function useVersusDirector(view: VersusView | null, me: TeamId | null, now: number): void {
  const prev = useRef<{ phase: string; step: number; round: number } | null>(null);
  const timers = useRef<number[]>([]);
  const lastTick = useRef(-1);

  // Transitions de phase
  useEffect(() => {
    if (!view) return;
    const p = prev.current;
    const changed = !p || p.step !== view.step || p.phase !== view.phase;
    if (!changed) return;
    const enteringPhase = !p || p.phase !== view.phase || p.round !== view.round;
    prev.current = { phase: view.phase, step: view.step, round: view.round };
    const lightFor = (t: TeamId, strong: number) => stage.set({ a: t === 'A' ? strong : 0.45, b: t === 'B' ? strong : 0.45 });

    if (!enteringPhase && view.phase !== 'estimate') return;
    switch (view.phase) {
      case 'intro':
        void audio.music('think');
        audio.tension(0);
        audio.play(view.multiplier > 1 ? 'st_prime' : 'st_round');
        lightFor(view.estimator, 1.25);
        stage.set({ energy: view.multiplier > 1 ? 1 : 0.6 });
        if (view.multiplier > 1) stage.flash('gold', 0.6);
        break;
      case 'estimate':
        if (p && p.phase === 'estimate' && view.swapped) audio.play('st_swap');
        lightFor(view.estimator, 1.2);
        stage.set({ energy: 0.5 });
        break;
      case 'contest':
        audio.play('st_lock', { duck: false });
        window.setTimeout(() => audio.play('st_contest'), 260);
        audio.tension(0.75);
        lightFor(view.estimator === 'A' ? 'B' : 'A', 1.25);
        stage.set({ energy: 0.8 });
        haptic(20);
        break;
      case 'reveal': {
        audio.tension(0.0, 0.3);
        const dur = suspenseMs(view);
        audio.play(dur > 2000 ? 'st_suspense' : 'st_suspense_short');
        stage.set({ a: 0.35, b: 0.35, energy: 1 });
        const t = window.setTimeout(() => {
          const s = outcomeSound(view, me);
          audio.play(s);
          const r = view.last;
          if (r?.inZone) stage.flash('gold', 1);
          else if (me && r && r.points[me] === 0 && (r.points.A > 0 || r.points.B > 0)) stage.flash('red', 0.5);
          else stage.flash(r && r.points.A > r.points.B ? 'a' : 'b', 0.7);
          stage.set({ a: 0.8, b: 0.8, energy: 0.5 });
          haptic(r?.inZone ? [30, 40, 60] : 25);
        }, dur);
        timers.current.push(t);
        break;
      }
      case 'tb_intro':
        void audio.music('think');
        audio.play('st_tiebreak');
        audio.tension(0.9);
        stage.set({ a: 1.1, b: 1.1, energy: 1 });
        break;
      case 'tb_estimate':
        audio.tension(0.9);
        break;
      case 'tb_reveal': {
        audio.tension(0, 0.3);
        audio.play('st_suspense');
        const t = window.setTimeout(() => {
          audio.play('st_pile_shared');
          stage.flash('gold', 0.8);
        }, SUSPENSE_MS.normal);
        timers.current.push(t);
        break;
      }
      case 'over': {
        const won = view.winner !== 'draw' && view.winner !== null && (me === null || view.winner === me);
        const draw = view.winner === 'draw';
        void audio.music(draw || won ? 'results' : null, 0.6);
        audio.play(draw ? 'st_draw' : won ? 'st_victory' : 'st_defeat');
        if (view.winner === 'A' || view.winner === 'B') {
          stage.set(view.winner === 'A' ? { a: 1.6, b: 0.3, energy: 1 } : { a: 0.3, b: 1.6, energy: 1 });
          stage.flash(view.winner === 'A' ? 'a' : 'b', 1);
        }
        if (!won && !draw) window.setTimeout(() => void audio.music('results', 2), 5200);
        break;
      }
    }
  }, [view, me]);

  // Pression du chrono : la couche « pression » monte, tic-tac des 5 dernières secondes
  useEffect(() => {
    if (!view || view.deadline === null) return;
    if (view.phase !== 'estimate' && view.phase !== 'contest' && view.phase !== 'tb_estimate') return;
    const total = view.deadline - view.phaseStartedAt;
    const left = view.deadline - now;
    const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 1;
    if (view.phase === 'estimate') audio.tension(0.1 + 0.9 * Math.pow(1 - frac, 2.2), 2);
    const secs = Math.ceil(left / 1000);
    if (secs <= 5 && secs >= 1 && secs !== lastTick.current) {
      lastTick.current = secs;
      audio.play(secs <= 3 ? 'ui_tick_urgent' : 'ui_tick');
      if (secs <= 3) haptic(10);
    }
    if (left <= 0 && lastTick.current !== 0) {
      lastTick.current = 0;
      audio.play('st_timeup');
    }
    if (secs > 5) lastTick.current = -1;
  }, [view, now]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stage.calm();
    },
    [],
  );
}
