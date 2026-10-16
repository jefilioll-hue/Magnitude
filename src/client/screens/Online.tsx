import { useEffect, useMemo, useRef, useState } from 'react';
import { presetSettings, sanitizeSettings, DIFFICULTY_PROFILES, type GameSettings } from '../../shared/config.ts';
import { CODE_LENGTH, ERROR_TEXT, MAX_PLAYERS, isValidCode, normalizeCode, type RoomView } from '../../shared/protocol.ts';
import type { TeamId } from '../../shared/types.ts';
import { online, useOnline } from '../game/online.ts';
import { PEER_MODE, onlineAvailable } from '../game/transport.ts';
import type { VersusDriver } from '../game/driver.ts';
import { recordVersus } from '../lib/progress.ts';
import { getState, setSettings as setStoreSettings, usePersisted } from '../lib/store.ts';
import { cleanText } from '../../shared/config.ts';
import { audio } from '../audio/engine.ts';
import { Avatar, Icon } from '../ui/icons.tsx';
import { Button, Loading, Modal, useToast } from '../ui/kit.tsx';
import { ProfileEditor } from './Menu.tsx';
import { ScreenHeader, useNav } from './common.tsx';
import { SettingsEditor } from './VersusSetup.tsx';
import { VersusGame } from './VersusGame.tsx';

function useProfile() {
  const s = usePersisted((x) => x.settings);
  return { name: s.playerName || 'Joueur', avatar: s.avatar, named: Boolean(s.playerName) };
}

