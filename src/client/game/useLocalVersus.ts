/**
 * Partie locale (duel sur un écran, ou défi contre l'ordinateur).
 * Le moteur partagé tourne dans le navigateur ; l'IA joue via les mêmes actions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameSettings } from '../../shared/config.ts';
import { createVersus, reduce, versusView, type VersusState } from '../../shared/engine.ts';
import { aiContest, aiEstimate, aiThinkMs, aiTiebreak, AI_PROFILES, type AiLevel } from '../../shared/ai.ts';
import { derive } from '../../shared/rng.ts';
import { otherTeam, type TeamId } from '../../shared/types.ts';
import { requireQuestion } from '../../shared/deck.ts';
import { BANK } from '../lib/bank.ts';
import { getState } from '../lib/store.ts';
import type { DriverAction, VersusDriver } from './driver.ts';

export interface LocalConfig {
  kind: 'local' | 'ia';
  settings: GameSettings;
  aiLevel?: AiLevel;
  seed?: number;
}

const AI_TEAM: TeamId = 'B';

export function useLocalVersus(cfg: LocalConfig, onQuit: () => void, onFinished: (s: VersusState) => void): VersusDriver {
  const [game, setGame] = useState<VersusState>(() =>
    createVersus(BANK, cfg.settings, cfg.seed ?? (Date.now() & 0x7fffffff), Date.now(), getState().recent),
  );
  const gameRef = useRef(game);
  gameRef.current = game;
  const [aiThinking, setAiThinking] = useState<TeamId | null>(null);
  const finished = useRef(false);

  const dispatch = useCallback((a: DriverAction | { type: 'tick' }) => {
    const s = gameRef.current;
    const r = reduce(s, { ...a, now: Date.now() } as Parameters<typeof reduce>[1], BANK);
    if (r.ok) {
      gameRef.current = r.state;
      setGame(r.state);
    }
    return r.ok;
  }, []);

  // Horloge : applique les échéances.
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = gameRef.current;
      if (s.deadline !== null && Date.now() >= s.deadline) dispatch({ type: 'tick' });
    }, 150);
    return () => window.clearInterval(id);
  }, [dispatch]);

  // Fin de partie
  useEffect(() => {
    if (game.phase === 'over' && !finished.current) {
      finished.current = true;
      onFinished(game);
    }
  }, [game, onFinished]);

  // Ordinateur
  useEffect(() => {
    if (cfg.kind !== 'ia') return;
    const level = cfg.aiLevel ?? 'intermediaire';
    const s = game;
    const rng = derive(s.seed, 'ai', s.step);
    const fast = s.settings.animSpeed === 'rapide';
    let timer = 0;
    const later = (ms: number, fn: () => void) => {
      setAiThinking(AI_TEAM);
      timer = window.setTimeout(() => {
        setAiThinking(null);
        fn();
      }, ms);
    };
    if (s.phase === 'estimate' && s.estimator === AI_TEAM && s.questionId) {
      const q = requireQuestion(BANK, s.questionId);
      const jokers = s.teams[AI_TEAM].jokers;
      const d = aiEstimate(q, level, rng, { hint: s.hint, jokers: { hint: s.hintUsed ? 0 : jokers.hint, bet: jokers.bet } });
      if (d.wantsHint) later(aiThinkMs(level, rng, fast) * 0.4, () => dispatch({ type: 'joker', team: AI_TEAM, joker: 'hint' }));
      else later(aiThinkMs(level, rng, fast), () => dispatch({ type: 'estimate', team: AI_TEAM, value: d.value, bet: d.bet }));
    } else if (s.phase === 'contest' && otherTeam(s.estimator) === AI_TEAM && s.questionId && s.estimate !== null) {
      const q = requireQuestion(BANK, s.questionId);
      const d = aiContest(q, level, rng, {
        estimate: s.estimate,
        tolerance: s.tolerance,
        settings: s.settings,
        me: AI_TEAM,
        multiplier: s.multiplier,
        bet: s.bet,
        jokers: { double: s.teams[AI_TEAM].jokers.double },
      });
      later(aiThinkMs(level, rng, fast) * 0.6, () => dispatch({ type: 'contest', team: AI_TEAM, call: d.call, double: d.double }));
    } else if (s.phase === 'tb_estimate' && s.tb && s.tb.estimates[AI_TEAM] === undefined) {
      const q = requireQuestion(BANK, s.tb.questionId);
      later(aiThinkMs(level, rng, fast), () => dispatch({ type: 'tb_estimate', team: AI_TEAM, value: aiTiebreak(q, level, rng) }));
    }
    return () => {
      window.clearTimeout(timer);
      setAiThinking(null);
    };
  }, [game.step, game.phase, cfg.kind, cfg.aiLevel, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const view = useMemo(() => versusView(game, BANK, 'all'), [game]);
  const aiName = AI_PROFILES[cfg.aiLevel ?? 'intermediaire'].persona.split(',')[0] ?? 'L’ordinateur';

  return {
    kind: cfg.kind,
    view,
    clockOffset: 0,
    myTeam: cfg.kind === 'ia' ? 'A' : null,
    canAct: (t) => (cfg.kind === 'local' ? true : t !== AI_TEAM),
    waitingLabel: (t) => (cfg.kind === 'ia' && t === AI_TEAM ? `${aiName} réfléchit…` : `${game.teams[t].name} réfléchit…`),
    act: (a) => {
      dispatch(a);
    },
    canAdvance: true,
    aiThinking,
    onQuit,
    onReplay: undefined,
  };
}
