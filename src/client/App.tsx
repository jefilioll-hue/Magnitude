import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, stage } from './stage/Stage.tsx';
import { ToastProvider, useReducedMotion } from './ui/kit.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { audio } from './audio/engine.ts';
import { usePersisted } from './lib/store.ts';
import { NavCtx, type Nav, type Route } from './screens/common.tsx';
import { TitleScreen } from './screens/Title.tsx';
import { MenuScreen } from './screens/Menu.tsx';
import { SoloHub, SoloPlay } from './screens/Solo.tsx';
import { VersusSetup, VersusPlay } from './screens/VersusSetup.tsx';
import { OnlineHome, RoomScreen } from './screens/Online.tsx';
import { StatsScreen } from './screens/Stats.tsx';
import { CategoriesScreen } from './screens/Categories.tsx';
import { SettingsScreen } from './screens/Settings.tsx';
import { RulesScreen } from './screens/Rules.tsx';
import { online } from './game/online.ts';
import { normalizeCode } from '../shared/protocol.ts';

function initialRoute(): Route[] {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (code) return [{ name: 'title' }, { name: 'menu' }, { name: 'online', code: normalizeCode(code), tab: 'join' }];
  if (online.hasSession) return [{ name: 'title' }, { name: 'menu' }, { name: 'room' }];
  return [{ name: 'title' }];
}

const MUSIC: Partial<Record<Route['name'], 'theme' | 'lobby'>> = {
  title: 'theme',
  menu: 'theme',
  solo: 'theme',
  stats: 'theme',
  categories: 'theme',
  settings: 'theme',
  rules: 'theme',
  'versus-setup': 'lobby',
  online: 'lobby',
};

export function App() {
  const [stack, setStack] = useState<Route[]>(initialRoute);
  const route = stack[stack.length - 1] as Route;
  const settings = usePersisted((s) => s.settings);
  const reduced = useReducedMotion();
  const depth = useRef(stack.length);

  // Paramètres audio et accessibilité
  useEffect(() => {
    audio.setVolumes(settings);
    document.documentElement.dataset.motion = settings.motion === 'auto' ? '' : settings.motion;
    document.documentElement.dataset.contrast = settings.highContrast ? 'high' : '';
  }, [settings]);

  // Musique d'ambiance selon l'écran (les écrans de jeu gèrent la leur)
  useEffect(() => {
    const m = MUSIC[route.name];
    if (m) void audio.music(m);
    if (m) stage.calm();
  }, [route.name]);

  // Nettoie le paramètre ?code= une fois lu
  useEffect(() => {
    if (location.search.includes('code=')) history.replaceState(null, '', location.pathname);
  }, []);

  const nav = useMemo<Nav>(
    () => ({
      go: (r) => {
        setStack((s) => [...s, r]);
        depth.current += 1;
        history.pushState({ d: depth.current }, '');
        window.scrollTo({ top: 0 });
      },
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
      back: () => {
        if (depth.current > 1) history.back();
        else setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      },
      home: () => {
        setStack((s) => [s[0] as Route, { name: 'menu' }]);
        window.scrollTo({ top: 0 });
      },
    }),
    [],
  );

  const onPop = useCallback(() => {
    depth.current = Math.max(1, depth.current - 1);
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);
  useEffect(() => {
    history.replaceState({ d: 1 }, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onPop]);

  // Titre de l'onglet
  useEffect(() => {
    const titles: Partial<Record<Route['name'], string>> = {
      menu: 'Menu', solo: 'Solo', 'solo-play': 'Solo', 'versus-setup': 'Nouvelle partie', 'versus-play': 'Partie',
      online: 'En ligne', room: 'Salon', stats: 'Statistiques', categories: 'Catégories', settings: 'Paramètres', rules: 'Règles',
    };
    const t = titles[route.name];
    document.title = t ? `${t} — Magnitude` : 'Magnitude — le jeu des grands nombres';
  }, [route.name]);

  let screen: React.ReactNode;
  switch (route.name) {
    case 'title':
      screen = <TitleScreen />;
      break;
    case 'menu':
      screen = <MenuScreen />;
      break;
    case 'solo':
      screen = <SoloHub />;
      break;
    case 'solo-play':
      screen = <SoloPlay key={route.key} route={route} />;
      break;
    case 'versus-setup':
      screen = <VersusSetup kind={route.kind} />;
      break;
    case 'versus-play':
      screen = <VersusPlay key={route.key} route={route} />;
      break;
    case 'online':
      screen = <OnlineHome initialCode={route.code} initialTab={route.tab} />;
      break;
    case 'room':
      screen = <RoomScreen />;
      break;
    case 'stats':
      screen = <StatsScreen />;
      break;
    case 'categories':
      screen = <CategoriesScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    case 'rules':
      screen = <RulesScreen />;
      break;
  }

  return (
    <NavCtx.Provider value={nav}>
      <ToastProvider>
        <Stage reduced={reduced} />
        <ErrorBoundary onReset={nav.home}>
          <div key={stack.length + route.name}>{screen}</div>
        </ErrorBoundary>
      </ToastProvider>
    </NavCtx.Provider>
  );
}
