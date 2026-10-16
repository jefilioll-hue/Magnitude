import { useCallback, useState } from 'react';
import { CLASSIC_SCORING, DIFFICULTY_PROFILES, JOKER_INFO, LIMITS, presetSettings, sanitizeSettings, type GameSettings, type ScoringRules, type VersusPreset } from '../../shared/config.ts';
import { CATEGORIES } from '../../shared/categories.ts';
import { AI_PROFILES, type AiLevel } from '../../shared/ai.ts';
import { DIFFICULTIES, type CategoryId, type JokerId } from '../../shared/types.ts';
import type { VersusState } from '../../shared/engine.ts';
import { Button, Choice, Switch, useToast } from '../ui/kit.tsx';
import { CategoryIcon, Icon } from '../ui/icons.tsx';
import { ScreenHeader, useNav, type Route } from './common.tsx';
import { VersusGame } from './VersusGame.tsx';
import { useLocalVersus } from '../game/useLocalVersus.ts';
import { recordVersus } from '../lib/progress.ts';
import { getState } from '../lib/store.ts';

export const aiShortName = (l: AiLevel) => AI_PROFILES[l].persona.split(',')[0] ?? 'Ordinateur';

const PRESETS: { value: VersusPreset; label: string; hint: string }[] = [
  { value: 'classique', label: 'Classique', hint: 'Premier à 12 points, jokers et Manches Primes.' },
  { value: 'rapide', label: 'Rapide', hint: 'Premier à 6 points, chronos courts, une dizaine de minutes.' },
  { value: 'perso', label: 'Personnalisé', hint: 'Toutes les règles à votre main.' },
];

