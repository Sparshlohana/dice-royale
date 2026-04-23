"use client";

import { GameState } from "@/lib/types";
import { getLeaderboard } from "@/lib/gameLogic";

interface LeaderboardProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onResetGame: () => void;
}

export function Leaderboard({
  gameState,
  onPlayAgain,
  onResetGame,
}: LeaderboardProps) {
  const leaderboard = getLeaderboard(gameState.players);

  return (
    <div className="screen-shell">
      <div className="content-wrap max-w-5xl">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">Final standings</p>
          <h1 className="title-display text-6xl text-white sm:text-7xl">
            Game Over
          </h1>
          <p className="muted mt-3 text-base">The table is closed. Here is the final stack order.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="glass-panel-strong overflow-hidden rounded-[2rem]">
            <div className="divide-y divide-white/8">
            {leaderboard.map((player, idx) => {
              const isWinner = idx === 0;
              const isEliminated = player.status === "eliminated";

                return (
                  <div
                    key={player.id}
                    className={`
                    flex items-center gap-4 p-5 transition-all duration-200
                    ${isWinner ? "bg-amber-400/10" : ""}
                    ${isEliminated ? "opacity-70" : ""}
                  `}
                >
                  <div
                    className={`
                      flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-black
                      ${isWinner ? "bg-amber-300 text-slate-900" : "bg-white/10 text-white"}
                    `}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-grow">
                    <h3 className="text-xl font-extrabold text-white">
                      {player.name} {isWinner ? "• Winner" : ""}
                    </h3>
                    <p className="text-sm text-white/55">
                      {isEliminated ? "Eliminated" : "Final Status: Active"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-extrabold text-cyan-300">
                      {player.points}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                      points
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          </section>

          <aside className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <h3 className="text-2xl font-extrabold text-white">Match stats</h3>
            <div className="mt-5 grid gap-4">
              <div className="metric-card text-center">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  Rounds played
                </p>
                <p className="mt-3 text-4xl font-extrabold text-white">
                {gameState.currentRound}
                </p>
              </div>
              <div className="metric-card text-center">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  Active players
                </p>
                <p className="mt-3 text-4xl font-extrabold text-emerald-300">
                  {gameState.players.filter((p) => p.status === "active").length}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <button
                onClick={onPlayAgain}
                className="button-primary w-full px-6 py-4 text-lg"
              >
                Play again
              </button>
              <button
                onClick={onResetGame}
                className="button-ghost w-full px-6 py-4 text-lg"
              >
                Exit to menu
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
