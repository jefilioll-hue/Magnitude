import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSolo, reduceSolo, GRADE_LABEL, SOLO_MODES, SURVIVAL_MAX_LIVES, soloStars, type SoloMode, type SoloState } from '../../shared/solo.ts';
import { DIFFICULTY_PROFILES } from '../../shared/config.ts';
import { CATEGORIES, CATEGORY_BY_ID } from '../../shared/categories.ts';
import { effectiveTolerance, formatNumber, relativeErrorPct } from '../../shared/numbers.ts';
import { toleranceLabel } from '../../shared/engine.ts';
import { toPublicQuestion, DIFFICULTIES, type CategoryId, type Difficulty } from '../../shared/types.ts';
import { requireQuestion } from '../../shared/deck.ts';
import { BANK } from '../lib/bank.ts';
import { getState, rankOf, soloUnlocked, usePersisted } from '../lib/store.ts';
import { recordSolo, type SoloOutcome } from '../lib/progress.ts';
import { audio } from '../audio/engine.ts';
import { stage } from '../stage/Stage.tsx';
import { Button, Choice, Confetti, Counter, EstimateInput, Stars, TimerRing, haptic, useNow } from '../ui/kit.tsx';
import { CategoryIcon, Icon } from '../ui/icons.tsx';
import { Ruler } from '../ui/Ruler.tsx';
import { QuestionCard } from './VersusGame.tsx';
import { ScreenHeader, SoundToggle, useNav, type Route } from './common.tsx';

const MODE_ICON: Record<SoloMode, React.ReactNode> = { serie: <Icon.target />, rapide: <Icon.bolt />, survie: <Icon.heart /> };

