/**
 * Protocole temps réel client ⇄ serveur (WebSocket, messages JSON).
 * Le serveur fait autorité : le client n'envoie que des intentions,
 * le serveur valide, applique le moteur et diffuse l'état filtré.
 */
import type { GameSettings } from './config.ts';
import type { VersusView } from './engine.ts';
import type { ContestCall, TeamId } from './types.ts';

export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_BYTES = 8 * 1024;
export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 2;
/** Alphabet des codes de salon : sans 0/O, 1/I/L, pour être dicté sans ambiguïté. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export interface Session {
  roomCode: string;
  playerId: string;
  token: string;
}

export type GameAction =
  | { type: 'estimate'; team: TeamId; value: number; bet?: boolean }
  | { type: 'joker'; team: TeamId; joker: 'hint' | 'swap' }
  | { type: 'contest'; team: TeamId; call: ContestCall; double?: boolean }
  | { type: 'tb_estimate'; team: TeamId; value: number }
  | { type: 'advance' };

export type ClientMessage =
  | { t: 'hello'; v: number; session?: Session }
  | { t: 'create'; name: string; avatar: number; settings: unknown }
  | { t: 'join'; code: string; name: string; avatar: number }
  | { t: 'leave' }
  | { t: 'team'; team: TeamId }
  | { t: 'settings'; settings: unknown }
  | { t: 'lock'; locked: boolean }
  | { t: 'kick'; playerId: string }
  | { t: 'start' }
  | { t: 'close' }
  | { t: 'rematch' }
  | { t: 'act'; id: string; step: number; action: GameAction }
  | { t: 'draft'; text: string }
  | { t: 'ping'; at: number };

export interface PlayerView {
  id: string;
  name: string;
  avatar: number;
  team: TeamId;
  connected: boolean;
  isHost: boolean;
}

export interface RoomView {
  code: string;
  status: 'lobby' | 'playing' | 'finished';
  hostId: string;
  locked: boolean;
  players: PlayerView[];
  settings: GameSettings;
  game: VersusView | null;
  you: { id: string; team: TeamId };
  /** Joueur qui verrouille les décisions de chaque équipe pour la manche en cours. */
  spokesperson: Record<TeamId, string | null>;
  serverNow: number;
}

export type ErrorCode =
  | 'bad_message'
  | 'rate_limited'
  | 'room_not_found'
  | 'room_full'
  | 'room_locked'
  | 'room_started'
  | 'room_expired'
  | 'not_host'
  | 'not_enough_players'
  | 'not_in_room'
  | 'session_invalid'
  | 'not_spokesperson'
  | 'stale'
  | 'invalid_action'
  | 'server_full'
  | 'version';

export type ServerMessage =
  | { t: 'welcome'; session: Session }
  | { t: 'room'; room: RoomView }
  | { t: 'error'; code: ErrorCode; message: string; ref?: string }
  | { t: 'ack'; id: string; ok: boolean; error?: string }
  | { t: 'pong'; at: number; server: number }
  | { t: 'closed'; reason: 'closed_by_host' | 'kicked' | 'expired' | 'left' }
  | { t: 'drafts'; drafts: { name: string; text: string }[] };

export const ERROR_TEXT: Record<ErrorCode, string> = {
  bad_message: 'Message non reconnu.',
  rate_limited: 'Trop d’actions en peu de temps. Patientez un instant.',
  room_not_found: 'Aucun salon ne correspond à ce code. Vérifiez les lettres et les chiffres.',
  room_full: 'Ce salon est complet.',
  room_locked: 'L’hôte a fermé ce salon aux nouveaux joueurs.',
  room_started: 'La partie a déjà commencé dans ce salon.',
  room_expired: 'Ce salon a expiré. Demandez un nouveau code à l’hôte.',
  not_host: 'Seul l’hôte peut faire cela.',
  not_enough_players: 'Il faut au moins un joueur dans chaque équipe.',
  not_in_room: 'Vous n’êtes plus dans ce salon.',
  session_invalid: 'Votre session a expiré. Rejoignez à nouveau le salon.',
  not_spokesperson: 'C’est le porte-parole de votre équipe qui valide cette manche.',
  stale: 'Action ignorée : la partie a déjà avancé.',
  invalid_action: 'Action impossible à ce moment de la partie.',
  server_full: 'Le serveur est momentanément saturé. Réessayez dans un instant.',
  version: 'Votre version du jeu est obsolète. Rechargez la page.',
};

/* ------------------------------------------------------------------ */
/* Validation des messages reçus (côté serveur)                          */
/* ------------------------------------------------------------------ */

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isTeam = (x: unknown): x is TeamId => x === 'A' || x === 'B';
const isStr = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max;
const isInt = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi;

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

function parseAction(a: unknown): GameAction | null {
  if (!isObj(a)) return null;
  switch (a.type) {
    case 'estimate':
      return isTeam(a.team) && typeof a.value === 'number' && Number.isFinite(a.value)
        ? { type: 'estimate', team: a.team, value: a.value, bet: a.bet === true }
        : null;
    case 'joker':
      return isTeam(a.team) && (a.joker === 'hint' || a.joker === 'swap') ? { type: 'joker', team: a.team, joker: a.joker } : null;
    case 'contest':
      return isTeam(a.team) && (a.call === 'plus' || a.call === 'moins' || a.call === 'pile')
        ? { type: 'contest', team: a.team, call: a.call, double: a.double === true }
        : null;
    case 'tb_estimate':
      return isTeam(a.team) && typeof a.value === 'number' && Number.isFinite(a.value) ? { type: 'tb_estimate', team: a.team, value: a.value } : null;
    case 'advance':
      return { type: 'advance' };
    default:
      return null;
  }
}

export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m) || typeof m.t !== 'string') return null;
  switch (m.t) {
    case 'hello': {
      if (!isInt(m.v, 0, 1000)) return null;
      const s = m.session;
      if (s !== undefined) {
        if (!isObj(s) || !isStr(s.roomCode, 8) || !isStr(s.playerId, 64) || !isStr(s.token, 128)) return null;
        return { t: 'hello', v: m.v, session: { roomCode: s.roomCode, playerId: s.playerId, token: s.token } };
      }
      return { t: 'hello', v: m.v };
    }
    case 'create':
      return isStr(m.name, 200) && isInt(m.avatar, 0, 999) ? { t: 'create', name: m.name, avatar: m.avatar, settings: m.settings } : null;
    case 'join':
      return isStr(m.code, 16) && isStr(m.name, 200) && isInt(m.avatar, 0, 999) ? { t: 'join', code: m.code, name: m.name, avatar: m.avatar } : null;
    case 'leave':
    case 'start':
    case 'close':
    case 'rematch':
      return { t: m.t };
    case 'team':
      return isTeam(m.team) ? { t: 'team', team: m.team } : null;
    case 'settings':
      return { t: 'settings', settings: m.settings };
    case 'lock':
      return typeof m.locked === 'boolean' ? { t: 'lock', locked: m.locked } : null;
    case 'kick':
      return isStr(m.playerId, 64) ? { t: 'kick', playerId: m.playerId } : null;
    case 'act': {
      const action = parseAction(m.action);
      return action && isStr(m.id, 64) && isInt(m.step, 0, 1e7) ? { t: 'act', id: m.id, step: m.step, action } : null;
    }
    case 'draft':
      return isStr(m.text, 40) ? { t: 'draft', text: m.text } : null;
    case 'ping':
      return typeof m.at === 'number' && Number.isFinite(m.at) ? { t: 'ping', at: m.at } : null;
    default:
      return null;
  }
}
