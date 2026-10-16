/**
 * Jeu en ligne sans serveur, pour la version publiée comme page partagée.
 *
 * La page partagée offre un canal temps réel (« room ») entre les personnes qui l'ont
 * ouverte : chacun publie un petit objet de présence (4 Kio au plus) que tous reçoivent.
 * L'appareil de l'hôte fait tourner le MÊME gestionnaire de salons que le serveur Node
 * (src/server/rooms.ts) et fait autorité ; les autres joueurs lui envoient leurs intentions.
 *
 *  - joueur → hôte : présence { mc: code, o: [[n, message]…], r: dernier n reçu de l'hôte }
 *    (file non acquittée : rien ne se perd si une mise à jour est fusionnée avec la suivante) ;
 *  - hôte → joueurs : présence { mg: 1, code, ep, f, z } où z contient, compressés,
 *    les vues filtrées du salon (une par équipe) et, pour chaque joueur, sa file de messages
 *    et l'accusé de ses intentions.
 *
 * L'objet exposé imite un WebSocket : le client en ligne (game/online.ts) est inchangé.
 */
import { RoomManager } from '../../server/rooms.ts';
import { createBank } from '../../shared/deck.ts';
import { QUESTIONS } from '../../shared/questions/index.ts';
import { parseClientMessage, type ClientMessage, type RoomView, type ServerMessage } from '../../shared/protocol.ts';
import { randomId } from '../../shared/rand.ts';
import { jsonBytes, pack, unpack } from './codec.ts';

/* ------------------------------------------------------------------ accès au canal */

interface Peer {
  peer: string;
  sameTab: boolean;
  presence: Readonly<Record<string, unknown>>;
}
interface NamedRoom {
  presence(patch: Record<string, unknown>): Promise<void>;
  peers(): readonly Peer[];
  onPeers(handler: (change: { peers: readonly Peer[]; left: readonly Peer[] }) => void, onError?: (e: { code: string }) => void): () => void;
  leave(): Promise<void>;
}
interface RoomApi {
  join(name: string): Promise<NamedRoom>;
}

let apiPromise: Promise<RoomApi | null> | null = null;