export function SoloHub() {
  const nav = useNav();
  const xp = usePersisted((s) => s.progress.xp);
  const records = usePersisted((s) => s.progress.records);
  const [mode, setMode] = useState<SoloMode>('serie');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [cats, setCats] = useState<CategoryId[]>([]);
  const rank = rankOf(xp);
  const toggleCat = (c: CategoryId) => setCats((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));
  const rec = records[`${mode}:${difficulty}`];

  return (
    <div className="screen">
      <ScreenHeader title="Jouer en solo" />
      <p className="lede">Estimez seul : plus vous êtes précis, plus vous marquez. Les bonnes réponses enchaînées font grimper un multiplicateur jusqu’à ×2.</p>

      <div className="mode-cards" role="radiogroup" aria-label="Mode solo">
        {(Object.keys(SOLO_MODES) as SoloMode[]).map((m) => {
          const r = records[`${m}:${difficulty}`];
          return (
            <button key={m} type="button" role="radio" aria-checked={mode === m} className={`mode-card ${mode === m ? 'is-on' : ''}`} onClick={() => { audio.play('ui_select'); setMode(m); }}>
              <span className="mode-card__icon">{MODE_ICON[m]}</span>
              <span className="mode-card__title">{SOLO_MODES[m].label}</span>
              <span className="mode-card__desc">{SOLO_MODES[m].tagline}</span>
              <span className="mode-card__rec">
                {r ? (
                  <>
                    <Stars n={r.stars} size={16} /> <span className="num">{r.best}</span> pts
                  </>
                ) : (
                  <span className="muted small">Pas encore joué</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid-2">
        <section className="panel stack">
          <Choice
            label="Difficulté"
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTIES.map((d) => ({
              value: d,
              label: DIFFICULTY_PROFILES[d].label,
              disabled: !soloUnlocked(d, xp),
              hint: soloUnlocked(d, xp) ? DIFFICULTY_PROFILES[d].tagline : d === 'expert' ? 'Débloqué au rang Estimateur' : 'Débloqué au rang Expert',
            }))}
          />
          <p className="muted small">{DIFFICULTY_PROFILES[difficulty].tagline}</p>
          {!soloUnlocked('maitre', xp) ? (
            <p className="muted small">
              <Icon.lock className="inline-icon" /> Votre rang : {rank.name}. Les difficultés Expert et Maître se débloquent en progressant. Elles restent toujours jouables en duel et en ligne.
            </p>
          ) : null}
          <div className="field">
            <span>Catégories {cats.length ? `(${cats.length})` : '(toutes)'}</span>
            <div className="segmented">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={cats.includes(c.id)} onClick={() => toggleCat(c.id)}>
                  <CategoryIcon id={c.id} /> {c.label}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="panel stack solo-launch">
          <h2>{SOLO_MODES[mode].label}, {DIFFICULTY_PROFILES[difficulty].label}</h2>
          <ul className="facts">
            <li>{mode === 'survie' ? 'Questions illimitées, de plus en plus pointues' : `${SOLO_MODES[mode].count} questions`}</li>
            <li>{(SOLO_MODES[mode].seconds ?? DIFFICULTY_PROFILES[difficulty].estimateSeconds)} secondes par question</li>
            <li>{mode === 'survie' ? 'Trois vies : un écart « Loin » ou « Raté » en coûte une, un Tout Pile en rend une' : mode === 'rapide' ? 'Bonus de vitesse : 3 points par seconde restante' : 'Une à trois étoiles selon votre score'}</li>
          </ul>
          <p className="muted small">Record : {rec ? <span className="num">{rec.best} pts</span> : 'aucun pour l’instant'}</p>
          <Button variant="primary" big block icon={<Icon.play />} onClick={() => nav.go({ name: 'solo-play', mode, difficulty, categories: cats, key: Date.now() })}>
            Commencer
          </Button>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const REVEAL_MS = 1500;

export function SoloPlay({ route }: { route: Extract<Route, { name: 'solo-play' }> }) {
  const nav = useNav();
  const [state, setState] = useState<SoloState>(() =>
    createSolo(BANK, { mode: route.mode, difficulty: route.difficulty, categories: route.categories, seed: Date.now() & 0x7fffffff, avoid: getState().recent }, Date.now()),
  );
  const ref = useRef(state);
  ref.current = state;
  const [outcome, setOutcome] = useState<SoloOutcome | null>(null);
  const now = useNow(0, 10);
  const lastTick = useRef(-1);

  const dispatch = useCallback((a: Parameters<typeof reduceSolo>[1]) => {
    const r = reduceSolo(ref.current, a, BANK);
    if (r.ok) {
      ref.current = r.state;
      setState(r.state);
    }
    return r;
  }, []);

  // Musique et chrono
  useEffect(() => {
    void audio.music('think');
    stage.set({ a: 1.1, b: 0.6, energy: 0.5 });
    return () => stage.calm();
  }, []);
  useEffect(() => {
    if (state.phase !== 'question' || state.deadline === null) return;
    const total = state.deadline - state.phaseStartedAt;
    const left = state.deadline - now;
    const frac = total > 0 ? Math.min(1, Math.max(0, left / total)) : 1;
    audio.tension(0.1 + 0.9 * Math.pow(1 - frac, 2.2), 2);
    const secs = Math.ceil(left / 1000);
    if (secs <= 5 && secs >= 1 && secs !== lastTick.current) {
      lastTick.current = secs;
      audio.play(secs <= 3 ? 'ui_tick_urgent' : 'ui_tick');
    }
    if (secs > 5) lastTick.current = -1;
    if (left <= 0) {
      const r = dispatch({ type: 'tick', now: Date.now() });
      if (r.ok) audio.play('st_timeup');
    }
  }, [now, state.phase, state.deadline, state.phaseStartedAt, dispatch]);

  // Sons de révélation
  const answered = state.answers.length;
  useEffect(() => {
    if (answered === 0 || state.phase !== 'reveal') return;
    audio.tension(0, 0.3);
    audio.play('st_suspense_short');
    const a = state.answers[answered - 1];
    const t = window.setTimeout(() => {
      if (!a) return;
      if (a.grade === 'pile') {
        audio.play('st_pile');
        stage.flash('gold', 1);
        haptic([30, 40, 60]);
      } else if (a.grade === 'proche' || a.grade === 'correct') {
        audio.play('st_good');
        stage.flash('a', 0.5);
      } else {
        audio.play('st_bad');
        stage.flash('red', 0.35);
      }
      if (a.streak >= 3 && (a.grade === 'pile' || a.grade === 'proche')) window.setTimeout(() => audio.play('st_streak'), 900);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [answered]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fin de session
  useEffect(() => {
    if (state.phase === 'over' && !outcome) {
      const o = recordSolo(state, BANK);
      setOutcome(o);
      const st = soloStars(state);
      void audio.music('results', 1);
      audio.play(st >= 2 ? 'st_victory' : st === 1 ? 'st_pile_shared' : 'st_defeat');
      stage.set({ a: 1.5, b: 0.6, energy: 1 });
      if (st >= 2) stage.flash('a', 1);
    }
  }, [state, outcome]);

  const next = () => dispatch({ type: 'next', now: Date.now() });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && ref.current.phase === 'reveal' && Date.now() - ref.current.phaseStartedAt > REVEAL_MS) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (state.phase === 'over') {
    return <SoloResults state={state} outcome={outcome} onReplay={() => nav.replace({ ...route, key: Date.now() })} />;
  }

  const q = requireQuestion(BANK, state.questionId);
  const pq = toPublicQuestion(q);
  const factor = DIFFICULTY_PROFILES[state.difficulty].tolFactor;
  const tol = effectiveTolerance(q, factor);
  const last = state.answers[state.answers.length - 1];
  const revealed = state.phase === 'reveal' && now - state.phaseStartedAt >= 1400;
  const totalQ = route.mode === 'survie' ? null : SOLO_MODES[route.mode].count;

  return (
    <div className="screen screen--wide game solo">
      <header className="topbar game__top">
        <Button variant="ghost" icon={<Icon.door />} aria-label="Arrêter la session" sound="back" onClick={() => dispatch({ type: 'quit', now: Date.now() })} />
        <div className="game__round">
          <strong>
            Question <span className="num">{Math.min(state.index + (state.phase === 'question' ? 1 : 0), 999)}</span>
            {totalQ ? <span className="muted"> / {totalQ}</span> : null}
          </strong>
          <span className="badge">{SOLO_MODES[route.mode].label}</span>
          <span className="badge">{DIFFICULTY_PROFILES[route.difficulty].label}</span>
        </div>
        <div className="topbar__spacer" />
        <SoundToggle />
      </header>

      <section className="solo-hud" aria-label="Votre session">
        <div className="hud-cell">
          <span className="muted small">Score</span>
          <Counter value={state.score} duration={900} className="hud-cell__value" tick />
        </div>
        <div className="hud-cell">
          <span className="muted small">Série</span>
          <span className="hud-cell__value num">{state.streak}</span>
          {state.streak >= 1 ? <span className="badge badge--prime">×{(1 + 0.25 * Math.min(state.streak, 4)).toFixed(2).replace('.', ',')}</span> : null}
        </div>
        {state.lives !== null ? (
          <div className="hud-cell" aria-label={`${state.lives} vie${state.lives > 1 ? 's' : ''}`}>
            <span className="muted small">Vies</span>
            <span className="lives">
              {Array.from({ length: SURVIVAL_MAX_LIVES }, (_, i) => (
                <Icon.heart key={i} className={i < (state.lives ?? 0) ? 'life is-on' : 'life'} />
              ))}
            </span>
          </div>
        ) : null}
      </section>

      <main className="game__main">
        {state.phase === 'question' ? (
          <div className="phase phase--estimate">
            <div className="phase__row">
              <QuestionCard q={pq} tol={toleranceLabel(q, factor, tol)} />
              <TimerRing deadline={state.deadline} total={state.deadline ? state.deadline - state.phaseStartedAt : 0} now={now} />
            </div>
            <div className="panel action team-a">
              <EstimateInput key={pq.id} question={pq} submitLabel="Valider" onSubmit={(value) => { haptic(15); audio.play('st_lock', { duck: false }); dispatch({ type: 'answer', value, now: Date.now() }); }} />
            </div>
          </div>
        ) : last ? (
          <div className="phase phase--reveal">
            <QuestionCard q={pq} tol={toleranceLabel(q, factor, tol)} compact />
            <div className="reveal">
              <div className="reveal__values">
                <div className="reveal__est team-a">
                  <span className="muted small">Votre estimation</span>
                  <span className="num">{last.estimate === null ? '—' : formatNumber(last.estimate, pq.decimals, pq.kind)}</span>
                </div>
                <div className={`reveal__answer ${revealed ? 'is-on' : ''}`}>
                  <span className="muted small">Réponse</span>
                  {revealed ? (
                    <Counter value={q.answer} decimals={pq.decimals} kind={pq.kind} from={last.estimate ?? q.answer / 2} duration={900} className="reveal__number" />
                  ) : (
                    <span className="reveal__number reveal__number--hidden num">? ? ?</span>
                  )}
                  {pq.unit ? <span className="reveal__unit">{pq.unit}</span> : null}
                </div>
              </div>
              <Ruler estimate={last.estimate} tolerance={last.tolerance} answer={q.answer} revealed={revealed} kind={pq.kind} decimals={pq.decimals} unit={pq.unit} teamClass="team-a" />
              {revealed ? (
                <div className={`verdict verdict--${last.grade === 'pile' ? 'pile' : last.grade === 'proche' || last.grade === 'correct' ? 'good' : 'bad'}`}>
                  <div className="verdict__title">{GRADE_LABEL[last.grade]}{last.exact ? ', valeur exacte !' : ''}</div>
                  <div className="verdict__detail">
                    {last.estimate !== null && q.answer !== 0 ? `Écart de ${formatNumber(relativeErrorPct(last.estimate, q.answer), 1)} %.` : 'Aucune réponse.'}
                    {state.lives !== null && (last.grade === 'loin' || last.grade === 'rate' || last.grade === 'temps') ? ' Une vie perdue.' : ''}
                    {state.lives !== null && last.grade === 'pile' && (last.lives ?? 0) > (state.answers[state.answers.length - 2]?.lives ?? SURVIVAL_MAX_LIVES) ? ' Une vie regagnée.' : ''}
                  </div>
                  <div className="verdict__points">
                    <span className="points team-a">+<span className="num">{last.points}</span> pts</span>
                  </div>
                </div>
              ) : null}
              {revealed ? (
                <div className="explain">
                  <p>{q.explain}</p>
                  <p className="muted small">Source : {q.source}{q.asOf ? `, donnée ${q.asOf}` : ''}.</p>
                </div>
              ) : null}
            </div>
            <div className="row end">
              {revealed ? (
                <Button variant="primary" big onClick={next} autoFocus>
                  {(route.mode !== 'survie' && state.index >= state.deck.length) || (state.lives !== null && state.lives <= 0) ? 'Voir le bilan' : 'Question suivante'}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function SoloResults({ state, outcome, onReplay }: { state: SoloState; outcome: SoloOutcome | null; onReplay: () => void }) {
  const nav = useNav();
  const stars = soloStars(state);
  const piles = state.answers.filter((a) => a.grade === 'pile').length;
  const byCat = useMemo(() => {
    const m = new Map<CategoryId, number>();
    for (const a of state.answers) {
      const q = BANK.byId.get(a.questionId);
      if (q && (a.grade === 'pile' || a.grade === 'proche')) m.set(q.cat, (m.get(q.cat) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [state.answers]);
  return (
    <div className="screen screen--wide">
      <Confetti colors={['#ffb547', '#ffd27a', '#fff1c2', '#43e0f0']} active={stars >= 2} />
      <ScreenHeader title="Bilan de la session" onBack={() => nav.back()} />
      <section className="panel results-hero">
        <div className="results-hero__score">
          <span className="muted">Score</span>
          <Counter value={state.score} from={0} duration={1800} className="results-hero__value" tick />
          <Stars n={stars} size={34} />
          {outcome?.newRecord && state.score > 0 ? <span className="badge badge--prime">Nouveau record</span> : null}
        </div>
        <dl className="results-hero__stats">
          <div><dt>Précision</dt><dd className="num">{outcome?.accuracy ?? 0} %</dd></div>
          <div><dt>Tout Pile</dt><dd className="num">{piles}/{state.answers.length}</dd></div>
          <div><dt>Meilleure série</dt><dd className="num">{state.bestStreak}</dd></div>
          <div><dt>Expérience gagnée</dt><dd className="num">+{outcome?.xp ?? 0} XP</dd></div>
        </dl>
        {byCat ? <p className="muted">Votre point fort cette fois : {CATEGORY_BY_ID[byCat[0]].label}.</p> : null}
      </section>
      {outcome && outcome.achievements.length ? (
        <section className="panel">
          <h2>Succès débloqués</h2>
          <ul className="achievements">
            {outcome.achievements.map((a) => (
              <li key={a.id} className="achievement is-on"><Icon.starFill /> <strong>{a.title}</strong> <span className="muted">{a.desc}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="panel panel--flush">
        <table className="recap">
          <caption className="sr-only">Détail des réponses</caption>
          <thead>
            <tr><th scope="col">Question</th><th scope="col">Vous</th><th scope="col">Réponse</th><th scope="col">Note</th><th scope="col">Points</th></tr>
          </thead>
          <tbody>
            {state.answers.map((a, i) => {
              const q = BANK.byId.get(a.questionId);
              if (!q) return null;
              return (
                <tr key={i} className={`grade-${a.grade}`}>
                  <td>{q.text}</td>
                  <td className="num">{a.estimate === null ? '—' : formatNumber(a.estimate, q.decimals ?? 0, q.kind)}</td>
                  <td className="num">{formatNumber(q.answer, q.decimals ?? 0, q.kind)} <span className="muted">{q.unit}</span></td>
                  <td><span className={`grade grade--${a.grade}`}>{GRADE_LABEL[a.grade]}</span></td>
                  <td className="num">{a.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Button variant="primary" big icon={<Icon.refresh />} onClick={onReplay}>Rejouer</Button>
        <Button variant="ghost" big onClick={() => nav.home()}>Menu principal</Button>
      </div>
    </div>
  );
}