export function OnlineHome({ initialCode, initialTab }: { initialCode?: string; initialTab?: 'create' | 'join' }) {
  const nav = useNav();
  const st = useOnline();
  const profile = useProfile();
  const [tab, setTab] = useState<'create' | 'join'>(initialTab ?? (initialCode ? 'join' : 'create'));
  const [code, setCode] = useState(initialCode ?? '');
  const [settings, setSettings] = useState<GameSettings>(() => sanitizeSettings({ ...presetSettings('classique'), name: profile.named ? `Partie de ${profile.name}` : 'Partie Magnitude' }));
  const [busy, setBusy] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState(getState().settings.playerName);
  const finalName = () => {
    const n = cleanText(nameDraft, 20, '');
    if (n !== getState().settings.playerName) setStoreSettings({ playerName: n });
    return n || `Joueur ${Math.floor(Math.random() * 90 + 10)}`;
  };
  const codeRef = useRef<HTMLInputElement>(null);

  const [available, setAvailable] = useState(true);
  useEffect(() => {
    online.clearError();
    online.open();
    let alive = true;
    void onlineAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (st.room) nav.replace({ name: 'room' });
  }, [st.room, nav]);
  useEffect(() => {
    if (st.error) setBusy(false);
  }, [st.error]);
  useEffect(() => {
    if (tab === 'join') window.setTimeout(() => codeRef.current?.focus(), 50);
  }, [tab]);

  const normalized = normalizeCode(code);
  const codeOk = isValidCode(normalized);
  const create = () => {
    setBusy(true);
    online.clearError();
    online.send({ t: 'create', name: finalName(), avatar: profile.avatar, settings });
  };
  const join = () => {
    if (!codeOk) return;
    setBusy(true);
    online.clearError();
    online.send({ t: 'join', code: normalized, name: finalName(), avatar: profile.avatar });
  };
  const offline = st.status === 'offline' || (st.status === 'reconnecting' && busy);

  return (
    <div className="screen">
      <ScreenHeader title="Jouer en ligne" />
      <div className="tabs" role="tablist" aria-label="Créer ou rejoindre">
        <button role="tab" aria-selected={tab === 'create'} className="tab" onClick={() => setTab('create')}><Icon.globe /> Créer une partie</button>
        <button role="tab" aria-selected={tab === 'join'} className="tab" onClick={() => setTab('join')}><Icon.key /> Rejoindre avec un code</button>
      </div>

      <section className="panel profile profile--compact">
        <button type="button" className="profile__avatar" onClick={() => setEditProfile(true)} aria-label="Changer d’avatar">
          <Avatar index={profile.avatar} size={52} />
        </button>
        <label className="field grow">
          <span>Votre nom, visible des autres joueurs</span>
          <input className="input" maxLength={20} value={nameDraft} placeholder="Votre pseudo" autoComplete="nickname"
            onChange={(e) => setNameDraft(e.target.value)} onBlur={() => setStoreSettings({ playerName: cleanText(nameDraft, 20, '') })} />
        </label>
      </section>

      {!available ? (
        <div className="banner banner--warn" role="status">
          <Icon.info /> Le jeu en ligne n’est pas disponible dans cette fenêtre. Ouvrez Magnitude depuis Claude, connecté à votre compte : la page doit avoir été partagée avec chaque joueur (invitation par e-mail).
        </div>
      ) : PEER_MODE ? (
        <p className="muted small">L’appareil qui crée le salon arbitre la partie : il doit garder la page ouverte jusqu’à la fin. Les autres joueurs ouvrent la même page Magnitude et entrent le code.</p>
      ) : null}
      {offline ? (
        <div className="banner banner--error" role="alert">
          <Icon.wifiOff /> Impossible de joindre le serveur de jeu. Vérifiez votre connexion ; nouvelle tentative automatique en cours.
        </div>
      ) : null}
      {st.error && (st.error.ref === 'join' || st.error.ref === 'create' || !st.error.ref) ? (
        <div className="banner banner--error" role="alert"><Icon.info /> {st.error.message}</div>
      ) : null}
      {st.closed ? (
        <div className="banner banner--warn" role="status">
          <Icon.info /> {st.closed.reason === 'kicked' ? 'L’hôte vous a retiré du salon.' : st.closed.reason === 'closed_by_host' ? 'L’hôte a fermé le salon.' : st.closed.reason === 'expired' ? 'Le salon a expiré.' : 'Vous avez quitté le salon.'}
        </div>
      ) : null}

      {tab === 'join' ? (
        <section className="panel stack join">
          <form className="stack" onSubmit={(e) => { e.preventDefault(); join(); }}>
            <label className="field">
              <span>Code du salon</span>
              <input
                ref={codeRef}
                className="input code-input num"
                value={normalized}
                onChange={(e) => setCode(e.target.value)}
                maxLength={CODE_LENGTH + 3}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="ABCDE"
                aria-invalid={code.length >= CODE_LENGTH && !codeOk}
                aria-describedby="code-help"
              />
            </label>
            <p id="code-help" className="muted small">
              {code.length >= CODE_LENGTH && !codeOk ? 'Un code contient 5 caractères parmi les lettres (sans I, L, O) et les chiffres de 2 à 9.' : 'Le code de 5 caractères s’affiche sur l’écran de l’hôte.'}
            </p>
            <Button type="submit" variant="cyan" big block disabled={!codeOk || busy || !available} icon={busy ? <span className="spinner spinner--btn" /> : <Icon.key />}>
              {busy ? 'Connexion au salon…' : 'Rejoindre'}
            </Button>
          </form>
        </section>
      ) : (
        <section className="panel stack">
          <label className="field">
            <span>Nom de la partie</span>
            <input className="input" maxLength={40} value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          </label>
          <SettingsEditor value={settings} onChange={setSettings} allowUnlimited={false} />
          <Button variant="primary" big block disabled={busy || !available} onClick={create} icon={busy ? <span className="spinner spinner--btn" /> : <Icon.globe />}>
            {busy ? 'Création du salon…' : 'Créer le salon'}
          </Button>
          <p className="muted small">Vous pourrez modifier ces réglages dans le salon, avant de lancer la partie.</p>
        </section>
      )}
      {editProfile ? <ProfileEditor onClose={() => setEditProfile(false)} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function RoomScreen() {
  const nav = useNav();
  const st = useOnline();
  const room = st.room;
  useEffect(() => online.open(), []);
  useEffect(() => {
    if (!room && !st.session && st.status !== 'connecting') {
      nav.replace({ name: 'online', tab: 'join' });
    }
  }, [room, st.session, st.status, nav]);
  if (!room) {
    return (
      <div className="screen screen--center">
        <Loading label={st.status === 'offline' ? 'Serveur injoignable, nouvelle tentative…' : 'Connexion au salon…'} />
        <Button variant="ghost" onClick={() => { online.close(); nav.home(); }}>Abandonner</Button>
      </div>
    );
  }
  if (room.status === 'playing' || (room.status === 'finished' && room.game)) return <OnlineGame room={room} />;
  return <Lobby room={room} />;
}

function Lobby({ room }: { room: RoomView }) {
  const nav = useNav();
  const toast = useToast();
  const st = useOnline();
  const me = room.players.find((p) => p.id === room.you.id);
  const isHost = room.hostId === room.you.id;
  const [editing, setEditing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const prevCount = useRef(room.players.length);
  useEffect(() => {
    if (room.players.length > prevCount.current) audio.play('st_join');
    else if (room.players.length < prevCount.current) audio.play('st_leave');
    prevCount.current = room.players.length;
  }, [room.players.length]);
  useEffect(() => void audio.music('lobby'), []);
  useEffect(() => {
    if (st.error && ['start', 'settings', 'kick', 'team', 'lock'].includes(st.error.ref ?? '')) toast(st.error.message, 'error');
  }, [st.error, toast]);

  const link = PEER_MODE ? '' : `${location.origin}/?code=${room.code}`;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      audio.play('ui_copy');
      toast(`${what} copié`, 'ok');
    } catch {
      toast('Copie impossible : sélectionnez le texte manuellement.', 'error');
    }
  };
  const share = async () => {
    if (PEER_MODE) {
      await copy(`Rejoins ma partie de Magnitude : ouvre la page Magnitude, « Rejoindre avec un code », puis entre ${room.code}`, 'Message d’invitation');
      return;
    }
    const data = { title: 'Magnitude', text: `Rejoins ma partie de Magnitude avec le code ${room.code}`, url: link };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* annulé : on retombe sur la copie */
      }
    }
    await copy(link, 'Lien d’invitation');
  };
  const counts = { A: room.players.filter((p) => p.team === 'A').length, B: room.players.filter((p) => p.team === 'B').length };
  const connectedPer = (t: TeamId) => room.players.filter((p) => p.team === t && p.connected).length;
  const canStart = connectedPer('A') >= 1 && connectedPer('B') >= 1;
  const leave = () => {
    online.send({ t: 'leave' });
    online.close();
    nav.home();
  };
  const s = room.settings;
  return (
    <div className="screen screen--wide lobby">
      <ScreenHeader title={s.name} onBack={leave}>
        {st.status !== 'online' ? <span className="badge badge--warn"><Icon.wifiOff /> Reconnexion…</span> : null}
      </ScreenHeader>

      <section className="panel lobby__code">
        <div>
          <span className="muted small">Code du salon</span>
          <div className="code-display num" aria-label={`Code : ${room.code.split('').join(' ')}`}>
            {room.code.split('').map((c, i) => <span key={i}>{c}</span>)}
          </div>
        </div>
        <div className="row">
          <Button variant="ghost" icon={<Icon.copy />} onClick={() => void copy(room.code, 'Code')}>Copier le code</Button>
          <Button variant="cyan" icon={<Icon.share />} onClick={() => void share()}>Inviter</Button>
        </div>
        <p className="muted small">
          <span className="num">{room.players.length}</span> joueur{room.players.length > 1 ? 's' : ''} sur {MAX_PLAYERS}. {room.locked ? 'Salon verrouillé : personne ne peut plus entrer.' : PEER_MODE ? (room.hostId === room.you.id ? 'Vos amis ouvrent la même page Magnitude et entrent ce code. Gardez cette page ouverte : votre appareil arbitre la partie.' : 'D’autres amis peuvent rejoindre avec ce code depuis la même page Magnitude.') : 'Vos amis rejoignent depuis n’importe quel appareil connecté à Internet.'}
        </p>
      </section>

      <div className="lobby__teams">
        {(['A', 'B'] as TeamId[]).map((t) => (
          <section key={t} className={`panel lobby__team ${t === 'A' ? 'team-a' : 'team-b'}`} aria-label={`Équipe ${s.teamNames[t]}`}>
            <div className="row between">
              <h2>{s.teamNames[t]} <span className="muted num">{counts[t]}</span></h2>
              {me && me.team !== t ? (
                <Button variant="ghost" onClick={() => online.send({ t: 'team', team: t })}>Rejoindre cette équipe</Button>
              ) : null}
            </div>
            <ul className="players">
              {room.players.filter((p) => p.team === t).map((p) => (
                <li key={p.id} className={`player ${p.connected ? '' : 'is-away'} ${p.id === room.you.id ? 'is-me' : ''}`}>
                  <Avatar index={p.avatar} size={40} />
                  <span className="player__name">{p.name}{p.id === room.you.id ? ' (vous)' : ''}</span>
                  {p.isHost ? <span className="badge"><Icon.crown /> Hôte</span> : null}
                  {!p.connected ? <span className="badge badge--warn">Déconnecté</span> : null}
                  {isHost && p.id !== room.you.id ? (
                    <Button variant="ghost" icon={<Icon.kick />} aria-label={`Exclure ${p.name}`} title={`Exclure ${p.name}`} onClick={() => online.send({ t: 'kick', playerId: p.id })} />
                  ) : null}
                </li>
              ))}
              {counts[t] === 0 ? <li className="player player--empty muted">Personne pour l’instant</li> : null}
            </ul>
          </section>
        ))}
      </div>

      <section className="panel lobby__settings">
        <div className="row between">
          <h2>Règles de la partie</h2>
          {isHost ? <Button variant="ghost" icon={<Icon.settings />} onClick={() => setEditing(true)}>Modifier</Button> : null}
        </div>
        <ul className="facts">
          <li>{s.preset === 'rapide' ? 'Format rapide' : s.preset === 'perso' ? 'Règles personnalisées' : 'Format classique'}, difficulté {DIFFICULTY_PROFILES[s.difficulty].label}</li>
          <li>{s.targetScore > 0 ? `Premier à ${s.targetScore} points` : 'Au meilleur score'}, {s.maxRounds} manches au plus</li>
          <li>{s.categories.length ? `${s.categories.length} catégories choisies` : 'Toutes les catégories'}</li>
          <li>Estimation {s.estimateSeconds} s, contestation {s.contestSeconds} s</li>
          <li>Dans chaque équipe, un porte-parole tournant valide les décisions ; les autres proposent leurs idées en direct.</li>
        </ul>
      </section>

      <div className="lobby__actions">
        {isHost ? (
          <>
            <Button variant="ghost" icon={room.locked ? <Icon.unlock /> : <Icon.lock />} onClick={() => online.send({ t: 'lock', locked: !room.locked })}>
              {room.locked ? 'Rouvrir le salon' : 'Verrouiller le salon'}
            </Button>
            <Button variant="danger" onClick={() => setConfirmClose(true)}>Annuler le salon</Button>
            <Button variant="primary" big icon={<Icon.play />} disabled={!canStart} onClick={() => online.send({ t: 'start' })}>
              Lancer la partie
            </Button>
            {!canStart ? <p className="muted small lobby__hint">{ERROR_TEXT.not_enough_players}</p> : null}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={leave}>Quitter le salon</Button>
            <div className="waiting" role="status"><div className="spinner" /> En attente du lancement par l’hôte…</div>
          </>
        )}
      </div>

      {editing ? (
        <HostSettings room={room} onClose={() => setEditing(false)} />
      ) : null}
      {confirmClose ? (
        <Modal title="Annuler le salon ?" onClose={() => setConfirmClose(false)}
          actions={<><Button variant="ghost" onClick={() => setConfirmClose(false)}>Garder le salon</Button><Button variant="danger" onClick={() => { online.send({ t: 'close' }); online.close(); nav.home(); }}>Annuler le salon</Button></>}>
          <p className="muted">Tous les joueurs seront renvoyés à l’accueil.</p>
        </Modal>
      ) : null}
    </div>
  );
}

