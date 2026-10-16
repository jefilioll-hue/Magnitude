/**
 * Écran de partie à deux équipes (duel local, défi contre l'ordinateur, en ligne).
 */
import { useEffect, useMemo, useState } from 'react';
import type { RoundResult, VersusView } from '../../shared/engine.ts';
import { JOKER_INFO, DIFFICULTY_PROFILES } from '../../shared/config.ts';
import { CATEGORY_BY_ID } from '../../shared/categories.ts';
import { describeTolerance, formatNumber } from '../../shared/numbers.ts';
import { otherTeam, type ContestCall, type PublicQuestion, type TeamId } from '../../shared/types.ts';
import { Button, Confetti, Counter, EstimateInput, Modal, TimerRing, haptic, useNow } from '../ui/kit.tsx';
import { Avatar, CategoryIcon, Icon } from '../ui/icons.tsx';
import { Ruler } from '../ui/Ruler.tsx';
import { suspenseMs, useVersusDirector } from '../game/director.ts';
import type { VersusDriver } from '../game/driver.ts';
import { audio, ui } from '../audio/engine.ts';
import { SoundToggle } from './common.tsx';

const teamClass = (t: TeamId) => (t === 'A' ? 'team-a' : 'team-b');

export function VersusGame({ driver }: { driver: VersusDriver }) {
  const v = driver.view;
  const now = useNow(driver.clockOffset, 12);
  useVersusDirector(v, driver.myTeam, now);
  const [confirmQuit, setConfirmQuit] = useState(false);

  return (
    <div className={`screen screen--wide game phase-${v.phase}`}>
      <header className="topbar game__top">
        <Button variant="ghost" icon={<Icon.door />} aria-label="Quitter la partie" sound="back" onClick={() => (v.phase === 'over' ? driver.onQuit() : setConfirmQuit(true))} />
        <div className="game__round">
          {v.phase === 'over' ? (
            <strong>Partie terminée</strong>
          ) : v.phase.startsWith('tb') ? (
            <strong>Départage</strong>
          ) : (
            <strong>
              Manche <span className="num">{Math.max(1, v.round)}</span>
              <span className="muted"> / {v.settings.maxRounds}</span>
            </strong>
          )}
          {v.multiplier > 1 && !v.phase.startsWith('tb') ? <span className="badge badge--prime">Manche Prime ×{v.multiplier}</span> : null}
        </div>
        <div className="topbar__spacer" />
        {driver.connection && driver.connection !== 'online' ? (
          <span className="badge badge--warn" role="status">
            <Icon.wifiOff /> {driver.connection === 'reconnecting' ? 'Reconnexion…' : 'Hors ligne'}
          </span>
        ) : null}
        <SoundToggle />
      </header>

      <Scoreboard v={v} driver={driver} />

      <main className="game__main" aria-live="polite">
        {v.phase === 'intro' ? <RoundIntro v={v} driver={driver} /> : null}
        {v.phase === 'estimate' ? <EstimatePhase v={v} driver={driver} now={now} /> : null}
        {v.phase === 'contest' ? <ContestPhase v={v} driver={driver} now={now} /> : null}
        {v.phase === 'reveal' ? <RevealPhase v={v} driver={driver} now={now} /> : null}
        {v.phase === 'tb_intro' || v.phase === 'tb_estimate' || v.phase === 'tb_reveal' ? <TiebreakPhase v={v} driver={driver} now={now} /> : null}
        {v.phase === 'over' ? <GameOver v={v} driver={driver} /> : null}
      </main>

      {confirmQuit ? (
        <Modal
          title="Quitter la partie ?"
          onClose={() => setConfirmQuit(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirmQuit(false)}>Continuer à jouer</Button>
              <Button variant="danger" onClick={driver.onQuit}>Quitter</Button>
            </>
          }
        >
          <p className="muted">
            {driver.kind === 'online'
              ? 'Vous quitterez le salon. Votre équipe continuera sans vous.'
              : 'La partie en cours sera perdue.'}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Scoreboard({ v, driver }: { v: VersusView; driver: VersusDriver }) {
  const target = v.settings.targetScore;
  return (
    <section className="scoreboard" aria-label="Scores">
      {(['A', 'B'] as TeamId[]).map((t) => {
        const team = v.teams[t];
        const playing = v.phase === 'estimate' || v.phase === 'intro' ? v.estimator === t : v.phase === 'contest' ? v.estimator !== t : false;
        const members = driver.participants?.filter((p) => p.team === t) ?? [];
        const role = v.phase === 'intro' || v.phase === 'estimate' || v.phase === 'contest' || v.phase === 'reveal' ? (v.estimator === t ? 'Estime' : 'Conteste') : null;
        return (
          <div key={t} className={`plate ${teamClass(t)} ${playing ? 'is-playing' : ''} ${v.winner === t ? 'is-winner' : ''} ${driver.myTeam === t ? 'is-mine' : ''}`}>
            <div className="plate__head">
              <span className="plate__name">{team.name}</span>
              {role ? <span className="plate__role">{role}</span> : null}
            </div>
            <div className="plate__score">
              <Counter value={team.score} duration={1100} tick />
              {target > 0 ? <span className="plate__target">/ {target}</span> : null}
            </div>
            {target > 0 ? (
              <div className="plate__bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (team.score / target) * 100)}%` }} />
              </div>
            ) : null}
            <div className="plate__foot">
              <div className="plate__jokers" aria-label="Jokers restants">
                {(['hint', 'swap', 'bet', 'double'] as const).map((j) =>
                  v.settings.jokers[j] > 0 ? (
                    <span key={j} className={`joker-pip ${team.jokers[j] > 0 ? '' : 'is-spent'}`} title={`${JOKER_INFO[j].label} : ${team.jokers[j]} restant(s)`}>
                      {j === 'hint' ? <Icon.hint /> : j === 'swap' ? <Icon.swap /> : j === 'bet' ? <Icon.bet /> : <Icon.double />}
                      {team.jokers[j] > 1 ? <small>{team.jokers[j]}</small> : null}
                    </span>
                  ) : null,
                )}
              </div>
              {members.length > 0 ? (
                <div className="plate__members">
                  {members.slice(0, 6).map((m) => (
                    <span key={m.id} className={`member ${m.connected ? '' : 'is-away'}`} title={`${m.name}${m.connected ? '' : ' (déconnecté)'}`}>
                      <Avatar index={m.avatar} size={26} />
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function RoundIntro({ v, driver }: { v: VersusView; driver: VersusDriver }) {
  const q = v.question;
  const cat = q ? CATEGORY_BY_ID[q.cat] : null;
  return (
    <div className={`intro ${teamClass(v.estimator)}`}>
      {v.multiplier > 1 ? <div className="intro__prime">Manche Prime : points ×{v.multiplier}</div> : null}
      <div className="intro__round num">Manche {v.round}</div>
      <div className="intro__team">
        <span className="intro__dot" /> {v.teams[v.estimator].name} estime
      </div>
      {cat ? (
        <div className="intro__cat" style={{ ['--hue' as string]: cat.hue }}>
          <CategoryIcon id={cat.id} />
          <span>{cat.label}</span>
        </div>
      ) : null}
      {driver.canAdvance ? (
        <Button variant="ghost" onClick={() => driver.act({ type: 'advance' })}>Passer l’introduction</Button>
      ) : null}
    </div>
  );
}

export function QuestionCard({ q, tol, compact }: { q: PublicQuestion; tol: string | null; compact?: boolean }) {
  const cat = CATEGORY_BY_ID[q.cat];
  return (
    <article className={`qcard ${compact ? 'qcard--compact' : ''}`} style={{ ['--hue' as string]: cat.hue }}>
      <div className="qcard__meta">
        <span className="qcard__cat">
          <CategoryIcon id={q.cat} /> {cat.label}
        </span>
        <span className="qcard__level" aria-label={`Niveau ${q.level} sur 4`}>
          {[1, 2, 3, 4].map((l) => (
            <i key={l} className={l <= q.level ? 'on' : ''} />
          ))}
        </span>
      </div>
      <h2 className="qcard__text">{q.text}</h2>
      <div className="qcard__foot">
        {tol ? (
          <span className="qcard__tol">
            <Icon.target /> Zone Tout Pile : {tol}
          </span>
        ) : null}
        {q.asOf ? <span className="muted small">Donnée : {q.asOf}</span> : null}
      </div>
    </article>
  );
}

function Waiting({ label, team, ai }: { label: string; team: TeamId; ai?: boolean }) {
  return (
    <div className={`waiting ${teamClass(team)}`} role="status">
      <div className="waiting__bars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <span>{label}</span>
      {ai ? <Icon.robot className="waiting__ai" /> : null}
    </div>
  );
}

function EstimatePhase({ v, driver, now }: { v: VersusView; driver: VersusDriver; now: number }) {
  const q = v.question as PublicQuestion;
  const E = v.estimator;
  const mine = driver.canAct(E);
  const [bet, setBet] = useState(false);
  const team = v.teams[E];
  useEffect(() => setBet(false), [q.id]);
  const total = v.deadline !== null ? v.deadline - v.phaseStartedAt : 0;
  return (
    <div className="phase phase--estimate">
      <div className="phase__row">
        <QuestionCard q={q} tol={v.toleranceLabel} />
        <TimerRing deadline={v.deadline} total={total} now={now} label="Temps d’estimation" />
      </div>
      {v.hint ? (
        <div className="hint" role="note">
          <Icon.hint /> La réponse est comprise entre <strong className="num">{formatNumber(v.hint.lo, q.decimals, q.kind)}</strong> et{' '}
          <strong className="num">{formatNumber(v.hint.hi, q.decimals, q.kind)}</strong>
          {q.unit ? ` ${q.unit}` : ''}.
        </div>
      ) : v.hintUsed ? (
        <div className="hint hint--other">
          <Icon.hint /> {team.name} a utilisé son indice.
        </div>
      ) : null}
      {mine ? (
        <div className={`panel action ${teamClass(E)}`}>
          <EstimateInput
            key={q.id}
            question={q}
            onDraft={driver.sendDraft}
            onSubmit={(value) => {
              haptic(15);
              driver.act({ type: 'estimate', team: E, value, bet });
            }}
            disabled={driver.pending}
            extra={
              <div className="jokers">
                {v.settings.jokers.hint > 0 ? (
                  <Button
                    variant="ghost"
                    icon={<Icon.hint />}
                    disabled={team.jokers.hint <= 0 || v.hintUsed}
                    title={JOKER_INFO.hint.desc}
                    onClick={() => {
                      audio.play('st_hint');
                      driver.act({ type: 'joker', team: E, joker: 'hint' });
                    }}
                  >
                    Indice <small className="num">{team.jokers.hint}</small>
                  </Button>
                ) : null}
                {v.settings.jokers.swap > 0 ? (
                  <Button
                    variant="ghost"
                    icon={<Icon.swap />}
                    disabled={team.jokers.swap <= 0 || v.swapped}
                    title={JOKER_INFO.swap.desc}
                    onClick={() => driver.act({ type: 'joker', team: E, joker: 'swap' })}
                  >
                    Échange <small className="num">{team.jokers.swap}</small>
                  </Button>
                ) : null}
                {v.settings.jokers.bet > 0 ? (
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={bet}
                    disabled={team.jokers.bet <= 0}
                    title={JOKER_INFO.bet.desc}
                    onClick={() => {
                      if (!bet) audio.play('st_bet');
                      else ui('toggle_off');
                      setBet(!bet);
                    }}
                  >
                    <Icon.bet /> Pari Tout Pile <small className="num">{team.jokers.bet}</small>
                  </button>
                ) : null}
              </div>
            }
          />
          {driver.drafts && driver.drafts.length > 0 ? (
            <div className="drafts" aria-label="Propositions de l’équipe">
              {driver.drafts.map((d) => (
                <span key={d.name} className="chip">
                  {d.name} propose <strong className="num">{d.text}</strong>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <Waiting label={driver.waitingLabel(E)} team={E} ai={driver.aiThinking === E} />
      )}
    </div>
  );
}

function Board({ v, q }: { v: VersusView; q: PublicQuestion }) {
  if (v.estimate === null) return null;
  return (
    <div className={`board ${teamClass(v.estimator)}`} aria-label={`Estimation de ${v.teams[v.estimator].name} : ${formatNumber(v.estimate, q.decimals, q.kind)} ${q.unit}`}>
      <div className="board__label">
        Estimation de {v.teams[v.estimator].name}
        {v.bet ? <span className="badge badge--bet"><Icon.bet /> Pari Tout Pile</span> : null}
        {v.doubled ? <span className="badge badge--double"><Icon.double /> Quitte ou double</span> : null}
      </div>
      <div className="board__value">
        <span className="num">{formatNumber(v.estimate, q.decimals, q.kind)}</span>
        {q.unit ? <span className="board__unit">{q.unit}</span> : null}
      </div>
    </div>
  );
}

const CALLS: { call: ContestCall; label: string; sub: string; key: string }[] = [
  { call: 'plus', label: 'Plus', sub: 'La réponse est au-dessus', key: '↑' },
  { call: 'pile', label: 'Tout Pile', sub: 'C’est dans la zone', key: 'Espace' },
  { call: 'moins', label: 'Moins', sub: 'La réponse est en dessous', key: '↓' },
];

function ContestPhase({ v, driver, now }: { v: VersusView; driver: VersusDriver; now: number }) {
  const q = v.question as PublicQuestion;
  const C = otherTeam(v.estimator);
  const mine = driver.canAct(C);
  const [double, setDouble] = useState(false);
  const total = v.deadline !== null ? v.deadline - v.phaseStartedAt : 0;
  const calls = CALLS.filter((c) => c.call !== 'pile' || v.settings.allowPileCall);
  const send = (call: ContestCall) => {
    ui('select');
    haptic(20);
    driver.act({ type: 'contest', team: C, call, double });
  };
  useEffect(() => {
    if (!mine) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'p') send('plus');
      else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'm') send('moins');
      else if ((e.key === ' ' || e.key.toLowerCase() === 't') && v.settings.allowPileCall) {
        e.preventDefault();
        send('pile');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="phase phase--contest">
      <div className="phase__row">
        <QuestionCard q={q} tol={v.toleranceLabel} compact />
        <TimerRing deadline={v.deadline} total={total} now={now} label="Temps de contestation" />
      </div>
      <Board v={v} q={q} />
      {mine ? (
        <div className={`panel action contest ${teamClass(C)}`}>
          <p className="contest__prompt">
            {v.teams[C].name}, la vraie valeur est-elle plus grande, plus petite, ou l’estimation est-elle Tout Pile ?
          </p>
          <div className="contest__buttons">
            {calls.map((c) => (
              <button key={c.call} type="button" className={`call call--${c.call}`} onClick={() => send(c.call)} disabled={driver.pending}>
                {c.call === 'plus' ? <Icon.up /> : c.call === 'moins' ? <Icon.down /> : <Icon.target />}
                <span className="call__label">{c.label}</span>
                <span className="call__sub">{c.sub}</span>
                <kbd className="call__key">{c.key}</kbd>
              </button>
            ))}
          </div>
          {v.settings.jokers.double > 0 ? (
            <button
              type="button"
              className="chip contest__double"
              aria-pressed={double}
              disabled={v.teams[C].jokers.double <= 0}
              onClick={() => {
                if (!double) audio.play('st_double');
                else ui('toggle_off');
                setDouble(!double);
              }}
              title={JOKER_INFO.double.desc}
            >
              <Icon.double /> Quitte ou double ({v.teams[C].jokers.double})
            </button>
          ) : null}
        </div>
      ) : (
        <Waiting label={driver.waitingLabel(C)} team={C} ai={driver.aiThinking === C} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function verdictOf(r: RoundResult, v: Pick<VersusView, 'teams'>, me: TeamId | null = null): { title: string; detail: string; tone: 'pile' | 'good' | 'bad' } {
  const base = verdictBase(r, v);
  // La couleur du verdict suit le point de vue du joueur : vert si son équipe marque, rouge sinon.
  if (me === null) return base.tone === 'pile' ? base : { ...base, tone: 'good' };
  if (base.tone === 'pile') return r.points[me] > 0 ? base : { ...base, tone: 'bad' };
  return { ...base, tone: r.points[me] > 0 ? 'good' : 'bad' };
}

function verdictBase(r: RoundResult, v: Pick<VersusView, 'teams'>): { title: string; detail: string; tone: 'pile' | 'good' | 'bad' } {
  const E = v.teams[r.estimator].name;
  const C = v.teams[otherTeam(r.estimator)].name;
  const dir = r.direction === 'plus' ? 'plus' : 'moins';
  switch (r.outcome) {
    case 'pile':
      return { title: r.exact ? 'Pile exact !' : 'Tout Pile !', detail: `${E} tombe dans la zone${r.exact ? ', au chiffre près' : ''}.`, tone: 'pile' };
    case 'pile_shared':
      return { title: 'Tout Pile, bien vu !', detail: `${E} est dans la zone et ${C} l’avait senti.`, tone: 'pile' };
    case 'contest_right':
      return { title: `C’était ${dir} !`, detail: `${C} a vu juste.`, tone: 'good' };
    case 'contest_wrong':
      return { title: `C’était ${dir} !`, detail: `${C} s’est trompé de sens.`, tone: 'bad' };
    case 'pile_call_wrong':
      return { title: 'Pas tout pile !', detail: `C’était ${dir} : ${C} a pris un risque de trop.`, tone: 'bad' };
    case 'no_estimate':
      return { title: 'Temps écoulé', detail: `${E} n’a pas verrouillé d’estimation.`, tone: 'bad' };
    case 'no_contest':
      return { title: 'Temps écoulé', detail: `${C} n’a rien annoncé.`, tone: 'bad' };
  }
}

function RevealPhase({ v, driver, now }: { v: VersusView; driver: VersusDriver; now: number }) {
  const r = v.last;
  const q = r?.question;
  const elapsed = now - v.phaseStartedAt;
  const revealed = elapsed >= suspenseMs(v);
  const showExplain = elapsed >= suspenseMs(v) + 900;
  if (!r || !q) return null;
  const verdict = verdictOf(r, v, driver.myTeam);
  const pts = (['A', 'B'] as TeamId[]).filter((t) => r.points[t] > 0);
  return (
    <div className="phase phase--reveal">
      <QuestionCard q={q} tol={v.toleranceLabel} compact />
      <div className="reveal">
        <div className="reveal__values">
          <div className={`reveal__est ${teamClass(r.estimator)}`}>
            <span className="muted small">Estimation</span>
            <span className="num">{r.estimate === null ? '—' : formatNumber(r.estimate, q.decimals, q.kind)}</span>
            {r.call ? (
              <span className="reveal__call">
                {v.teams[otherTeam(r.estimator)].name} : {r.call === 'plus' ? 'Plus' : r.call === 'moins' ? 'Moins' : 'Tout Pile'}
              </span>
            ) : null}
          </div>
          <div className={`reveal__answer ${revealed ? 'is-on' : ''}`}>
            <span className="muted small">Réponse</span>
            {revealed ? (
              <Counter value={q.answer} decimals={q.decimals} kind={q.kind} from={r.estimate ?? q.answer * 0.5} duration={1000} className="reveal__number" />
            ) : (
              <span className="reveal__number reveal__number--hidden num" aria-label="Suspense">
                ? ? ?
              </span>
            )}
            {q.unit ? <span className="reveal__unit">{q.unit}</span> : null}
          </div>
        </div>
        <Ruler
          estimate={r.estimate}
          tolerance={r.tolerance}
          answer={q.answer}
          revealed={revealed}
          kind={q.kind}
          decimals={q.decimals}
          unit={q.unit}
          teamClass={teamClass(r.estimator)}
        />
        {revealed ? (
          <div className={`verdict verdict--${verdict.tone}`}>
            <div className="verdict__title">{verdict.title}</div>
            <div className="verdict__detail">{verdict.detail}</div>
            <div className="verdict__points">
              {pts.length === 0 ? <span className="muted">Aucun point</span> : null}
              {pts.map((t) => (
                <span key={t} className={`points ${teamClass(t)}`}>
                  +<span className="num">{r.points[t]}</span> {v.teams[t].name}
                </span>
              ))}
              {r.multiplier > 1 ? (
                <span className="badge badge--prime">
                  {[v.multiplier > 1 || r.multiplier > (r.doubled ? v.settings.scoring.doubleMultiplier : 1) ? 'Manche Prime' : null, r.doubled ? 'Quitte ou double' : null, r.bet ? 'Pari' : null].filter(Boolean).join(' + ')} ×{r.multiplier}
                </span>
              ) : r.bet ? <span className="badge badge--bet">{r.inZone ? 'Pari réussi' : 'Pari manqué'}</span> : null}
            </div>
          </div>
        ) : null}
        {showExplain ? (
          <div className="explain">
            <p>{q.explain}</p>
            <p className="muted small">
              Zone Tout Pile : {describeTolerance(q, r.tolerance)} ({DIFFICULTY_PROFILES[v.settings.difficulty].label}). Source : {q.source}
              {q.asOf ? `, donnée ${q.asOf}` : ''}.
            </p>
          </div>
        ) : null}
      </div>
      <div className="row end reveal__next">
        {v.deadline ? <span className="muted small">Manche suivante dans <span className="num">{Math.max(0, Math.ceil((v.deadline - now) / 1000))}</span> s</span> : null}
        {driver.canAdvance && revealed ? (
          <Button variant="primary" onClick={() => driver.act({ type: 'advance' })}>Continuer</Button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TiebreakPhase({ v, driver, now }: { v: VersusView; driver: VersusDriver; now: number }) {
  const tb = v.tb;
  const [handoff, setHandoff] = useState<TeamId | null>(null);
  if (!tb) return null;
  const q = tb.question;
  const total = v.deadline !== null ? v.deadline - v.phaseStartedAt : 0;
  if (v.phase === 'tb_intro') {
    return (
      <div className="intro intro--tb">
        <div className="intro__round num">Départage</div>
        <div className="intro__team">Égalité ! Une question, deux estimations secrètes : la plus proche l’emporte.</div>
        {driver.canAdvance ? <Button variant="ghost" onClick={() => driver.act({ type: 'advance' })}>Commencer</Button> : null}
      </div>
    );
  }
  if (v.phase === 'tb_estimate') {
    const teams = (['A', 'B'] as TeamId[]).filter((t) => driver.canAct(t) && !tb.locked[t]);
    const shared = driver.myTeam === null && driver.kind === 'local';
    const current = teams[0];
    return (
      <div className="phase phase--estimate">
        <div className="phase__row">
          <QuestionCard q={q} tol={null} />
          <TimerRing deadline={v.deadline} total={total} now={now} />
        </div>
        {current && (!shared || handoff === current) ? (
          <div className={`panel action ${teamClass(current)}`}>
            <h3>{v.teams[current].name}, votre estimation secrète</h3>
            <EstimateInput
              key={q.id}
              question={q}
              submitLabel="Verrouiller en secret"
              onSubmit={(value) => {
                driver.act({ type: 'tb_estimate', team: current, value });
                setHandoff(null);
              }}
            />
          </div>
        ) : current && shared ? (
          <div className="panel action handoff">
            <p>Passez l’appareil à l’équipe {v.teams[current].name}. L’estimation adverse reste cachée.</p>
            <Button variant="primary" big onClick={() => setHandoff(current)}>{v.teams[current].name} est prête</Button>
          </div>
        ) : (
          <div className="row" style={{ justifyContent: 'center', gap: 24 }}>
            {(['A', 'B'] as TeamId[]).map((t) => (
              <div key={t} className={`waiting ${teamClass(t)}`}>
                {tb.locked[t] ? <Icon.lock /> : <div className="spinner" />}
                <span>{v.teams[t].name} : {tb.locked[t] ? 'verrouillé' : 'réfléchit…'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  const res = tb.results[tb.results.length - 1];
  if (!res) return null;
  const rq = res.question;
  const revealed = now - v.phaseStartedAt >= 2600;
  return (
    <div className="phase phase--reveal">
      <QuestionCard q={rq} tol={null} compact />
      <div className="reveal">
        <div className="reveal__values">
          {(['A', 'B'] as TeamId[]).map((t) => (
            <div key={t} className={`reveal__est ${teamClass(t)}`}>
              <span className="muted small">{v.teams[t].name}</span>
              <span className="num">{res.estimates[t] === null ? '—' : formatNumber(res.estimates[t] as number, rq.decimals, rq.kind)}</span>
            </div>
          ))}
          <div className={`reveal__answer ${revealed ? 'is-on' : ''}`}>
            <span className="muted small">Réponse</span>
            {revealed ? <Counter value={rq.answer} decimals={rq.decimals} kind={rq.kind} className="reveal__number" /> : <span className="reveal__number reveal__number--hidden num">? ? ?</span>}
          </div>
        </div>
        <Ruler
          estimate={null}
          tolerance={0}
          answer={rq.answer}
          revealed={revealed}
          kind={rq.kind}
          decimals={rq.decimals}
          unit={rq.unit}
          teamClass="team-a"
          marks={(['A', 'B'] as TeamId[])
            .filter((t) => res.estimates[t] !== null)
            .map((t) => ({ value: res.estimates[t] as number, className: teamClass(t), label: v.teams[t].name }))}
        />
        {revealed ? (
          <div className={`verdict verdict--${res.winner ? 'pile' : 'good'}`}>
            <div className="verdict__title">{res.winner ? `${v.teams[res.winner].name} l’emporte !` : 'Encore égalité !'}</div>
            <div className="verdict__detail">{res.winner ? 'L’estimation la plus proche gagne la partie.' : 'Les deux estimations sont à la même distance.'}</div>
          </div>
        ) : null}
      </div>
      {driver.canAdvance && revealed ? (
        <div className="row end">
          <Button variant="primary" onClick={() => driver.act({ type: 'advance' })}>Continuer</Button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GameOver({ v, driver }: { v: VersusView; driver: VersusDriver }) {
  const w = v.winner;
  const mineWon = w !== 'draw' && w !== null && driver.myTeam !== null && w === driver.myTeam;
  const title =
    w === 'draw' ? 'Match nul' : w === null ? 'Partie terminée' : driver.myTeam === null ? `${v.teams[w].name} gagne !` : mineWon ? 'Victoire !' : 'Défaite';
  const reason =
    v.endReason === 'target' ? `Premier à ${v.settings.targetScore} point${v.settings.targetScore > 1 ? 's' : ''}.` :
    v.endReason === 'rounds' ? `Meilleur score après ${v.round} manches.` :
    v.endReason === 'tiebreak' ? 'Décidé au départage.' :
    v.endReason === 'forfeit' ? 'L’équipe adverse a abandonné.' :
    v.endReason === 'exhausted' ? 'Plus de questions disponibles pour ces catégories.' : 'Impossible de départager les équipes.';
  const stats = useMemo(() => {
    const out = { A: { pile: 0, exact: 0, right: 0, contests: 0 }, B: { pile: 0, exact: 0, right: 0, contests: 0 } };
    for (const r of v.history) {
      const E = out[r.estimator];
      const C = out[otherTeam(r.estimator)];
      if (r.inZone) E.pile++;
      if (r.exact) E.exact++;
      if (r.call && r.estimate !== null) {
        C.contests++;
        if (r.outcome === 'contest_right' || r.outcome === 'pile_shared') C.right++;
      }
    }
    return out;
  }, [v.history]);
  const best = useMemo(() => {
    let b: RoundResult | null = null;
    let be = Infinity;
    for (const r of v.history) {
      if (r.estimate === null || r.answer === 0) continue;
      const e = Math.abs(r.estimate - r.answer) / Math.abs(r.answer);
      if (e < be) {
        be = e;
        b = r;
      }
    }
    return b;
  }, [v.history]);
  const colors = w === 'A' ? ['#ffb547', '#ffd27a', '#fff1c2', '#e6862a'] : w === 'B' ? ['#43e0f0', '#9cf3fb', '#fff1c2', '#1aa6d6'] : ['#fff1c2', '#a9b0e0'];
  return (
    <div className={`over ${w === 'A' || w === 'B' ? teamClass(w) : ''} ${driver.myTeam !== null && w !== null && w !== 'draw' && !mineWon ? 'over--lose' : ''}`}>
      <Confetti colors={colors} active={w !== null && w !== 'draw' && (driver.myTeam === null || mineWon)} />
      <div className="over__title">{title}</div>
      <p className="over__reason">{reason}</p>
      <div className="over__scores">
        {(['A', 'B'] as TeamId[]).map((t) => (
          <div key={t} className={`over__team ${teamClass(t)} ${w === t ? 'is-winner' : ''}`}>
            {w === t ? <Icon.crown className="over__crown" /> : null}
            <span className="over__name">{v.teams[t].name}</span>
            <Counter value={v.teams[t].score} from={0} duration={1600} className="over__score" />
            <dl className="over__stats">
              <div><dt>Tout Pile</dt><dd className="num">{stats[t].pile}</dd></div>
              <div><dt>Exacts</dt><dd className="num">{stats[t].exact}</dd></div>
              <div><dt>Contestations réussies</dt><dd className="num">{stats[t].right}/{stats[t].contests}</dd></div>
            </dl>
          </div>
        ))}
      </div>
      {best && Math.abs((best.estimate as number) - best.answer) / Math.abs(best.answer) < 0.5 ? (
        <p className="muted">
          Meilleure estimation : {v.teams[best.estimator].name}, à{' '}
          {formatNumber((Math.abs((best.estimate as number) - best.answer) / Math.abs(best.answer)) * 100, 1)} % de la réponse.
        </p>
      ) : null}
      <div className="row" style={{ justifyContent: 'center' }}>
        {driver.onReplay ? (
          <Button variant="primary" big icon={<Icon.refresh />} onClick={driver.onReplay}>Rejouer</Button>
        ) : null}
        <Button variant="ghost" big onClick={driver.onQuit}>{driver.kind === 'online' ? 'Retour au salon' : 'Menu principal'}</Button>
      </div>
    </div>
  );
}