/** Canal temps réel de la page, ou null (page ouverte hors de Claude, par lien public…). */
export function getRoomApi(): Promise<RoomApi | null> {
  apiPromise ??= (async () => {
    for (let i = 0; i < 60; i++) {
      const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
      if (c?.use) {
        try {
          return ((await c.use('room')) as RoomApi | null) ?? null;
        } catch {
          return null;
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  })();
  return apiPromise;
}

const roomName = (code: string) => `magnitude-${code.toLowerCase()}`;
const HOST_KEY = 'magnitude:host';
const MAX_PRESENCE = 3900;
const UNAVAILABLE =
  'Le jeu en ligne n’est pas disponible dans cette fenêtre. Ouvrez Magnitude depuis Claude, connecté à votre compte : la page doit avoir été partagée avec chaque joueur.';

function loadHostSnapshot(): { code: string; snap: string } | null {
  try {
    const raw = sessionStorage.getItem(HOST_KEY);
    return raw ? (JSON.parse(raw) as { code: string; snap: string }) : null;
  } catch {
    return null;
  }
}
function saveHostSnapshot(v: { code: string; snap: string } | null): void {
  try {
    if (v) sessionStorage.setItem(HOST_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(HOST_KEY);
  } catch {
    /* sans stockage, un rechargement de la page de l'hôte termine la partie */
  }
}

let bank: ReturnType<typeof createBank> | null = null;

/* ------------------------------------------------------------------ hôte */

type Mail = [number, ServerMessage];

class HostServer {
  private manager: RoomManager;
  private code: string | null = null;
  private room: NamedRoom | null = null;
  private readonly ep = randomId(6);
  private views = new Map<string, RoomView>();
  private mail = new Map<string, { n: number; q: Mail[] }>();
  private seen = new Map<string, number>();
  private conns = new Set<string>();
  private timers: number[] = [];
  private publishTimer = 0;
  private publishing = false;
  private again = false;
  private stopped = false;
  private unsub: (() => void) | null = null;

  private local: (m: ServerMessage) => void;

  constructor(local: (m: ServerMessage) => void, restore?: string) {
    this.local = local;
    bank ??= createBank(QUESTIONS);
    this.manager = new RoomManager({ bank, send: (c, m) => this.out(c, m) });
    if (restore) this.manager.restore(restore);
    this.manager.connect('local');
    this.timers.push(window.setInterval(() => this.manager.tick(), 200));
    this.timers.push(window.setInterval(() => this.persist(), 2000));
  }

  handleLocal(msg: ClientMessage): void {
    // L'appareil de l'hôte arbitre la partie : s'il part, le salon ferme pour tout le monde.
    const m: ClientMessage = msg.t === 'leave' ? { t: 'close' } : msg;
    try {
      this.manager.handle('local', m);
    } catch {
      this.local({ t: 'error', code: 'invalid_action', message: 'Action impossible à ce moment de la partie.' });
    }
  }

  private persist(): void {
    if (this.code && this.manager.isDirty()) saveHostSnapshot({ code: this.code, snap: this.manager.snapshot() });
  }

  private out(conn: string, msg: ServerMessage): void {
    if (conn === 'local') {
      if (msg.t === 'welcome') void this.attach(msg.session.roomCode);
      if (msg.t === 'closed') this.stopSoon();
      queueMicrotask(() => this.local(msg));
      return;
    }
    if (msg.t === 'room') this.views.set(conn, msg.room);
    else {
      const box = this.mail.get(conn) ?? { n: 0, q: [] };
      // Seul le dernier pong et le dernier brouillon comptent.
      if (msg.t === 'pong' || msg.t === 'drafts') box.q = box.q.filter(([, m]) => m.t !== msg.t);
      box.n += 1;
      box.q.push([box.n, msg]);
      if (box.q.length > 24) box.q.splice(0, box.q.length - 24);
      this.mail.set(conn, box);
      if (msg.t === 'closed') this.views.delete(conn);
    }
    this.schedule();
  }

  private async attach(code: string): Promise<void> {
    if (this.code === code || this.stopped) return;
    this.code = code;
    this.persist();
    saveHostSnapshot({ code, snap: this.manager.snapshot() });
    const api = await getRoomApi();
    if (!api || this.stopped) return;
    try {
      this.room = await api.join(roomName(code));
    } catch {
      return;
    }
    if (this.stopped) {
      void this.room.leave();
      return;
    }
    this.unsub = this.room.onPeers((ch) => this.onPeers(ch.peers, ch.left));
    this.schedule();
  }

  private onPeers(peers: readonly Peer[], left: readonly Peer[]): void {
    for (const p of left) this.drop(p.peer);
    for (const p of peers) {
      if (p.sameTab || p.presence.mc !== this.code) continue;
      if (!this.conns.has(p.peer)) {
        this.conns.add(p.peer);
        this.manager.connect(p.peer);
      }
      // Accusé de réception de nos messages : on vide la file.
      const r = p.presence.r;
      const box = this.mail.get(p.peer);
      if (box && typeof r === 'number') {
        const before = box.q.length;
        box.q = box.q.filter(([n]) => n > r);
        if (box.q.length !== before) this.schedule();
      }
      const o = p.presence.o;
      if (!Array.isArray(o)) continue;
      let seen = this.seen.get(p.peer) ?? 0;
      let handled = 0;
      for (const entry of o) {
        if (!Array.isArray(entry) || typeof entry[0] !== 'number' || entry[0] <= seen) continue;
        seen = entry[0];
        if (++handled > 30) break;
        const msg = parseClientMessage(JSON.stringify(entry[1]));
        if (!msg) {
          this.out(p.peer, { t: 'error', code: 'bad_message', message: 'Message non reconnu.' });
          continue;
        }
        try {
          this.manager.handle(p.peer, msg);
        } catch {
          this.out(p.peer, { t: 'error', code: 'invalid_action', message: 'Action impossible à ce moment de la partie.' });
        }
      }
      if (seen !== (this.seen.get(p.peer) ?? 0)) {
        this.seen.set(p.peer, seen);
        this.schedule();
      }
    }
  }

  private drop(peer: string): void {
    if (!this.conns.has(peer)) return;
    this.conns.delete(peer);
    this.manager.disconnect(peer);
    this.views.delete(peer);
    this.mail.delete(peer);
    this.seen.delete(peer);
    this.schedule();
  }

  private schedule(): void {
    if (this.publishTimer || this.stopped) return;
    this.publishTimer = window.setTimeout(() => {
      this.publishTimer = 0;
      void this.publish();
    }, 40);
  }

  private async publish(): Promise<void> {
    if (!this.room || !this.code) return;
    if (this.publishing) {
      this.again = true;
      return;
    }
    this.publishing = true;
    try {
      let payload = this.payload(false);
      let packed = await pack(payload);
      let presence = { mg: 1, code: this.code, ep: this.ep, ...packed };
      if (jsonBytes(presence) > MAX_PRESENCE) {
        payload = this.payload(true);
        packed = await pack(payload);
        presence = { mg: 1, code: this.code, ep: this.ep, ...packed };
      }
      if (jsonBytes(presence) <= MAX_PRESENCE) await this.room.presence(presence);
      else console.warn('[magnitude] état du salon trop volumineux pour le canal', jsonBytes(presence));
    } catch (e) {
      console.warn('[magnitude] publication impossible', e);
    } finally {
      this.publishing = false;
      if (this.again) {
        this.again = false;
        this.schedule();
      }
    }
  }

  private payload(lean: boolean): unknown {
    const keys: string[] = [];
    const views: unknown[] = [];
    const per: Record<string, unknown> = {};
    for (const conn of new Set([...this.conns, ...this.mail.keys()])) {
      const v = this.views.get(conn);
      let i = -1;
      if (v) {
        const { you: _you, serverNow: _now, ...rest } = v;
        const key = JSON.stringify(rest);
        i = keys.indexOf(key);
        if (i < 0) {
          keys.push(key);
          views.push(rest);
          i = keys.length - 1;
        }
      }
      const q = this.mail.get(conn)?.q ?? [];
      per[conn] = { i, y: v?.you ?? null, q: lean ? q.filter(([, m]) => m.t !== 'drafts') : q, a: this.seen.get(conn) ?? 0 };
    }
    return { now: Date.now(), v: views, p: per };
  }

  private stopSoon(): void {
    saveHostSnapshot(null);
    window.setTimeout(() => this.stop(), 1500);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.timers.forEach((t) => window.clearInterval(t));
    window.clearTimeout(this.publishTimer);
    this.unsub?.();
    void this.room?.leave();
  }

  /** Le joueur ferme le salon (bouton Quitter) : on prévient les autres avant de partir. */
  close(): void {
    if (this.stopped) return;
    this.handleLocal({ t: 'close' });
    this.stopSoon();
  }
}

/* ------------------------------------------------------------------ joueur distant */

let resumeFailures = 0;

class RemoteClient {
  private room: NamedRoom | null = null;
  private hostPeer: string | null = null;
  private lastHostPresence: unknown = null;
  private outbox: [number, ClientMessage][] = [];
  private seq = 0;
  private delivered = 0;
  private lastRoomKey = '';
  private decodeTicket = 0;
  private stopped = false;
  private unsub: (() => void) | null = null;
  private waitTimer = 0;

  private code: string;
  private deliver: (m: ServerMessage) => void;
  private fail: (why: 'notfound' | 'lost' | 'unavailable') => void;

  constructor(code: string, deliver: (m: ServerMessage) => void, fail: (why: 'notfound' | 'lost' | 'unavailable') => void) {
    this.code = code;
    this.deliver = deliver;
    this.fail = fail;
    void this.start();
  }

  private async start(): Promise<void> {
    const api = await getRoomApi();
    if (this.stopped) return;
    if (!api) return this.fail('unavailable');
    try {
      this.room = await api.join(roomName(this.code));
    } catch {
      return this.fail('unavailable');
    }
    if (this.stopped) {
      void this.room.leave();
      return;
    }
    this.pushPresence();
    this.unsub = this.room.onPeers(() => this.onPeers());
    this.waitTimer = window.setTimeout(() => {
      if (!this.hostPeer && !this.stopped) this.fail('notfound');
    }, 8000);
  }

  private pushPresence(): void {
    if (!this.room || this.stopped) return;
    void this.room.presence({ mc: this.code, o: this.outbox, r: this.delivered }).catch(() => undefined);
  }

  send(msg: ClientMessage): void {
    if (msg.t === 'ping' || msg.t === 'draft') this.outbox = this.outbox.filter(([, m]) => m.t !== msg.t);
    this.seq += 1;
    this.outbox.push([this.seq, msg]);
    if (this.outbox.length > 20) this.outbox.splice(0, this.outbox.length - 20);
    this.pushPresence();
  }

  private onPeers(): void {
    if (!this.room || this.stopped) return;
    const host = this.room.peers().find((p) => !p.sameTab && p.presence.mg === 1 && p.presence.code === this.code);
    if (!host) {
      if (this.hostPeer) this.fail('lost');
      return;
    }
    if (this.hostPeer && host.peer !== this.hostPeer) return this.fail('lost'); // l'hôte a rechargé sa page
    if (!this.hostPeer) {
      this.hostPeer = host.peer;
      resumeFailures = 0;
      window.clearTimeout(this.waitTimer);
    }
    if (host.presence === this.lastHostPresence) return;
    this.lastHostPresence = host.presence;
    void this.decode(host.presence);
  }

  private async decode(presence: Readonly<Record<string, unknown>>): Promise<void> {
    const ticket = ++this.decodeTicket;
    const data = (await unpack(presence)) as { now?: number; v?: unknown[]; p?: Record<string, unknown> } | null;
    if (ticket !== this.decodeTicket || this.stopped || !data || !this.room) return; // un état plus récent arrive
    const me = this.room.peers().find((p) => p.sameTab)?.peer;
    const entry = me ? (data.p?.[me] as { i?: number; y?: RoomView['you'] | null; q?: Mail[]; a?: number } | undefined) : undefined;
    if (!entry) return;
    let changed = false;
    for (const item of entry.q ?? []) {
      if (!Array.isArray(item) || typeof item[0] !== 'number' || item[0] <= this.delivered) continue;
      this.delivered = item[0];
      changed = true;
      this.deliver(item[1]);
    }
    const view = typeof entry.i === 'number' && entry.i >= 0 ? data.v?.[entry.i] : null;
    if (view && entry.y) {
      const room = { ...(view as Omit<RoomView, 'you' | 'serverNow'>), you: entry.y, serverNow: data.now ?? Date.now() } as RoomView;
      const key = JSON.stringify(view) + JSON.stringify(entry.y);
      if (key !== this.lastRoomKey) {
        this.lastRoomKey = key;
        this.deliver({ t: 'room', room });
      }
    }
    if (typeof entry.a === 'number') {
      const before = this.outbox.length;
      this.outbox = this.outbox.filter(([n]) => n > (entry.a as number));
      if (before !== this.outbox.length) changed = true;
    }
    if (changed) this.pushPresence();
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    window.clearTimeout(this.waitTimer);
    this.unsub?.();
    void this.room?.leave();
  }
}

/* ------------------------------------------------------------------ « socket » */

export class RoomLink {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private hello: ClientMessage | null = null;
  private host: HostServer | null = null;
  private remote: RemoteClient | null = null;
  private resuming = false;

  constructor() {
    window.setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }

  private emit(msg: ServerMessage): void {
    if (this.readyState !== 1) return;
    queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(msg) }));
  }

  private drop(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.host?.stop();
    this.remote?.stop();
    window.setTimeout(() => this.onclose?.(), 0);
  }

  send(data: string): void {
    if (this.readyState !== 1) return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data) as ClientMessage;
    } catch {
      return;
    }
    switch (msg.t) {
      case 'hello': {
        this.hello = msg;
        const s = msg.session;
        if (!s) return;
        const saved = loadHostSnapshot();
        if (saved && saved.code === s.roomCode) {
          this.startHost(saved.snap);
          this.host?.handleLocal(msg);
        } else {
          this.resuming = true;
          this.startRemote(s.roomCode);
          this.remote?.send(msg);
        }
        return;
      }
      case 'create':
        void getRoomApi().then((api) => {
          if (!api) return this.emit({ t: 'error', code: 'server_full', message: UNAVAILABLE, ref: 'create' });
          this.startHost();
          if (this.hello) this.host?.handleLocal(this.hello);
          this.host?.handleLocal(msg);
        });
        return;
      case 'join':
        this.resuming = false;
        this.startRemote(msg.code);
        if (this.hello) this.remote?.send(this.hello);
        this.remote?.send(msg);
        return;
      case 'ping':
        if (!this.host && !this.remote) return this.emit({ t: 'pong', at: msg.at, server: Date.now() });
        break;
      default:
        break;
    }
    if (this.host) this.host.handleLocal(msg);
    else if (this.remote) this.remote.send(msg);
    else if (msg.t !== 'draft' && msg.t !== 'leave') this.emit({ t: 'error', code: 'not_in_room', message: 'Vous n’êtes plus dans ce salon.', ref: msg.t });
  }

  private startHost(restore?: string): void {
    this.remote?.stop();
    this.remote = null;
    this.host?.stop();
    this.host = new HostServer((m) => this.emit(m), restore);
  }

  private startRemote(code: string): void {
    this.host?.stop();
    this.host = null;
    this.remote?.stop();
    const client: RemoteClient = new RemoteClient(
      code,
      (m) => this.emit(m),
      (why) => {
        if (this.remote !== client) return;
        client.stop();
        this.remote = null;
        if (why === 'unavailable') {
          this.emit({ t: 'error', code: 'server_full', message: UNAVAILABLE, ref: 'join' });
        } else if (why === 'notfound' && !this.resuming) {
          this.emit({ t: 'error', code: 'room_not_found', message: 'Aucun salon ne répond à ce code. Vérifiez-le, et que l’hôte a bien la page ouverte.', ref: 'join' });
        } else if (why === 'notfound' && ++resumeFailures >= 6) {
          // L'hôte ne revient pas : la partie est terminée.
          resumeFailures = 0;
          this.emit({ t: 'closed', reason: 'expired' });
        } else {
          this.drop(); // reconnexion automatique par le client en ligne
        }
      },
    );
    this.remote = client;
  }

  close(): void {
    if (this.readyState === 3) return;
    if (this.host) {
      const h = this.host;
      this.host = null;
      h.close();
    }
    this.drop();
  }
}
