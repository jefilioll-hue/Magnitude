import type { VersusView } from '../../shared/engine.ts';
import type { ContestCall, TeamId } from '../../shared/types.ts';

/** Ce que l'écran de partie peut demander, quelle que soit la source (locale ou serveur). */
export type DriverAction =
  | { type: 'estimate'; team: TeamId; value: number; bet?: boolean }
  | { type: 'joker'; team: TeamId; joker: 'hint' | 'swap' }
  | { type: 'contest'; team: TeamId; call: ContestCall; double?: boolean }
  | { type: 'tb_estimate'; team: TeamId; value: number }
  | { type: 'advance' };

export interface Participant {
  id: string;
  name: string;
  avatar: number;
  team: TeamId;
  connected: boolean;
  isHost: boolean;
  isMe: boolean;
}

export interface VersusDriver {
  kind: 'local' | 'ia' | 'online';
  view: VersusView;
  /** Décalage d'horloge (serveur − local), en ms. */
  clockOffset: number;
  /** Équipe du joueur (null = écran partagé entre deux équipes). */
  myTeam: TeamId | null;
  /** L'appareil peut-il agir pour cette équipe maintenant ? */
  canAct: (team: TeamId) => boolean;
  /** Pourquoi on ne peut pas agir (affiché aux coéquipiers et aux adversaires). */
  waitingLabel: (team: TeamId) => string;
  act: (a: DriverAction) => void;
  /** Peut passer la révélation (local, ou hôte en ligne). */
  canAdvance: boolean;
  participants?: Participant[];
  /** Propositions des coéquipiers (en ligne). */
  drafts?: { name: string; text: string }[];
  sendDraft?: (text: string) => void;
  aiThinking?: TeamId | null;
  pending?: boolean;
  connection?: 'online' | 'reconnecting' | 'offline';
  onQuit: () => void;
  onReplay?: () => void;
}
