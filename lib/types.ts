export type PlayerStatus = "active" | "eliminated";
export type GameStatus =
  | "setup"
  | "poolSelection"
  | "playerBetting"
  | "rolling"
  | "playerResults"
  | "roundComplete"
  | "gameOver";
export type PoolType = "1.5x-low" | "2x-mid" | "1.5x-high"; // 2-6, 7, 8-12

export interface Player {
  id: string;
  name: string;
  points: number;
  status: PlayerStatus;
  eliminated_at_round?: number;
  current_round_bet?: number;
  selected_pool?: PoolType;
}

export interface DiceRoll {
  die1: number;
  die2: number;
  sum: number;
}

export interface PlayerTurnResult {
  playerId: string;
  playerName: string;
  selectedPool: PoolType;
  bet: number;
  diceSum: number;
  won: boolean;
  multiplier: number;
  pointsChange: number;
  previousPoints: number;
  newPoints: number;
  eliminated: boolean;
}

export interface GameState {
  players: Player[];
  currentRound: number;
  currentPlayerIndex: number; // which player's turn (0-indexed)
  gameStatus: GameStatus;
  lastDiceRoll: DiceRoll | null;
  lastPlayerResult: PlayerTurnResult | null;
  roundResults: PlayerTurnResult[]; // all results for current round
}

export interface OnlineIdentity {
  userId: string;
  name: string;
}

export interface SharedRoomState {
  roomId: string;
  hostUserId: string;
  hostName: string;
  stage: "lobby" | "playing";
  gameState: GameState | null;
  createdAt: number;
}

export interface RoomMetadata {
  active: "true" | "false";
  hostUserId: string;
  hostName: string;
  status: "lobby" | "playing" | "closed";
  createdAt: string;
}
