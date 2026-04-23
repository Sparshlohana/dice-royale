import {
  GameState,
  Player,
  DiceRoll,
  PlayerTurnResult,
  PlayerStatus,
  PoolType,
} from "./types";

export function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(): DiceRoll {
  const die1 = rollSingleDie();
  const die2 = rollSingleDie();
  return {
    die1,
    die2,
    sum: die1 + die2,
  };
}

export function initializeGame(playerNames: string[]): GameState {
  const players: Player[] = playerNames.map((name, index) => ({
    id: `player_${index}`,
    name,
    points: 500,
    status: "active" as PlayerStatus,
  }));

  return {
    players,
    currentRound: 1,
    currentPlayerIndex: 0,
    gameStatus: "poolSelection",
    lastDiceRoll: null,
    lastPlayerResult: null,
    roundResults: [],
  };
}

export function initializeGameFromPlayers(
  playersInput: Array<Pick<Player, "id" | "name">>,
): GameState {
  const players: Player[] = playersInput.map((player) => ({
    id: player.id,
    name: player.name,
    points: 500,
    status: "active" as PlayerStatus,
  }));

  return {
    players,
    currentRound: 1,
    currentPlayerIndex: 0,
    gameStatus: "poolSelection",
    lastDiceRoll: null,
    lastPlayerResult: null,
    roundResults: [],
  };
}

export function getActivePlayers(gameState: GameState): Player[] {
  return gameState.players.filter((p) => p.status === "active");
}

export function getFirstActivePlayerIndex(players: Player[]): number {
  return players.findIndex((player) => player.status === "active");
}

export function getPoolInfo(poolType: PoolType): {
  name: string;
  multiplier: number;
  range: string;
  minSum: number;
  maxSum: number;
} {
  switch (poolType) {
    case "1.5x-low":
      return {
        name: "Low (2-6)",
        multiplier: 1.5,
        range: "2-6",
        minSum: 2,
        maxSum: 6,
      };
    case "2x-mid":
      return {
        name: "Mid (7)",
        multiplier: 2,
        range: "7",
        minSum: 7,
        maxSum: 7,
      };
    case "1.5x-high":
      return {
        name: "High (8-12)",
        multiplier: 1.5,
        range: "8-12",
        minSum: 8,
        maxSum: 12,
      };
  }
}

export function checkPoolWin(poolType: PoolType, diceSum: number): boolean {
  const pool = getPoolInfo(poolType);
  return diceSum >= pool.minSum && diceSum <= pool.maxSum;
}

export function processPlayerTurn(
  player: Player,
  poolType: PoolType,
  bet: number,
  diceRoll: DiceRoll,
): PlayerTurnResult {
  const pool = getPoolInfo(poolType);
  const won = checkPoolWin(poolType, diceRoll.sum);
  const pointsChange = won ? Math.floor(bet * pool.multiplier) : -bet;
  const previousPoints = player.points;
  const newPoints = previousPoints + pointsChange;
  const eliminated = newPoints <= 0;

  return {
    playerId: player.id,
    playerName: player.name,
    selectedPool: poolType,
    bet,
    diceSum: diceRoll.sum,
    won,
    multiplier: pool.multiplier,
    pointsChange,
    previousPoints,
    newPoints,
    eliminated,
  };
}

export function getNextPlayer(gameState: GameState): {
  nextIndex: number;
  isRoundComplete: boolean;
} {
  const currentIndex = gameState.currentPlayerIndex;

  for (let i = currentIndex + 1; i < gameState.players.length; i++) {
    if (gameState.players[i].status === "active") {
      return { nextIndex: i, isRoundComplete: false };
    }
  }

  return {
    nextIndex: Math.max(0, getFirstActivePlayerIndex(gameState.players)),
    isRoundComplete: true,
  };
}

export function isGameOver(gameState: GameState): boolean {
  const activePlayers = getActivePlayers(gameState);
  return gameState.currentRound > 10 || activePlayers.length <= 1;
}

export function advanceRound(gameState: GameState): GameState {
  const nextRound = gameState.currentRound + 1;
  const isOver = nextRound > 10 || getActivePlayers(gameState).length <= 1;

  const resetPlayers = gameState.players.map((player) => ({
    ...player,
    current_round_bet: undefined,
    selected_pool: undefined,
  }));
  const firstActivePlayerIndex = Math.max(0, getFirstActivePlayerIndex(resetPlayers));

  return {
    ...gameState,
    players: resetPlayers,
    currentRound: nextRound,
    currentPlayerIndex: firstActivePlayerIndex,
    gameStatus: isOver ? "gameOver" : "poolSelection",
    lastPlayerResult: null,
    roundResults: [],
  };
}

export function sortPlayersByPoints(players: Player[]): Player[] {
  return [...players].sort((a, b) => b.points - a.points);
}

export function getLeaderboard(
  players: Player[],
): (Player & { rank: number })[] {
  return sortPlayersByPoints(players).map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
}
