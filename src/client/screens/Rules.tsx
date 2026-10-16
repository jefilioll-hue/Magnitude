import { CLASSIC_SCORING, DIFFICULTY_PROFILES, JOKER_INFO } from '../../shared/config.ts';
import { DIFFICULTIES, type JokerId } from '../../shared/types.ts';
import { GRADE_POINTS } from '../../shared/solo.ts';
import { Icon } from '../ui/icons.tsx';
import { ScreenHeader } from './common.tsx';

const r = CLASSIC_SCORING;

export function RulesScreen() {
  return (
    <div className="screen rules">
      <ScreenHeader title="Règles du jeu" />
      <section className="panel">
        <h2>Le principe</h2>
        <p>Chaque question attend un nombre : une date, une distance, une quantité. Personne ne le connaît exactement, et c’est tout l’intérêt : il faut estimer juste, et juger l’estimation des autres.</p>
      </section>
      <section className="panel">
        <h2>Une manche, en quatre temps</h2>
        <ol className="steps">
          <li><strong>La question.</strong> Sa catégorie, son niveau et sa zone Tout Pile (la tolérance) sont affichés.</li>
          <li><strong>L’estimation.</strong> L’équipe qui joue propose un nombre et le verrouille. Il ne peut plus changer.</li>
          <li><strong>La contestation.</strong> L’équipe adverse découvre l’estimation et annonce <em>Plus</em> (la vraie valeur est au-dessus), <em>Moins</em> (en dessous) ou <em>Tout Pile</em> (c’est dans la zone).</li>
          <li><strong>La révélation.</strong> La réponse tombe sur la règle, les points sont attribués, puis les rôles s’inversent.</li>
        </ol>
      </section>
      <section className="panel">
        <h2>Le barème classique</h2>
        <div className="table-wrap"><table className="score-table">
          <thead><tr><th scope="col">Situation</th><th scope="col">Équipe qui estime</th><th scope="col">Équipe qui conteste</th></tr></thead>
          <tbody>
            <tr><td>Estimation dans la zone, contestation Plus ou Moins</td><td className="num">+{r.pileEstimator}</td><td className="num">0</td></tr>
            <tr><td>Estimation dans la zone, contestation Tout Pile</td><td className="num">+{r.pileSharedEstimator}</td><td className="num">+{r.pileSharedContester}</td></tr>
            <tr><td>Valeur exacte, au chiffre près</td><td className="num">+{r.exactBonus} de bonus</td><td className="num">—</td></tr>
            <tr><td>Hors zone, contestation dans le bon sens</td><td className="num">0</td><td className="num">+{r.contestRight}</td></tr>
            <tr><td>Hors zone, contestation dans le mauvais sens</td><td className="num">+{r.contestWrong}</td><td className="num">0</td></tr>
            <tr><td>Hors zone, contestation Tout Pile</td><td className="num">+{r.pileCallWrong}</td><td className="num">0</td></tr>
            <tr><td>Aucune estimation à temps</td><td className="num">0</td><td className="num">+{r.noEstimate}</td></tr>
            <tr><td>Aucune contestation à temps</td><td className="num">+{r.noContest}</td><td className="num">0</td></tr>
          </tbody>
        </table></div>
        <p className="muted small">Égalité exacte entre estimation et réponse : elle compte toujours comme Tout Pile. Les comparaisons se font au chiffre près, sans erreur d’arrondi. La partie s’arrête quand une équipe atteint le score cible ou après le nombre maximal de manches ; en cas d’égalité, une question de départage désigne l’équipe la plus proche.</p>
      </section>
      <section className="panel">
        <h2>Jokers et manches spéciales</h2>
        <ul className="jokers-list">
          {(['hint', 'swap', 'bet', 'double'] as JokerId[]).map((j) => (
            <li key={j}>
              <span className="jokers-list__icon">{j === 'hint' ? <Icon.hint /> : j === 'swap' ? <Icon.swap /> : j === 'bet' ? <Icon.bet /> : <Icon.double />}</span>
              <span><strong>{JOKER_INFO[j].label}</strong> {JOKER_INFO[j].desc}</span>
            </li>
          ))}
          <li>
            <span className="jokers-list__icon"><Icon.star /></span>
            <span><strong>Manche Prime</strong> Toutes les quatre manches en Classique, tous les points sont doublés.</span>
          </li>
        </ul>
        <p className="muted small">Chaque équipe dispose d’un nombre limité de jokers par partie, affiché sur son tableau de score.</p>
      </section>
      <section className="panel">
        <h2>Les difficultés</h2>
        <div className="table-wrap"><table className="score-table">
          <thead><tr><th scope="col">Niveau</th><th scope="col">Questions</th><th scope="col">Zone Tout Pile</th><th scope="col">Chrono</th></tr></thead>
          <tbody>
            {DIFFICULTIES.map((d) => {
              const p = DIFFICULTY_PROFILES[d];
              const lv = Object.entries(p.levelWeights).filter(([, w]) => w > 0).map(([l]) => l).join(' à ');
              return (
                <tr key={d}>
                  <th scope="row">{p.label}</th>
                  <td>Niveaux {lv}</td>
                  <td className="num">{p.tolFactor === 1 ? 'Référence' : `×${String(p.tolFactor).replace('.', ',')}`}</td>
                  <td className="num">{p.estimateSeconds} s</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p className="muted small">En Expert et Maître, un Tout Pile rapporte davantage. Une tolérance de quelques années peut devenir « valeur exacte » en Maître.</p>
      </section>
      <section className="panel">
        <h2>En solo</h2>
        <p>Tout Pile : {GRADE_POINTS.pile} points (+50 si exact). Puis selon l’écart : Proche {GRADE_POINTS.proche}, Correct {GRADE_POINTS.correct}, Loin {GRADE_POINTS.loin}, Raté 0. Les Tout Pile et Proche consécutifs augmentent un multiplicateur jusqu’à ×2. En Survie, chaque Loin, Raté ou temps écoulé coûte une vie, chaque Tout Pile en rend une.</p>
      </section>
      <section className="panel">
        <h2>En ligne</h2>
        <p>Chaque équipe a un porte-parole, qui change à chaque manche : lui seul verrouille l’estimation ou la contestation, pendant que ses coéquipiers lui proposent des nombres en direct. Si un joueur se déconnecte, la partie continue et il retrouve sa place en revenant. Si l’hôte s’absente plus de 15 secondes, un autre joueur reprend la main.</p>
      </section>
    </div>
  );
}
