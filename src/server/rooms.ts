/**
 * Gestionnaire de salons — le serveur fait autorité sur l'état des parties.
 *
 * Indépendant du transport : chaque connexion est identifiée par un `connId`
 * et les messages sortants passent par la fonction `send`. Le module réseau
 * (index.ts) relie ces connexions à de vrais WebSockets ; les tests peuvent
 * l'utiliser directement.
 */
import { randomId, randomIntBelow, sameString } from '../shared/rand.ts';
import { cleanText, sanitizeSettings, type GameSettings } from '../shared/config.ts';
import { createVersus, reduce, versusView, type VersusState } from '../shared/engine.ts';
import type { QuestionBank } from '../shared/deck.ts';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  ERROR_TEXT,
  MAX_PLAYERS,
  PROTOCOL_VERSION,
  isValidCode,
  normalizeCode,
  type ClientMessage,
  type ErrorCode,
  type RoomView,
  type ServerMessage,
} from '../shared/protocol.ts';
import type { TeamId } from '../shared/types.ts';

// Le gestionnaire tourne aussi dans le navigateur de l'hôte (version autonome) : pas de process.env là-bas.
const ENV: Record<string, string | undefined> = typeof process !== 'undefined' && process.env ? process.env : {};
const env = (k: string, d: number) => (ENV[k] !== undefined && Number.isFinite(Number(ENV[k])) ? Number(ENV[k]) : d);

/** Délais (ms) ; surchargeables par variables d'environnement, notamment pour les tests. */
export const LIMITS = {
  maxRooms: env('MAX_ROOMS', 2000),
  hostGraceMs: env('HOST_GRACE_MS', 15_000),
  lobbyDropMs: env('LOBBY_DROP_MS', 120_000),
  emptyLobbyMs: env('EMPTY_LOBBY_MS', 10 * 60_000),
  emptyGameMs: env('EMPTY_GAME_MS', 15 * 60_000),
  finishedIdleMs: env('FINISHED_IDLE_MS', 30 * 60_000),
  forfeitGraceMs: env('FORFEIT_GRACE_MS', 20_000),
  actionMemory: 64,
};

interface Player {
  id: string;
  token: string;
  name: string;
  avatar: number;
  team: TeamId;
  joinedAt: number;
  connected: boolean;
  lastSeen: number;
  conn: string | null;
  processed: [string, { ok: boolean; error?: string }][];
  draft: string;
}

interface Room {
  code: string;
  createdAt: number;
  lastActivity: number;
  hostId: string;
  locked: boolean;
  status: RoomView['status'];
  settings: GameSettings;
  players: Player[];
  game: VersusState | null;
  emptyTeamSince: Partial<Record<TeamId, number>>;
  dirty: boolean;
}

export interface ManagerDeps {
  bank: QuestionBank;
  send: (connId: string, msg: ServerMessage) => void;
  now?: () => number;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
}

const newId = (bytes = 9) => randomId(bytes);
const sameToken = (a: string, b: string) => sameString(a, b);

export class RoomManager {
  private rooms = new Map<string, Room>();
  private conns = new Map<string, { roomCode: string | null; playerId: string | null }>();
  private structureChanged = false;
  private deps: Required<Omit<ManagerDeps, 'log'>> & Pick<ManagerDeps, 'log'>;

