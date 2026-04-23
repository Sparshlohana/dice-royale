"use client";

import { GameState } from "@/lib/types";
import { getActivePlayers } from "@/lib/gameLogic";
import { PlayerCard } from "./PlayerCard";
import { Dice } from "./Dice";

interface GameBoardProps {
  gameState: GameState;
  isRolling: boolean;
  onRoll: () => void;
  canRoll?: boolean;
  statusMessage?: string;
}

export function GameBoard({
  gameState,
  isRolling,
  onRoll,
  canRoll = true,
  statusMessage,
}: GameBoardProps) {
  const activePlayers = getActivePlayers(gameState);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="screen-shell">
      <div className="content-wrap">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-3">Live round</p>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
              Round {gameState.currentRound} action
            </h1>
            <p className="muted mt-3 text-sm leading-6 sm:text-base">
              {currentPlayer?.name} is at the table. Review the field, then roll
              the dice.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="metric-card min-w-[180px]">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Active players
              </p>
              <p className="mt-3 text-4xl font-extrabold text-white">
                {activePlayers.length}
              </p>
            </div>
            <div className="metric-card min-w-[180px]">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Current shooter
              </p>
              <p className="mt-3 text-2xl font-extrabold text-cyan-300">
                {currentPlayer?.name ?? "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="glass-panel-strong rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-white">Table stacks</h2>
              <p className="muted text-sm">Every player, one view</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gameState.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === currentPlayer?.id}
              showBet={true}
              betAmount={player.current_round_bet || 0}
            />
          ))}
            </div>
          </section>

          <aside className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <p className="eyebrow mb-3">Dice Chamber</p>
            <h2 className="text-3xl font-extrabold text-white">Throw the roll</h2>
            <p className="muted mt-3 text-sm leading-6">
              Once the bet is locked, this roll decides the stack swing.
            </p>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/10 p-4">
              <Dice roll={gameState.lastDiceRoll} isRolling={isRolling} />
            </div>

            <button
              onClick={onRoll}
              disabled={isRolling || !canRoll}
              className="button-secondary mt-6 w-full px-5 py-4 text-lg"
            >
              {isRolling ? "Rolling..." : "Roll dice"}
            </button>

            {statusMessage ? (
              <div className="mt-4 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
                <p className="text-sm font-semibold text-cyan-100">
                  {statusMessage}
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