export function SettingsEditor({ value, onChange, allowUnlimited, showTeams = true }: {
  value: GameSettings;
  onChange: (s: GameSettings) => void;
  allowUnlimited: boolean;
  showTeams?: boolean;
}) {
  const [advanced, setAdvanced] = useState(value.preset === 'perso');
  const set = (patch: Partial<GameSettings>) => onChange(sanitizeSettings({ ...value, ...patch }, { allowUnlimited }));
  const setPreset = (preset: VersusPreset) => {
    const base = presetSettings(preset, value.difficulty);
    onChange(sanitizeSettings({ ...base, name: value.name, categories: value.categories, teamNames: value.teamNames, startingTeam: value.startingTeam }, { allowUnlimited }));
    setAdvanced(preset === 'perso');
  };
  const setDifficulty = (difficulty: GameSettings['difficulty']) => {
    const base = presetSettings(value.preset, difficulty);
    const keepCustom = value.preset === 'perso';
    set({
      difficulty,
      ...(keepCustom ? {} : { estimateSeconds: base.estimateSeconds, contestSeconds: base.contestSeconds, scoring: base.scoring }),
      ...(keepCustom ? { scoring: { ...value.scoring, ...DIFFICULTY_PROFILES[difficulty].scoring } } : {}),
    });
  };
  const toggleCat = (c: CategoryId) => {
    const cur = value.categories;
    set({ categories: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] });
  };
  const num = (label: string, key: keyof GameSettings, [lo, hi]: readonly [number, number], step = 1, suffix = '', zeroLabel?: string) => (
    <label className="field">
      <span>{label}</span>
      <div className="range-row">
        <input type="range" min={lo} max={hi} step={step} value={value[key] as number} onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<GameSettings>)} />
        <output className="num">{(value[key] as number) === 0 && zeroLabel ? zeroLabel : `${String(value[key]).replace('.', ',')}${suffix}`}</output>
      </div>
    </label>
  );
  const scoringField = (label: string, key: keyof ScoringRules, max = 10) => (
    <label className="field field--inline">
      <span>{label}</span>
      <input className="input input--small num" type="number" min={key.includes('Multiplier') ? 1 : 0} max={max} value={value.scoring[key]}
        onChange={(e) => set({ scoring: { ...value.scoring, [key]: Number(e.target.value) } })} />
    </label>
  );
  const jokerField = (j: JokerId) => (
    <label className="field field--inline" key={j}>
      <span>{JOKER_INFO[j].label}</span>
      <input className="input input--small num" type="number" min={0} max={LIMITS.jokers[1]} value={value.jokers[j]}
        onChange={(e) => set({ jokers: { ...value.jokers, [j]: Number(e.target.value) } })} />
    </label>
  );

  return (
    <div className="stack">
      <Choice label="Format" value={value.preset} onChange={setPreset} options={PRESETS.map((p) => ({ value: p.value, label: p.label, hint: p.hint }))} />
      <p className="muted small">{PRESETS.find((p) => p.value === value.preset)?.hint}</p>
      <Choice label="Difficulté" value={value.difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_PROFILES[d].label, hint: DIFFICULTY_PROFILES[d].tagline }))} />
      <p className="muted small">{DIFFICULTY_PROFILES[value.difficulty].tagline}</p>
      {showTeams ? (
        <div className="row">
          <label className="field grow team-a">
            <span>Équipe ambre</span>
            <input className="input input--team" maxLength={16} value={value.teamNames.A} onChange={(e) => onChange({ ...value, teamNames: { ...value.teamNames, A: e.target.value } })} onBlur={() => set({})} />
          </label>
          <label className="field grow team-b">
            <span>Équipe cyan</span>
            <input className="input input--team" maxLength={16} value={value.teamNames.B} onChange={(e) => onChange({ ...value, teamNames: { ...value.teamNames, B: e.target.value } })} onBlur={() => set({})} />
          </label>
        </div>
      ) : null}
      <div className="field">
        <span>Catégories {value.categories.length ? `(${value.categories.length} sur 17)` : '(toutes)'}</span>
        <div className="segmented">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={value.categories.includes(c.id)} onClick={() => toggleCat(c.id)}>
              <CategoryIcon id={c.id} /> {c.label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="disclosure" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>
        <Icon.settings /> Règles détaillées {advanced ? '(masquer)' : ''}
      </button>
      {advanced ? (
        <div className="stack advanced">
          {num('Score à atteindre', 'targetScore', LIMITS.targetScore, 1, ' pts', 'Aucun (au nombre de manches)')}
          {num('Nombre maximal de manches', 'maxRounds', LIMITS.maxRounds)}
          {num('Temps d’estimation', 'estimateSeconds', [allowUnlimited ? 0 : LIMITS.estimateSeconds[0], LIMITS.estimateSeconds[1]], 5, ' s', 'Illimité')}
          {num('Temps de contestation', 'contestSeconds', [allowUnlimited ? 0 : LIMITS.contestSeconds[0], LIMITS.contestSeconds[1]], 5, ' s', 'Illimité')}
          {num('Durée de la révélation', 'revealSeconds', LIMITS.revealSeconds, 1, ' s')}
          {num('Tolérance du Tout Pile (multiplicateur)', 'tolFactor', LIMITS.tolFactor, 0.05, '×')}
          {num('Manche Prime toutes les', 'primeEvery', LIMITS.primeEvery, 1, ' manches', 'Jamais')}
          <Switch label="Annonce « Tout Pile » autorisée" hint="L’équipe qui conteste peut parier que l’estimation est dans la zone." checked={value.allowPileCall} onChange={(allowPileCall) => set({ allowPileCall })} />
          <Switch label="Départage en cas d’égalité" hint="Une question de précision désigne le vainqueur." checked={value.tiebreak} onChange={(tiebreak) => set({ tiebreak })} />
          <Switch label="Animations rapides" hint="Introductions et suspense raccourcis." checked={value.animSpeed === 'rapide'} onChange={(on) => set({ animSpeed: on ? 'rapide' : 'normal' })} />
          <Choice label="Équipe qui commence" value={value.startingTeam} onChange={(startingTeam) => set({ startingTeam })}
            options={[{ value: 'random', label: 'Au hasard' }, { value: 'A', label: value.teamNames.A }, { value: 'B', label: value.teamNames.B }]} />
          <h3>Jokers par équipe</h3>
          <div className="grid-fields">{(['hint', 'swap', 'bet', 'double'] as JokerId[]).map(jokerField)}</div>
          <h3>Barème</h3>
          <div className="grid-fields">
            {scoringField('Tout Pile (estimatrice)', 'pileEstimator')}
            {scoringField('Bonus valeur exacte', 'exactBonus')}
            {scoringField('Tout Pile partagé : estimatrice', 'pileSharedEstimator')}
            {scoringField('Tout Pile partagé : contestataire', 'pileSharedContester')}
            {scoringField('Contestation juste', 'contestRight')}
            {scoringField('Contestation fausse', 'contestWrong')}
            {scoringField('« Tout Pile » annoncé à tort', 'pileCallWrong')}
            {scoringField('Pas d’estimation à temps', 'noEstimate')}
            {scoringField('Pas de contestation à temps', 'noContest')}
            {scoringField('Pénalité de pari raté', 'betMissPenalty')}
          </div>
          <Button variant="ghost" icon={<Icon.refresh />} onClick={() => set({ scoring: { ...CLASSIC_SCORING, ...DIFFICULTY_PROFILES[value.difficulty].scoring } })}>
            Rétablir le barème classique
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function VersusSetup({ kind }: { kind: 'local' | 'ia' }) {
  const nav = useNav();
  const player = getState().settings.playerName || 'Joueur';
  const [settings, setSettings] = useState<GameSettings>(() =>
    sanitizeSettings({ ...presetSettings('classique'), teamNames: kind === 'ia' ? { A: player, B: aiShortName('intermediaire') } : { A: 'Solaire', B: 'Abysse' } }, { allowUnlimited: true }),
  );
  const [ai, setAiLevel] = useState<AiLevel>('intermediaire');
  const setAi = (l: AiLevel) => {
    setAiLevel(l);
    // Le nom de l'équipe adverse suit le personnage choisi, sauf s'il a été personnalisé.
    if ((Object.keys(AI_PROFILES) as AiLevel[]).some((x) => aiShortName(x) === settings.teamNames.B)) {
      setSettings({ ...settings, teamNames: { ...settings.teamNames, B: aiShortName(l) } });
    }
  };
  return (
    <div className="screen">
      <ScreenHeader title={kind === 'ia' ? 'Défi contre l’ordinateur' : 'Duel sur un écran'} />
      <p className="lede">
        {kind === 'ia'
          ? 'Vous jouez l’équipe ambre. L’ordinateur estime et conteste avec les mêmes règles que vous, sans voir les réponses.'
          : 'Deux équipes se passent l’appareil : l’une estime, l’autre conteste, puis on inverse.'}
      </p>
      <div className="grid-2">
        <section className="panel">
          <SettingsEditor value={settings} onChange={setSettings} allowUnlimited />
        </section>
        <section className="panel stack">
          {kind === 'ia' ? (
            <div className="stack-s">
              <h2>Adversaire</h2>
              <div className="ai-cards" role="radiogroup" aria-label="Niveau de l’ordinateur">
                {(Object.keys(AI_PROFILES) as AiLevel[]).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={ai === l} className={`ai-card ${ai === l ? 'is-on' : ''}`} onClick={() => setAi(l)}>
                    <Icon.robot />
                    <span className="ai-card__title">{AI_PROFILES[l].label}</span>
                    <span className="muted small">{AI_PROFILES[l].persona}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <h2>Résumé</h2>
          <ul className="facts">
            <li>{settings.targetScore > 0 ? `Premier à ${settings.targetScore} points` : 'Au meilleur score'}, {settings.maxRounds} manches au plus</li>
            <li>Estimation {settings.estimateSeconds ? `${settings.estimateSeconds} s` : 'sans limite'}, contestation {settings.contestSeconds ? `${settings.contestSeconds} s` : 'sans limite'}</li>
            <li>Tout Pile : {settings.scoring.pileEstimator} pts, contestation juste : {settings.scoring.contestRight} pt</li>
            <li>{settings.primeEvery ? `Manche Prime ×${settings.primeMultiplier} toutes les ${settings.primeEvery} manches` : 'Pas de Manche Prime'}</li>
          </ul>
          <Button variant="primary" big block icon={<Icon.play />}
            onClick={() => nav.go({ name: 'versus-play', kind, settings: sanitizeSettings(settings, { allowUnlimited: true }), aiLevel: ai, key: Date.now() })}>
            Lancer la partie
          </Button>
        </section>
      </div>
    </div>
  );
}

export function VersusPlay({ route }: { route: Extract<Route, { name: 'versus-play' }> }) {
  const nav = useNav();
  const toast = useToast();
  const onFinished = useCallback(
    (s: VersusState) => {
      const ach = recordVersus(s, route.kind, route.kind === 'ia' ? 'A' : null, { aiLevel: route.aiLevel });
      for (const a of ach) toast(`Succès débloqué : ${a.title}`, 'ok');
    },
    [route.kind, route.aiLevel, toast],
  );
  const driver = useLocalVersus({ kind: route.kind, settings: route.settings, aiLevel: route.aiLevel }, () => nav.back(), onFinished);
  driver.onReplay = () => nav.replace({ ...route, key: Date.now() });
  return <VersusGame driver={driver} />;
}