  constructor(deps: ManagerDeps) {
    this.deps = { now: () => Date.now(), ...deps };
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  get playerCount(): number {
    let n = 0;
    for (const r of this.rooms.values()) n += r.players.filter((p) => p.connected).length;
    return n;
  }

  /* --------------------------------------------------------------- connexions */

  connect(connId: string): void {
    this.conns.set(connId, { roomCode: null, playerId: null });
  }

  disconnect(connId: string): void {
    const c = this.conns.get(connId);
    this.conns.delete(connId);
    if (!c?.roomCode || !c.playerId) return;
    const room = this.rooms.get(c.roomCode);
    const p = room?.players.find((x) => x.id === c.playerId);
    if (!room || !p || p.conn !== connId) return;
    p.connected = false;
    p.conn = null;
    p.lastSeen = this.deps.now();
    p.draft = '';
    this.touch(room);
    this.broadcast(room);
  }

  /* --------------------------------------------------------------- messages */

  handle(connId: string, msg: ClientMessage): void {
    const c = this.conns.get(connId);
    if (!c) return;
    const now = this.deps.now();
    switch (msg.t) {
      case 'hello':
        if (msg.v !== PROTOCOL_VERSION) return this.error(connId, 'version');
        if (msg.session) return this.resume(connId, msg.session);
        return;
      case 'ping':
        this.deps.send(connId, { t: 'pong', at: msg.at, server: now });
        return;
      case 'create':
        return this.create(connId, msg);
      case 'join':
        return this.join(connId, msg);
      default:
        break;
    }
    const ctx = this.context(connId);
    if (!ctx) return this.error(connId, 'not_in_room', msg.t);
    const { room, player } = ctx;
    room.lastActivity = now;
    switch (msg.t) {
      case 'leave':
        this.removePlayer(room, player.id, 'left');
        return;
      case 'team':
        if (room.status === 'playing') return this.error(connId, 'invalid_action', 'team');
        player.team = msg.team;
        break;
      case 'settings':
        if (player.id !== room.hostId) return this.error(connId, 'not_host', 'settings');
        if (room.status === 'playing') return this.error(connId, 'invalid_action', 'settings');
        room.settings = sanitizeSettings(msg.settings);
        break;
      case 'lock':
        if (player.id !== room.hostId) return this.error(connId, 'not_host', 'lock');
        room.locked = msg.locked;
        break;
      case 'kick': {
        if (player.id !== room.hostId) return this.error(connId, 'not_host', 'kick');
        if (msg.playerId === player.id) return this.error(connId, 'invalid_action', 'kick');
        this.removePlayer(room, msg.playerId, 'kicked');
        return;
      }
      case 'close':
        if (player.id !== room.hostId) return this.error(connId, 'not_host', 'close');
        this.closeRoom(room, 'closed_by_host');
        return;
      case 'start': {
        if (player.id !== room.hostId) return this.error(connId, 'not_host', 'start');
        if (room.status === 'playing') return this.error(connId, 'invalid_action', 'start');
        const a = room.players.filter((p) => p.team === 'A' && p.connected).length;
        const b = room.players.filter((p) => p.team === 'B' && p.connected).length;
        if (a < 1 || b < 1) return this.error(connId, 'not_enough_players', 'start');
        const seed = 1 + randomIntBelow(2 ** 31 - 2);
        room.game = createVersus(this.deps.bank, room.settings, seed, now);
        room.status = 'playing';
        room.emptyTeamSince = {};
        for (const p of room.players) p.draft = '';
        this.deps.log?.('partie lancée', { code: room.code, players: room.players.length });
        break;
      }
      case 'rematch':
        if (player.id !== room.hostId) return this.error(connId, 'not_host', 'rematch');
        if (room.status !== 'finished') return this.error(connId, 'invalid_action', 'rematch');
        room.status = 'lobby';
        room.game = null;
        break;
      case 'act':
        return this.act(connId, room, player, msg);
      case 'draft':
        if (room.status !== 'playing') return;
        player.draft = cleanText(msg.text, 24, '');
        this.sendDrafts(room, player.team);
        return;
      default:
        return;
    }
    this.touch(room);
    this.broadcast(room);
  }

  private context(connId: string): { room: Room; player: Player } | null {
    const c = this.conns.get(connId);
    if (!c?.roomCode || !c.playerId) return null;
    const room = this.rooms.get(c.roomCode);
    const player = room?.players.find((p) => p.id === c.playerId);
    if (!room || !player || player.conn !== connId) return null;
    return { room, player };
  }

  private bind(connId: string, room: Room, player: Player): void {
    // Une seule connexion active par joueur : l'ancienne est détachée.
    if (player.conn && player.conn !== connId) {
      const old = this.conns.get(player.conn);
      if (old) {
        old.roomCode = null;
        old.playerId = null;
      }
    }
    player.conn = connId;
    player.connected = true;
    player.lastSeen = this.deps.now();
    const c = this.conns.get(connId);
    if (c) {
      // Quitte proprement un éventuel autre salon.
      if (c.roomCode && c.roomCode !== room.code) {
        const prev = this.rooms.get(c.roomCode);
        if (prev && c.playerId) this.removePlayer(prev, c.playerId, 'left', true);
      }
      c.roomCode = room.code;
      c.playerId = player.id;
    }
    this.deps.send(connId, { t: 'welcome', session: { roomCode: room.code, playerId: player.id, token: player.token } });
  }

  private resume(connId: string, s: { roomCode: string; playerId: string; token: string }): void {
    const room = this.rooms.get(normalizeCode(s.roomCode));
    if (!room) return this.error(connId, 'room_expired', 'resume');
    const p = room.players.find((x) => x.id === s.playerId);
    if (!p || !sameToken(p.token, s.token)) return this.error(connId, 'session_invalid', 'resume');
    this.bind(connId, room, p);
    this.touch(room);
    this.broadcast(room);
    if (room.status === 'playing') this.sendDrafts(room, p.team);
  }

  private newPlayer(name: string, avatar: number, team: TeamId): Player {
    const now = this.deps.now();
    return {
      id: newId(),
      token: newId(24),
      name: cleanText(name, 20, 'Joueur'),
      avatar: Math.max(0, Math.min(63, Math.round(avatar))),
      team,
      joinedAt: now,
      connected: true,
      lastSeen: now,
      conn: null,
      processed: [],
      draft: '',
    };
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomIntBelow(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Impossible de générer un code unique');
  }

  private create(connId: string, msg: Extract<ClientMessage, { t: 'create' }>): void {
    if (this.rooms.size >= LIMITS.maxRooms) return this.error(connId, 'server_full', 'create');
    const now = this.deps.now();
    const host = this.newPlayer(msg.name, msg.avatar, 'A');
    const room: Room = {
      code: this.generateCode(),
      createdAt: now,
      lastActivity: now,
      hostId: host.id,
      locked: false,
      status: 'lobby',
      settings: sanitizeSettings(msg.settings),
      players: [host],
      game: null,
      emptyTeamSince: {},
      dirty: true,
    };
    this.rooms.set(room.code, room);
    this.bind(connId, room, host);
    this.deps.log?.('salon créé', { code: room.code });
    this.broadcast(room);
  }

  private join(connId: string, msg: Extract<ClientMessage, { t: 'join' }>): void {
    const code = normalizeCode(msg.code);
    if (!isValidCode(code)) return this.error(connId, 'room_not_found', 'join');
    const room = this.rooms.get(code);
    if (!room) return this.error(connId, 'room_not_found', 'join');
    if (room.status === 'playing') return this.error(connId, 'room_started', 'join');
    if (room.locked) return this.error(connId, 'room_locked', 'join');
    if (room.players.length >= MAX_PLAYERS) return this.error(connId, 'room_full', 'join');
    const a = room.players.filter((p) => p.team === 'A').length;
    const b = room.players.filter((p) => p.team === 'B').length;
    // L'équipe la moins nombreuse accueille le nouveau joueur.
    const p = this.newPlayer(msg.name, msg.avatar, a > b ? 'B' : 'A');
    room.players.push(p);
    this.bind(connId, room, p);
    this.touch(room);
    this.broadcast(room);
  }

  private removePlayer(room: Room, playerId: string, reason: 'left' | 'kicked', silent = false): void {
    const p = room.players.find((x) => x.id === playerId);
    if (!p) return;
    room.players = room.players.filter((x) => x.id !== playerId);
    if (p.conn) {
      const c = this.conns.get(p.conn);
      if (c) {
        c.roomCode = null;
        c.playerId = null;
      }
      if (!silent) this.deps.send(p.conn, { t: 'closed', reason });
    }
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      this.structureChanged = true;
      return;
    }
    if (room.hostId === playerId) this.migrateHost(room);
    this.touch(room);
    this.broadcast(room);
  }

  private migrateHost(room: Room): void {
    const next = [...room.players].sort((a, b) => Number(b.connected) - Number(a.connected) || a.joinedAt - b.joinedAt)[0];
    if (next) room.hostId = next.id;
  }

  private closeRoom(room: Room, reason: 'closed_by_host' | 'expired'): void {
    for (const p of room.players) {
      if (p.conn) {
        this.deps.send(p.conn, { t: 'closed', reason });
        const c = this.conns.get(p.conn);
        if (c) {
          c.roomCode = null;
          c.playerId = null;
        }
      }
    }
    this.rooms.delete(room.code);
    this.structureChanged = true;
  }

  /** Porte-parole d'une équipe pour la manche en cours : rotation parmi les joueurs connectés. */
  spokesperson(room: Room, team: TeamId): Player | null {
    const members = room.players.filter((p) => p.team === team && p.connected).sort((a, b) => a.joinedAt - b.joinedAt);
    if (members.length === 0) return null;
    const g = room.game;
    const turn = g ? Math.max(0, g.round - 1) + (g.tb?.index ?? 0) : 0;
    return members[turn % members.length] ?? null;
  }

  private act(connId: string, room: Room, player: Player, msg: Extract<ClientMessage, { t: 'act' }>): void {
    const seen = player.processed.find(([id]) => id === msg.id);
    if (seen) {
      this.deps.send(connId, { t: 'ack', id: msg.id, ...seen[1] });
      return;
    }
    const remember = (r: { ok: boolean; error?: string }) => {
      player.processed.push([msg.id, r]);
      if (player.processed.length > LIMITS.actionMemory) player.processed.shift();
      this.deps.send(connId, { t: 'ack', id: msg.id, ...r });
    };
    const g = room.game;
    if (room.status !== 'playing' || !g) return remember({ ok: false, error: 'invalid_action' });
    if (msg.step !== g.step) return remember({ ok: false, error: 'stale' });
    const a = msg.action;
    if (a.type === 'advance') {
      if (player.id !== room.hostId) return remember({ ok: false, error: 'not_host' });
    } else {
      if (a.team !== player.team) return remember({ ok: false, error: 'invalid_action' });
      const sp = this.spokesperson(room, player.team);
      if (!sp || sp.id !== player.id) return remember({ ok: false, error: 'not_spokesperson' });
    }
    const r = reduce(g, { ...a, now: this.deps.now() }, this.deps.bank);
    if (!r.ok) return remember({ ok: false, error: r.error });
    this.applyGame(room, r.state);
    remember({ ok: true });
    this.broadcast(room);
  }

  private applyGame(room: Room, state: VersusState): void {
    const phaseChanged = room.game?.phase !== state.phase || room.game?.round !== state.round;
    room.game = state;
    if (state.phase === 'over') room.status = 'finished';
    if (phaseChanged) {
      for (const p of room.players) p.draft = '';
    }
    this.touch(room);
  }

  /* --------------------------------------------------------------- horloge */

  tick(): void {
    const now = this.deps.now();
    for (const room of [...this.rooms.values()]) {
      const g = room.game;
      let changed = false;
      if (room.status === 'playing' && g && g.deadline !== null && now >= g.deadline) {
        const r = reduce(g, { type: 'tick', now }, this.deps.bank);
        if (r.ok) {
          this.applyGame(room, r.state);
          changed = true;
        }
      }
      // Équipe vide pendant la partie (tous partis) → forfait après un délai de grâce.
      if (room.status === 'playing' && room.game) {
        for (const t of ['A', 'B'] as TeamId[]) {
          const present = room.players.some((p) => p.team === t);
          if (present) delete room.emptyTeamSince[t];
          else if (room.emptyTeamSince[t] === undefined) room.emptyTeamSince[t] = now;
          else if (now - (room.emptyTeamSince[t] as number) > LIMITS.forfeitGraceMs) {
            const r = reduce(room.game, { type: 'forfeit', team: t, now }, this.deps.bank);
            if (r.ok) {
              this.applyGame(room, r.state);
              changed = true;
            }
          }
        }
      }
      // Hôte déconnecté trop longtemps → un autre joueur connecté reprend la main.
      const host = room.players.find((p) => p.id === room.hostId);
      if (host && !host.connected && now - host.lastSeen > LIMITS.hostGraceMs && room.players.some((p) => p.connected)) {
        this.migrateHost(room);
        changed = true;
      }
      // Dans le salon d'attente, les joueurs partis depuis longtemps sont retirés.
      if (room.status !== 'playing') {
        for (const p of room.players) {
          if (!p.connected && now - p.lastSeen > LIMITS.lobbyDropMs) {
            this.removePlayer(room, p.id, 'left', true);
            if (!this.rooms.has(room.code)) break;
          }
        }
        if (!this.rooms.has(room.code)) continue;
      }
      // Expiration des salons abandonnés.
      const anyone = room.players.some((p) => p.connected);
      const idle = now - room.lastActivity;
      if (
        (!anyone && room.status === 'lobby' && idle > LIMITS.emptyLobbyMs) ||
        (!anyone && room.status === 'playing' && idle > LIMITS.emptyGameMs) ||
        (room.status === 'finished' && idle > LIMITS.finishedIdleMs)
      ) {
        this.closeRoom(room, 'expired');
        continue;
      }
      if (changed) this.broadcast(room);
    }
  }

  /* --------------------------------------------------------------- diffusion */

  private touch(room: Room): void {
    room.lastActivity = this.deps.now();
    room.dirty = true;
  }

  viewFor(room: Room, player: Player): RoomView {
    const sp = { A: this.spokesperson(room, 'A')?.id ?? null, B: this.spokesperson(room, 'B')?.id ?? null };
    return {
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      locked: room.locked,
      players: room.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, team: p.team, connected: p.connected, isHost: p.id === room.hostId })),
      settings: room.settings,
      game: room.game ? versusView(room.game, this.deps.bank, player.team) : null,
      you: { id: player.id, team: player.team },
      spokesperson: sp,
      serverNow: this.deps.now(),
    };
  }

  private broadcast(room: Room): void {
    if (!this.rooms.has(room.code)) return;
    for (const p of room.players) {
      if (p.connected && p.conn) this.deps.send(p.conn, { t: 'room', room: this.viewFor(room, p) });
    }
  }

  private sendDrafts(room: Room, team: TeamId): void {
    const members = room.players.filter((p) => p.team === team && p.connected && p.conn);
    for (const m of members) {
      const drafts = members.filter((x) => x.id !== m.id && x.draft).map((x) => ({ name: x.name, text: x.draft }));
      this.deps.send(m.conn as string, { t: 'drafts', drafts });
    }
  }

  private error(connId: string, code: ErrorCode, ref?: string): void {
    this.deps.send(connId, { t: 'error', code, message: ERROR_TEXT[code], ref });
  }

  /* --------------------------------------------------------------- persistance */

  snapshot(): string {
    const rooms = [...this.rooms.values()].map((r) => ({
      ...r,
      players: r.players.map((p) => ({ ...p, conn: null, connected: false })),
    }));
    return JSON.stringify({ v: 1, savedAt: this.deps.now(), rooms });
  }

  restore(json: string): number {
    try {
      const data = JSON.parse(json) as { v: number; rooms: Room[] };
      if (data.v !== 1 || !Array.isArray(data.rooms)) return 0;
      const now = this.deps.now();
      for (const r of data.rooms) {
        // Les questions de la partie doivent toujours exister dans la banque actuelle.
        if (r.game && !r.game.deck.every((id) => this.deps.bank.byId.has(id))) continue;
        r.players = r.players.map((p) => ({ ...p, conn: null, connected: false, lastSeen: now }));
        r.lastActivity = now;
        r.settings = sanitizeSettings(r.settings);
        this.rooms.set(r.code, r);
      }
      return this.rooms.size;
    } catch {
      return 0;
    }
  }

  isDirty(): boolean {
    let d = this.structureChanged;
    this.structureChanged = false;
    for (const r of this.rooms.values()) {
      if (r.dirty) d = true;
      r.dirty = false;
    }
    return d;
  }

  /** Pour les tests et le diagnostic. */
  debugRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }
}

