/**
 * Client temps réel : une connexion WebSocket unique, résiliente.
 *
 *  - reconnexion automatique avec délai croissant (0,5 s → 8 s) ;
 *  - reprise de session (onglet rafraîchi, réseau coupé) grâce au jeton stocké
 *    dans sessionStorage : chaque onglet est un joueur distinct ;
 *  - synchronisation d'horloge (ping/pong) pour afficher les mêmes chronos que le serveur ;
 *  - chaque action porte un identifiant unique : un renvoi après coupure n'est jamais appliqué deux fois.
 */
import { useSyncExternalStore } from 'react';
import { LINK_CONNECTING, LINK_OPEN, openLink, type Link } from './transport.ts';
import { ERROR_TEXT, PROTOCOL_VERSION, type ClientMessage, type ErrorCode, type GameAction, type RoomView, type ServerMessage, type Session } from '../../shared/protocol.ts';

export type ConnStatus = 'idle' | 'connecting' | 'online' | 'reconnecting' | 'offline';

export interface OnlineState {
  status: ConnStatus;
  room: RoomView | null;
  session: Session | null;
  error: { code: ErrorCode | 'network'; message: string; ref?: string; at: number } | null;
  closed: { reason: string; at: number } | null;
  drafts: { name: string; text: string }[];
  clockOffset: number;
  pendingActions: number;
  lastActionError: { error: string; at: number } | null;
}

const SESSION_KEY = 'magnitude:session';

function loadSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function storeSession(s: Session | null): void {
  try {
    if (s) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* stockage indisponible : la reprise après rafraîchissement ne sera pas possible */
  }
}

class OnlineClient {
  private ws: Link | null = null;
  private listeners = new Set<() => void>();
  private retry = 0;
  private retryTimer = 0;
  private pingTimer = 0;
  private outbox: ClientMessage[] = [];
  private pending = new Map<string, { msg: ClientMessage; at: number }>();
  private wantOpen = false;
  private samples: number[] = [];
  state: OnlineState = {
    status: 'idle',
    room: null,
    session: typeof window !== 'undefined' ? loadSession() : null,
    error: null,
    closed: null,
    drafts: [],
    clockOffset: 0,
    pendingActions: 0,
    lastActionError: null,
  };

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(patch: Partial<OnlineState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  get hasSession(): boolean {
    return this.state.session !== null;
  }

  /** Ouvre la connexion (idempotent). */
  open(): void {
    this.wantOpen = true;
    if (this.ws && (this.ws.readyState === LINK_OPEN || this.ws.readyState === LINK_CONNECTING)) return;
    window.clearTimeout(this.retryTimer);
    this.set({ status: this.retry > 0 ? 'reconnecting' : 'connecting' });
    let ws: Link;
    try {
      ws = openLink();
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.set({ status: 'online', error: this.state.error?.code === 'network' ? null : this.state.error });
      this.raw({ t: 'hello', v: PROTOCOL_VERSION, ...(this.state.session ? { session: this.state.session } : {}) });
      this.ping();
      window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => this.ping(), 5000);
      // Renvoie ce qui attendait (les identifiants d'action évitent les doublons côté serveur).
      const queued = this.outbox.splice(0);
      for (const m of queued) this.raw(m);
      for (const [, p] of this.pending) this.raw(p.msg);
    };
    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      this.receive(msg);
    };
    ws.onclose = () => {
      window.clearInterval(this.pingTimer);
      this.ws = null;
      if (this.wantOpen) this.scheduleRetry();
      else this.set({ status: 'idle' });
    };
    ws.onerror = () => ws.close();
  }

  private scheduleRetry(): void {
    this.retry += 1;
    const delay = Math.min(8000, 500 * 2 ** Math.min(this.retry - 1, 4)) * (0.8 + Math.random() * 0.4);
    this.set({ status: this.retry > 6 ? 'offline' : 'reconnecting' });
    this.retryTimer = window.setTimeout(() => this.open(), delay);
  }

  /** Ferme la connexion et oublie le salon. */
  close(): void {
    this.wantOpen = false;
    storeSession(null);
    this.pending.clear();
    this.outbox = [];
    this.set({ room: null, session: null, drafts: [], pendingActions: 0 });
    this.ws?.close();
  }

  private raw(m: ClientMessage): void {
    if (this.ws && this.ws.readyState === LINK_OPEN) this.ws.send(JSON.stringify(m));
  }

  send(m: ClientMessage): void {
    this.open();
    if (this.ws && this.ws.readyState === LINK_OPEN) this.raw(m);
    else if (m.t !== 'ping' && m.t !== 'draft') this.outbox.push(m);
  }

  act(action: GameAction): void {
    const room = this.state.room;
    if (!room?.game) return;
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const msg: ClientMessage = { t: 'act', id, step: room.game.step, action };
    this.pending.set(id, { msg, at: Date.now() });
    this.set({ pendingActions: this.pending.size });
    this.send(msg);
  }

  private ping(): void {
    this.raw({ t: 'ping', at: Date.now() });
  }

  private receive(msg: ServerMessage): void {
    switch (msg.t) {
      case 'welcome':
        storeSession(msg.session);
        this.set({ session: msg.session, closed: null, error: null });
        break;
      case 'room':
        // Les états reçus en retard (pas plus anciens) sont ignorés.
        if (this.state.room?.game && msg.room.game && msg.room.code === this.state.room.code && msg.room.game.step < this.state.room.game.step && msg.room.status === this.state.room.status) {
          break;
        }
        this.set({ room: msg.room, drafts: msg.room.status === 'playing' ? this.state.drafts : [] });
        if (this.samples.length === 0) this.set({ clockOffset: msg.room.serverNow - Date.now() });
        break;
      case 'drafts':
        this.set({ drafts: msg.drafts });
        break;
      case 'ack': {
        this.pending.delete(msg.id);
        this.set({ pendingActions: this.pending.size, lastActionError: msg.ok ? this.state.lastActionError : { error: msg.error ?? 'invalid_action', at: Date.now() } });
        break;
      }
      case 'pong': {
        const rtt = Date.now() - msg.at;
        const offset = msg.server - (msg.at + rtt / 2);
        this.samples = [...this.samples, offset].slice(-7);
        const sorted = [...this.samples].sort((a, b) => a - b);
        this.set({ clockOffset: sorted[Math.floor(sorted.length / 2)] ?? 0 });
        break;
      }
      case 'error':
        if (msg.code === 'session_invalid' || msg.code === 'room_expired') {
          storeSession(null);
          this.set({ session: null, room: null });
        }
        this.set({ error: { code: msg.code, message: msg.message || ERROR_TEXT[msg.code], ref: msg.ref, at: Date.now() } });
        break;
      case 'closed':
        storeSession(null);
        this.pending.clear();
        this.set({ room: null, session: null, closed: { reason: msg.reason, at: Date.now() }, pendingActions: 0, drafts: [] });
        break;
    }
  }

  clearError(): void {
    this.set({ error: null, closed: null });
  }
}

export const online = new OnlineClient();

export function useOnline(): OnlineState {
  return useSyncExternalStore(online.subscribe, () => online.state, () => online.state);
}
