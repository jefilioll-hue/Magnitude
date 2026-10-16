import { useState } from 'react';
import { rankOf, setSettings, usePersisted, RANKS } from '../lib/store.ts';
import { Avatar, AVATAR_COUNT, Icon, LogoMark, avatarName } from '../ui/icons.tsx';
import { Button, Modal } from '../ui/kit.tsx';
import { useNav, SoundToggle, type Route } from './common.tsx';
import { ui } from '../audio/engine.ts';
import { cleanText } from '../../shared/config.ts';

interface Item {
  route: Route;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent?: 'a' | 'b';
}

const PLAY: Item[] = [
  { route: { name: 'solo' }, title: 'Jouer en solo', desc: 'Série, Rapide ou Survie : battez vos records de précision.', icon: <Icon.target />, accent: 'a' },
  { route: { name: 'versus-setup', kind: 'ia' }, title: 'Défi contre l’ordinateur', desc: 'Trois adversaires, du débutant à l’encyclopédie vivante.', icon: <Icon.robot /> },
  { route: { name: 'versus-setup', kind: 'local' }, title: 'Duel sur un écran', desc: 'Deux équipes autour du même appareil.', icon: <Icon.screen /> },
];
const ONLINE: Item[] = [
  { route: { name: 'online', tab: 'create' }, title: 'Créer une partie en ligne', desc: 'Un code à partager, vos amis rejoignent depuis chez eux.', icon: <Icon.globe />, accent: 'b' },
  { route: { name: 'online', tab: 'join' }, title: 'Rejoindre avec un code', desc: 'Entrez les cinq caractères donnés par l’hôte.', icon: <Icon.key /> },
];
const MORE: Item[] = [
  { route: { name: 'categories' }, title: 'Catégories', desc: '17 thèmes, 400 questions sourcées.', icon: <Icon.grid /> },
  { route: { name: 'stats' }, title: 'Statistiques', desc: 'Précision, records, succès.', icon: <Icon.chart /> },
  { route: { name: 'rules' }, title: 'Règles du jeu', desc: 'Estimation, contestation, jokers.', icon: <Icon.book /> },
  { route: { name: 'settings' }, title: 'Paramètres', desc: 'Son, animations, accessibilité.', icon: <Icon.settings /> },
];

export function MenuScreen() {
  const nav = useNav();
  const s = usePersisted((x) => x.settings);
  const xp = usePersisted((x) => x.progress.xp);
  const rank = rankOf(xp);
  const [editing, setEditing] = useState(false);
  const progress = rank.next ? (xp - rank.floor) / (rank.next - rank.floor) : 1;

  const row = (it: Item, big = false) => (
    <li key={it.title}>
      <button
        type="button"
        className={`menu__item ${big ? 'menu__item--big' : ''} ${it.accent ? `menu__item--${it.accent}` : ''}`}
        onPointerEnter={() => ui('hover')}
        onClick={() => {
          ui('click');
          nav.go(it.route);
        }}
      >
        <span className="menu__icon">{it.icon}</span>
        <span className="menu__text">
          <span className="menu__title">{it.title}</span>
          <span className="menu__desc">{it.desc}</span>
        </span>
      </button>
    </li>
  );

  return (
    <div className="screen menu">
      <header className="topbar">
        <LogoMark className="menu__logo" />
        <span className="menu__word">Magnitude</span>
        <div className="topbar__spacer" />
        <SoundToggle />
      </header>

      <div className="menu__layout">
        <section className="panel profile" aria-label="Votre profil">
          <button type="button" className="profile__avatar" onClick={() => setEditing(true)} aria-label="Modifier votre nom et votre avatar">
            <Avatar index={s.avatar} size={76} />
          </button>
          <div className="profile__info">
            <div className="profile__name">{s.playerName || 'Joueur anonyme'}</div>
            <div className="profile__rank">
              {rank.name}
              <span className="muted small num"> {xp} XP</span>
            </div>
            <div className="xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progression vers le rang suivant">
              <span style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="muted small">{rank.next ? `Prochain rang : ${RANKS[rank.index + 1]?.name} à ${rank.next} XP` : 'Rang maximal atteint'}</div>
          </div>
          <Button variant="ghost" onClick={() => setEditing(true)}>Modifier</Button>
        </section>

        <nav className="menu__lists" aria-label="Menu principal">
          <div>
            <h2 className="menu__group">Jouer</h2>
            <ul className="menu__list">{PLAY.map((i, k) => row(i, k === 0))}</ul>
          </div>
          <div>
            <h2 className="menu__group">En ligne</h2>
            <ul className="menu__list">{ONLINE.map((i) => row(i))}</ul>
          </div>
          <div>
            <h2 className="menu__group">Plus</h2>
            <ul className="menu__list menu__list--grid">{MORE.map((i) => row(i))}</ul>
          </div>
        </nav>
      </div>

      {editing ? <ProfileEditor onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const s = usePersisted((x) => x.settings);
  const [name, setName] = useState(s.playerName);
  const [avatar, setAvatar] = useState(s.avatar);
  const save = () => {
    setSettings({ playerName: cleanText(name, 20, ''), avatar });
    onClose();
  };
  return (
    <Modal
      title="Votre profil"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <label className="field">
        <span>Nom affiché aux autres joueurs</span>
        <input className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Votre pseudo" autoComplete="nickname" />
      </label>
      <div className="field" style={{ marginTop: 16 }}>
        <span>Avatar : {avatarName(avatar)}</span>
        <div className="avatar-grid" role="radiogroup" aria-label="Avatar">
          {Array.from({ length: AVATAR_COUNT }, (_, i) => (
            <button key={i} type="button" role="radio" aria-checked={avatar === i} aria-label={avatarName(i)} className="avatar-pick" onClick={() => { ui('select'); setAvatar(i); }}>
              <Avatar index={i} size={52} />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