function HostSettings({ room, onClose }: { room: RoomView; onClose: () => void }) {
  const [draft, setDraft] = useState<GameSettings>(room.settings);
  return (
    <Modal title="Règles de la partie" onClose={onClose}
      actions={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => { online.send({ t: 'settings', settings: draft }); onClose(); }}>Appliquer</Button></>}>
      <label className="field">
        <span>Nom de la partie</span>
        <input className="input" maxLength={40} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <SettingsEditor value={draft} onChange={setDraft} allowUnlimited={false} />
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function OnlineGame({ room }: { room: RoomView }) {
  const nav = useNav();
  const st = useOnline();
  const toast = useToast();
  const recorded = useRef<number | null>(null);
  const game = room.game as NonNullable<RoomView['game']>;
  const me = room.you;
  const isHost = room.hostId === me.id;
  const lastDraft = useRef(0);

  useEffect(() => {
    if (st.lastActionError && st.lastActionError.error !== 'stale') {
      const code = st.lastActionError.error as keyof typeof ERROR_TEXT;
      toast(ERROR_TEXT[code] ?? 'Action refusée par le serveur.', 'error');
    }
  }, [st.lastActionError, toast]);

  // Enregistre la partie terminée une seule fois (statistiques locales).
  useEffect(() => {
    if (game.phase === 'over' && recorded.current !== game.step) {
      recorded.current = game.step;
      const fake = { history: game.history, teams: game.teams, winner: game.winner, round: game.round } as never;
      recordVersus(fake, 'online', me.team);
    }
  }, [game.phase, game.step, game.history, game.teams, game.winner, game.round, me.team]);

  const spokes = (t: TeamId) => room.players.find((p) => p.id === room.spokesperson[t]);
  const driver: VersusDriver = useMemo(
    () => ({
      kind: 'online',
      view: game,
      clockOffset: st.clockOffset,
      myTeam: me.team,
      canAct: (t) => t === me.team && room.spokesperson[t] === me.id && room.status === 'playing',
      waitingLabel: (t) => {
        const sp = spokes(t);
        if (t === me.team) return sp ? `${sp.name} valide pour votre équipe. Proposez vos idées en direct.` : 'Aucun membre de votre équipe n’est connecté.';
        return sp ? `${game.teams[t].name} réfléchit (${sp.name} valide)…` : `${game.teams[t].name} n’a plus de joueur connecté : le chrono tourne.`;
      },
      act: (a) => online.act(a),
      canAdvance: isHost,
      participants: room.players.map((p) => ({ ...p, isMe: p.id === me.id })),
      drafts: st.drafts,
      sendDraft: (text: string) => {
        const now = Date.now();
        if (now - lastDraft.current < 200) return;
        lastDraft.current = now;
        online.send({ t: 'draft', text });
      },
      pending: st.pendingActions > 0,
      connection: st.status === 'online' ? 'online' : st.status === 'offline' ? 'offline' : 'reconnecting',
      onQuit: () => {
        online.send({ t: 'leave' });
        online.close();
        nav.home();
      },
      onReplay: isHost && room.status === 'finished' ? () => online.send({ t: 'rematch' }) : undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, st.clockOffset, st.drafts, st.pendingActions, st.status],
  );
  return (
    <>
      <VersusGame driver={driver} />
      {room.status === 'finished' && !isHost ? (
        <p className="muted small" style={{ textAlign: 'center', paddingBottom: 24 }}>L’hôte peut relancer une revanche : vous resterez dans le salon.</p>
      ) : null}
    </>
  );
}

