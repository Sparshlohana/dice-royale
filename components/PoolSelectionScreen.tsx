"use client";

import { GameState, PoolType } from "@/lib/types";
import { getPoolInfo } from "@/lib/gameLogic";

interface PoolSelectionScreenProps {
  gameState: GameState;
  onPoolSelected: (pool: PoolType) => void;
  disabled?: boolean;
  statusMessage?: string;
}

const POOLS: PoolType[] = ["1.5x-low", "2x-mid", "1.5x-high"];

export function PoolSelectionScreen({
  gameState,
  onPoolSelected,
  disabled = false,
  statusMessage,
}: PoolSelectionScreenProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  if (!currentPlayer) {
    return <div>Error loading player</div>;
  }

  return (
    <div className="screen-shell flex items-center">
      <div className="content-wrap max-w-5xl">
        <div className="glass-panel-strong rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow mb-3">Round {gameState.currentRound} of 10</p>
              <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
                {currentPlayer.name}, pick your pool
              </h1>
              <p className="muted mt-3 text-sm sm:text-base">
                Higher risk, higher pressure. Choose the range before placing
                your bet.
              </p>
            </div>

            <div className="metric-card min-w-[220px]">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Current points
              </p>
              <p className="mt-3 text-4xl font-extrabold text-cyan-300">
                {currentPlayer.points}
              </p>
            </div>
          </div>

          <div className="grid gap-4 mb-6">
            {POOLS.map((poolType) => {
              const pool = getPoolInfo(poolType);
              return (
                <button
                  key={poolType}
                  onClick={() => onPoolSelected(poolType)}
                  disabled={disabled}
                  className="group rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-300/8 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-2xl font-extrabold text-white">
                        {pool.name}
                      </p>
                      <p className="muted mt-1 text-sm">
                        Winning sums: {pool.range}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-bold text-emerald-300">
                        {pool.multiplier}x payout
                      </div>
                      <div className="text-sm font-semibold text-white/70 transition-transform duration-200 group-hover:translate-x-1">
                        Select
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="surface-outline rounded-[1.5rem] p-4">
            <p className="text-sm font-semibold text-white">Table note</p>
            <p className="muted mt-2 text-sm leading-6">
              Low covers 2 to 6, Mid hits only on 7, and High covers 8 to 12.
              Mid pays the most because it is the narrowest range.
            </p>
          </div>

          {statusMessage ? (
            <div className="mt-4 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
              <p className="text-sm font-semibold text-cyan-100">
                {statusMessage}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
