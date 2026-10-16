import { useState } from 'react';
import { CATEGORIES } from '../../shared/categories.ts';
import { SOLO_MODES, type SoloMode } from '../../shared/solo.ts';
import { DIFFICULTY_PROFILES } from '../../shared/config.ts';
import { DIFFICULTIES } from '../../shared/types.ts';
import { ACHIEVEMENTS } from '../lib/progress.ts';
import { rankOf, resetAll, usePersisted } from '../lib/store.ts';
import { Button, Modal, Stars } from '../ui/kit.tsx';
import { CategoryIcon, Icon } from '../ui/icons.tsx';
import { ScreenHeader, useNav } from './common.tsx';

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function StatsScreen() {
  const nav = useNav();
  const st = usePersisted((s) => s.stats);
  const progress = usePersisted((s) => s.progress);
  const history = usePersisted((s) => s.history);
  const [confirm, setConfirm] = useState(false);
  const solo = st.solo;
  const avgErr = solo.questions ? solo.errSum / solo.questions : 0;
  const accuracy = solo.questions ? Math.max(0, Math.round(100 - Math.min(avgErr, 10) * 10)) : 0;
  const rank = rankOf(progress.xp);
  const empty = solo.questions === 0 && st.versus.games === 0;

  return (
    <div className="screen">
      <ScreenHeader title="Statistiques" />
      {empty ? (
        <section className="panel empty">
          <Icon.chart />
          <p>Aucune partie jouée sur cet appareil pour l’instant. Vos statistiques apparaîtront ici dès votre première session.</p>
          <Button variant="primary" onClick={() => nav.go({ name: 'solo' })}>Jouer en solo</Button>
        </section>
      ) : (
        <>
          <section className="stat-tiles" aria-label="Résumé">
            <div className="panel tile"><span className="tile__label">Rang</span><span className="tile__value">{rank.name}</span><span className="muted small num">{progress.xp} XP</span></div>
            <div className="panel tile"><span className="tile__label">Précision solo</span><span className="tile__value num">{accuracy} %</span><span className="muted small">sur {solo.questions} questions</span></div>
            <div className="panel tile"><span className="tile__label">Tout Pile</span><span className="tile__value num">{solo.piles + st.versus.piles}</span><span className="muted small">{pct(solo.piles, solo.questions)} % en solo</span></div>
            <div className="panel tile"><span className="tile__label">Meilleure série</span><span className="tile__value num">{solo.bestStreak}</span><span className="muted small">Survie : {solo.bestSurvival} questions</span></div>
          </section>

          <div className="grid-2">
            <section className="panel">
              <h2>Évolution de la précision (solo)</h2>
              {st.trend.length < 2 ? (
                <p className="muted">Jouez au moins deux sessions solo pour voir votre courbe.</p>
              ) : (
                <Trend points={st.trend.map((t) => t.accuracy)} />
              )}
              <p className="muted small">Temps moyen de réflexion : <span className="num">{solo.questions ? Math.round(solo.timeSum / solo.questions / 100) / 10 : 0}</span> s par question. Valeurs exactes : <span className="num">{solo.exact}</span>.</p>
            </section>
            <section className="panel">
              <h2>Parties à deux équipes</h2>
              <dl className="kv">
                <div><dt>Parties jouées</dt><dd className="num">{st.versus.games}</dd></div>
                <div><dt>Victoires / défaites / nuls</dt><dd className="num">{st.versus.wins} / {st.versus.losses} / {st.versus.draws}</dd></div>
                <div><dt>Dont en ligne</dt><dd className="num">{st.online.games} ({st.online.wins} victoires)</dd></div>
                <div><dt>Contestations réussies</dt><dd className="num">{st.versus.contestsRight}/{st.versus.contests} ({pct(st.versus.contestsRight, st.versus.contests)} %)</dd></div>
                <div><dt>Estimations Tout Pile</dt><dd className="num">{st.versus.piles}/{st.versus.estimates}</dd></div>
              </dl>
              <p className="muted small">Les duels sur un écran comptent pour les deux équipes, sans victoire ni défaite.</p>
            </section>
          </div>

          <section className="panel">
            <h2>Précision par catégorie (solo)</h2>
            <ul className="cat-stats">
              {CATEGORIES.map((c) => {
                const s = st.categories[c.id];
                const acc = s && s.n ? Math.max(0, Math.round(100 - (s.err / s.n) * 10)) : null;
                return (
                  <li key={c.id} style={{ ['--hue' as string]: c.hue }}>
                    <CategoryIcon id={c.id} />
                    <span className="cat-stats__name">{c.label}</span>
                    <span className="cat-stats__bar" aria-hidden="true"><span style={{ width: `${acc ?? 0}%` }} /></span>
                    <span className="num cat-stats__value">{acc === null ? '—' : `${acc} %`}</span>
                    <span className="muted small num">{s?.n ?? 0} q.</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel">
            <h2>Records solo</h2>
            <div className="table-wrap"><table className="records">
              <thead><tr><th scope="col">Mode</th>{DIFFICULTIES.map((d) => <th key={d} scope="col">{DIFFICULTY_PROFILES[d].label}</th>)}</tr></thead>
              <tbody>
                {(Object.keys(SOLO_MODES) as SoloMode[]).map((m) => (
                  <tr key={m}>
                    <th scope="row">{SOLO_MODES[m].label}</th>
                    {DIFFICULTIES.map((d) => {
                      const r = progress.records[`${m}:${d}`];
                      return <td key={d}>{r ? <><span className="num">{r.best}</span> <Stars n={r.stars} size={13} /></> : <span className="muted">—</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table></div>
          </section>
        </>
      )}

      <section className="panel">
        <h2>Succès <span className="muted num">{Object.keys(progress.achievements).filter((k) => ACHIEVEMENTS.some((a) => a.id === k)).length}/{ACHIEVEMENTS.length}</span></h2>
        <ul className="achievements">
          {ACHIEVEMENTS.map((a) => (
            <li key={a.id} className={`achievement ${progress.achievements[a.id] ? 'is-on' : ''}`}>
              {progress.achievements[a.id] ? <Icon.starFill /> : <Icon.lock />}
              <strong>{a.title}</strong>
              <span className="muted">{a.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {history.length ? (
        <section className="panel">
          <h2>Dernières parties</h2>
          <ul className="history">
            {history.slice(0, 12).map((h) => (
              <li key={h.at}>
                <span className={`history__dot history__dot--${h.outcome}`} aria-hidden="true" />
                <span className="grow"><strong>{h.label}</strong> <span className="muted small">{h.detail}</span></span>
                <span className="muted small">{new Date(h.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                <span className="num">{h.outcome === 'score' ? `${h.score} pts` : h.outcome === 'win' ? 'Victoire' : h.outcome === 'loss' ? 'Défaite' : 'Terminée'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="row end">
        <Button variant="ghost" onClick={() => setConfirm(true)}>Réinitialiser les statistiques</Button>
      </div>
      {confirm ? (
        <Modal title="Effacer vos statistiques ?" onClose={() => setConfirm(false)}
          actions={<><Button variant="ghost" onClick={() => setConfirm(false)}>Garder</Button><Button variant="danger" onClick={() => { resetAll(); setConfirm(false); }}>Tout effacer</Button></>}>
          <p className="muted">Records, succès, expérience et historique de cet appareil seront supprimés. Vos paramètres sont conservés.</p>
        </Modal>
      ) : null}
    </div>
  );
}

function Trend({ points }: { points: number[] }) {
  const W = 320;
  const H = 120;
  const step = W / Math.max(1, points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(H - (p / 100) * H).toFixed(1)}`).join(' ');
  const last = points[points.length - 1] ?? 0;
  return (
    <figure className="trend">
      <svg viewBox={`0 -6 ${W} ${H + 12}`} role="img" aria-label={`Précision des ${points.length} dernières sessions, dernière : ${last} %`}>
        {[0, 50, 100].map((y) => <line key={y} x1="0" x2={W} y1={H - (y / 100) * H} y2={H - (y / 100) * H} className="trend__grid" />)}
        <path d={`${path} L${W},${H} L0,${H} Z`} className="trend__area" />
        <path d={path} className="trend__line" />
        <circle cx={(points.length - 1) * step} cy={H - (last / 100) * H} r="4.5" className="trend__dot" />
      </svg>
      <figcaption className="muted small">0 à 100 %, de la plus ancienne à la plus récente session.</figcaption>
    </figure>
  );
}
