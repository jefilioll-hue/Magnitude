import { audio } from '../audio/engine.ts';
import { isStorageAvailable, setSettings, usePersisted, type MotionPref } from '../lib/store.ts';
import { Button, Choice, Switch } from '../ui/kit.tsx';
import { ScreenHeader } from './common.tsx';

export function SettingsScreen() {
  const s = usePersisted((x) => x.settings);
  const slider = (label: string, key: 'master' | 'music' | 'sfx' | 'ui', preview: string) => (
    <label className="field">
      <span>{label}</span>
      <div className="range-row">
        <input type="range" min={0} max={1} step={0.05} value={s[key]}
          onChange={(e) => setSettings({ [key]: Number(e.target.value) })}
          onPointerUp={() => audio.play(preview)} onKeyUp={() => audio.play(preview)} />
        <output className="num">{Math.round(s[key] * 100)} %</output>
      </div>
    </label>
  );
  return (
    <div className="screen">
      <ScreenHeader title="Paramètres" />
      {!isStorageAvailable() ? (
        <div className="banner banner--warn">Le stockage de votre navigateur est bloqué : vos réglages et statistiques ne seront pas conservés après fermeture.</div>
      ) : null}
      <div className="grid-2">
        <section className="panel stack">
          <h2>Son</h2>
          <Switch label="Couper tous les sons" checked={s.muted} onChange={(muted) => setSettings({ muted })} />
          {slider('Volume général', 'master', 'st_good')}
          {slider('Musique', 'music', 'st_round')}
          {slider('Jingles et effets', 'sfx', 'st_pile_shared')}
          {slider('Sons de l’interface', 'ui', 'ui_select')}
          {audio.unavailable ? <p className="muted small">L’audio n’est pas disponible sur ce navigateur.</p> : null}
          <Button variant="ghost" onClick={() => { void audio.unlock().then(() => audio.play('st_pile')); }}>Écouter un jingle</Button>
        </section>
        <section className="panel stack">
          <h2>Affichage et accessibilité</h2>
          <Choice<MotionPref>
            label="Animations"
            value={s.motion}
            onChange={(motion) => setSettings({ motion })}
            options={[
              { value: 'auto', label: 'Selon le système' },
              { value: 'reduce', label: 'Réduites' },
              { value: 'full', label: 'Complètes' },
            ]}
          />
          <Switch label="Contraste renforcé" hint="Textes plus clairs et contours plus marqués." checked={s.highContrast} onChange={(highContrast) => setSettings({ highContrast })} />
          <Switch label="Vibrations" hint="Retour tactile sur les téléphones compatibles." checked={s.haptics} onChange={(haptics) => setSettings({ haptics })} />
          <h2>Raccourcis clavier</h2>
          <dl className="kv">
            <div><dt>Valider une estimation</dt><dd><kbd>Entrée</kbd></dd></div>
            <div><dt>Contester : Plus / Moins</dt><dd><kbd>↑</kbd> / <kbd>↓</kbd></dd></div>
            <div><dt>Contester : Tout Pile</dt><dd><kbd>Espace</kbd></dd></div>
            <div><dt>Question suivante (solo)</dt><dd><kbd>Entrée</kbd></dd></div>
            <div><dt>Fermer une fenêtre</dt><dd><kbd>Échap</kbd></dd></div>
          </dl>
          <h2>Données</h2>
          <p className="muted small">Réglages, progression et statistiques restent sur cet appareil. En ligne, le serveur ne reçoit que votre pseudo, votre avatar et vos actions de jeu, et les oublie à la fermeture du salon.</p>
        </section>
      </div>
    </div>
  );
}
