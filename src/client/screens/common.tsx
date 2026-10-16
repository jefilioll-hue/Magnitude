import { createContext, useContext, type ReactNode } from 'react';
import { audio } from '../audio/engine.ts';
import { setSettings, usePersisted } from '../lib/store.ts';
import { Icon } from '../ui/icons.tsx';
import { Button } from '../ui/kit.tsx';
import type { SoloMode } from '../../shared/solo.ts';
import type { CategoryId, Difficulty } from '../../shared/types.ts';
import type { GameSettings } from '../../shared/config.ts';
import type { AiLevel } from '../../shared/ai.ts';

export type Route =
  | { name: 'title' }
  | { name: 'menu' }
  | { name: 'solo' }
  | { name: 'solo-play'; mode: SoloMode; difficulty: Difficulty; categories: CategoryId[]; key: number }
  | { name: 'versus-setup'; kind: 'local' | 'ia' }
  | { name: 'versus-play'; kind: 'local' | 'ia'; settings: GameSettings; aiLevel?: AiLevel; key: number }
  | { name: 'online'; code?: string; tab?: 'create' | 'join' }
  | { name: 'room' }
  | { name: 'stats' }
  | { name: 'categories' }
  | { name: 'settings' }
  | { name: 'rules' };

export interface Nav {
  go: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => void;
  home: () => void;
}

export const NavCtx = createContext<Nav>({ go: () => undefined, replace: () => undefined, back: () => undefined, home: () => undefined });
export const useNav = () => useContext(NavCtx);

export function SoundToggle() {
  const muted = usePersisted((s) => s.settings.muted);
  return (
    <Button
      variant="ghost"
      icon={muted ? <Icon.mute /> : <Icon.sound />}
      aria-label={muted ? 'Activer le son' : 'Couper le son'}
      aria-pressed={!muted}
      sound="none"
      onClick={() => {
        void audio.unlock();
        setSettings({ muted: !muted });
      }}
    />
  );
}

export function ScreenHeader({ title, children, onBack }: { title: string; children?: ReactNode; onBack?: () => void }) {
  const nav = useNav();
  return (
    <header className="topbar">
      <Button variant="ghost" icon={<Icon.back />} aria-label="Retour" sound="back" onClick={onBack ?? nav.back} />
      <h1>{title}</h1>
      <div className="topbar__spacer" />
      {children}
      <SoundToggle />
    </header>
  );
}
