// Cash mode — a fully self-contained, ZERO-SUM parimutuel bookkeeping engine.
//
// This is deliberately separate from the play-money game in `gameLogic.ts`:
// money here only moves player-to-player, the app never holds or creates any.
// It reuses only the pure, read-only dice/pool helpers from `gameLogic.ts`.

import { PoolType } from "./types";
import { rollDice, getPoolInfo, checkPoolWin } from "./gameLogic";

export { rollDice, getPoolInfo };
export type { PoolType };

export type CashPhase = "betting" | "rolling" | "results" | "gameOver";

export interface CashPlayer {
  id: string;
  name: string;
  balance: number; // current money position
  active: boolean; // false once busted (balance hits 0)
  bet?: number; // this round's stake
  pool?: PoolType; // this round's pick
}

export interface CashConfig {
  buyIn: number;
}

export interface CashRoundResult {
  round: number;
  playerId: string;
  playerName: string;
  pool: PoolType;
  diceSum: number;
  stake: number;
  won: boolean;
  payout: number; // gross returned (0 if lost, pot share if won)
  delta: number; // net = payout - stake
  balanceAfter: number;
  eliminated: boolean;
  pot: number;
}

export interface CashSettlementTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface CashState {
  players: CashPlayer[];
  round: number;
  phase: CashPhase;
  config: CashConfig;
  currentBettorIndex: number; // whose turn to pick pool + bet
  lastRoll: { die1: number; die2: number; sum: number } | null;
  roundResults: CashRoundResult[];
  history: CashRoundResult[];
}

export function initCashGame(names: string[], buyIn: number): CashState {
  const players: CashPlayer[] = names.map((name, i) => ({
    id: `cash_${i}`,
    name,
    balance: buyIn,
    active: true,
  }));
  return {
    players,
    round: 1,
    phase: "betting",
    config: { buyIn },
    currentBettorIndex: firstActiveIndex(players),
    lastRoll: null,
    roundResults: [],
    history: [],
  };
}

export function firstActiveIndex(players: CashPlayer[]): number {
  return Math.max(
    0,
    players.findIndex((p) => p.active),
  );
}

// Next active seat after `from`; wraps to signal all seats have bet.
export function nextBettor(
  players: CashPlayer[],
  from: number,
): { index: number; allBet: boolean } {
  for (let i = from + 1; i < players.length; i++) {
    if (players[i].active) return { index: i, allBet: false };
  }
  return { index: firstActiveIndex(players), allBet: true };
}

/**
 * Settle one round as a zero-sum parimutuel pot. Winners (whose pool contains
 * the shared roll) split the whole pot in proportion to their stake; losers
 * forfeit their stake to them. `Σ delta === 0` always — no house, no leak.
 */
export function settleCashRound(
  players: CashPlayer[],
  roll: { die1: number; die2: number; sum: number },
  round: number,
): CashRoundResult[] {
  const participants = players.filter(
    (p) => p.active && (p.bet ?? 0) > 0 && p.pool !== undefined,
  );

  const pot = participants.reduce((s, p) => s + (p.bet ?? 0), 0);
  const winners = participants.filter((p) =>
    checkPoolWin(p.pool as PoolType, roll.sum),
  );
  const winningStake = winners.reduce((s, p) => s + (p.bet ?? 0), 0);

  // Integer payouts: floor each share, then hand leftover units to the
  // largest-stake winners so the round nets exactly 0.
  const payoutById = new Map<string, number>();
  if (winningStake > 0) {
    const sorted = [...winners].sort((a, b) => (b.bet ?? 0) - (a.bet ?? 0));
    let distributed = 0;
    for (const w of sorted) {
      const share = Math.floor(((w.bet ?? 0) * pot) / winningStake);
      payoutById.set(w.id, share);
      distributed += share;
    }
    let remainder = pot - distributed;
    let i = 0;
    while (remainder > 0 && sorted.length > 0) {
      const w = sorted[i % sorted.length];
      payoutById.set(w.id, (payoutById.get(w.id) ?? 0) + 1);
      remainder -= 1;
      i += 1;
    }
  }

  return participants.map((p) => {
    const stake = p.bet ?? 0;
    const won = winners.some((w) => w.id === p.id);
    // No winners at all → refund every stake (delta 0), still zero-sum.
    const payout = winningStake > 0 ? payoutById.get(p.id) ?? 0 : stake;
    const delta = payout - stake;
    const balanceAfter = p.balance + delta;
    return {
      round,
      playerId: p.id,
      playerName: p.name,
      pool: p.pool as PoolType,
      diceSum: roll.sum,
      stake,
      won,
      payout,
      delta,
      balanceAfter,
      eliminated: balanceAfter <= 0,
      pot,
    };
  });
}

// Apply settled results to the roster and advance to the next round.
export function applyRoundAndAdvance(
  state: CashState,
  results: CashRoundResult[],
): CashState {
  const byId = new Map(results.map((r) => [r.playerId, r]));
  const players: CashPlayer[] = state.players.map((p) => {
    const r = byId.get(p.id);
    if (!r) return { ...p, bet: undefined, pool: undefined };
    return {
      ...p,
      balance: r.balanceAfter,
      active: p.active && !r.eliminated,
      bet: undefined,
      pool: undefined,
    };
  });

  const activeCount = players.filter((p) => p.active).length;
  const gameOver = activeCount <= 1;

  return {
    ...state,
    players,
    round: state.round + 1,
    phase: gameOver ? "gameOver" : "betting",
    currentBettorIndex: firstActiveIndex(players),
    lastRoll: null,
    roundResults: [],
  };
}

/**
 * End-of-game cash settlement. Net position is `balance - buyIn` (sums to 0).
 * Greedily matches the biggest creditor with the biggest debtor for the
 * shortest list of "A pays B" transfers to settle real cash offline.
 */
export function computeCashSettlement(
  players: CashPlayer[],
  buyIn: number,
): CashSettlementTransfer[] {
  const creditors = players
    .map((p) => ({ id: p.id, name: p.name, amount: p.balance - buyIn }))
    .filter((n) => n.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const debtors = players
    .map((p) => ({ id: p.id, name: p.name, amount: buyIn - p.balance }))
    .filter((n) => n.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const transfers: CashSettlementTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0) {
      transfers.push({
        fromId: debtors[i].id,
        fromName: debtors[i].name,
        toId: creditors[j].id,
        toName: creditors[j].name,
        amount,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }
  return transfers;
}
