import { audio } from '../audio/engine.ts';
import { setSettings, usePersisted } from '../lib/store.ts';
import { stage } from '../stage/Stage.tsx';
import { Icon, LogoMark } from '../ui/icons.tsx';
import { Button } from '../ui/kit.tsx';
import { useNav } from './common.tsx';

const DECADES = ['1', '10', '100', '1 000', '10 000', '100 000', '1 million', '10 millions', '100 millions', '1 milliard', '10 milliards', '100 milliards'];

export function TitleScreen() {
  const nav = useNav();
  const muted = usePersisted((s) => s.settings.muted);
  const enter = async () => {
    await audio.unlock();
    stage.flash('gold', 0.5);
    audio.play('st_gamestart');
    nav.go({ name: 'menu' });
  };
  return (
    <div className="screen screen--center title">
      <div className="title__brand">
        <LogoMark className="title__logo" />
        <h1 className="title__word" aria-label="Magnitude">
          {'Magnitude'.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${0.15 + i * 0.05}s` }} aria-hidden="true">
              {c}
            </span>
          ))}
        </h1>
        <p className="title__tag">Le jeu des grands nombres. Estimez, contestez, visez Tout Pile.</p>
      </div>

      <div className="title__ruler" aria-hidden="true">
        <div className="title__ruler-track">
          {[...DECADES, ...DECADES].map((d, i) => (
            <span key={i} className="title__decade">
              <i />
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="title__actions">
        <Button variant="primary" big icon={<Icon.play />} onClick={() => void enter()} sound="none" autoFocus>
          Entrer sur le plateau
        </Button>
        <button
          type="button"
          className="chip"
          aria-pressed={!muted}
          onClick={() => setSettings({ muted: !muted })}
        >
          {muted ? <Icon.mute /> : <Icon.sound />} {muted ? 'Son coupé' : 'Musique et sons activés'}
        </button>
      </div>
      <p className="title__foot muted small">Solo, défi contre l’ordinateur, duel sur un écran ou en ligne avec vos amis.</p>
    </div>
  );
}
