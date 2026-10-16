/**
 * Transport du jeu en ligne : un WebSocket vers le serveur Magnitude, ou, dans la version
 * publiée comme page partagée (sans serveur), le canal temps réel de la page (p2p/roomlink.ts).
 */
import { RoomLink, getRoomApi } from '../p2p/roomlink.ts';

export interface Link {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

export const LINK_CONNECTING = 0;
export const LINK_OPEN = 1;

export function wsUrl(): string {
  const override = (window as unknown as { MAGNITUDE_WS?: string }).MAGNITUDE_WS;
  if (override) return override;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

export function openLink(): Link {
  if (__STATIC__) return new RoomLink();
  return new WebSocket(wsUrl()) as unknown as Link;
}

/** Le jeu en ligne est-il possible ici ? (toujours vrai avec le serveur). */
export function onlineAvailable(): Promise<boolean> {
  if (!__STATIC__) return Promise.resolve(true);
  return getRoomApi().then((r) => r !== null);
}

/** Version sans serveur : l'appareil de l'hôte arbitre la partie. */
export const PEER_MODE = __STATIC__;
