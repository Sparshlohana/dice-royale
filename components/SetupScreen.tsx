"use client";

import { useState } from "react";

interface SetupScreenProps {
  onGameStart: (playerNames: string[]) => void;
}

export function SetupScreen({ onGameStart }: SetupScreenProps) {
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);

  // Handle player count selection
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    setPlayerNames(Array(count).fill(""));
    setIsFormValid(false);
  };

  // Handle name input change
  const handleNameChange = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);

    // Validate: all names filled and unique
    const allFilled = updated.every((n) => n.trim().length > 0);
    const allUnique =
      new Set(updated.map((n) => n.trim().toLowerCase())).size ===
      updated.length;
    setIsFormValid(allFilled && allUnique);
  };

  // Handle game start
  const handleStartGame = () => {
    if (isFormValid) {
      onGameStart(playerNames.map((n) => n.trim()));
    }
  };

  return (
    <div className="screen-shell flex items-center">
      <div className="content-wrap grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel-strong rounded-[2rem] p-8 sm:p-10">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <span className="pill text-sm text-white/90">Local multiplayer</span>
            <span className="pill text-sm text-white/90">2 to 10 players</span>
            <span className="pill text-sm text-white/90">10 rounds max</span>
          </div>

          <p className="eyebrow mb-4">High Stakes Table</p>
          <h1 className="title-display max-w-xl text-6xl leading-none text-white sm:text-7xl">
            Dice Royale
          </h1>
          <p className="muted mt-5 max-w-xl text-base leading-7 sm:text-lg">
            Build the table, lock in the players, and run a clean local betting
            game with a sharper interface and less visual chaos.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="metric-card">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Starting stack
              </p>
              <p className="mt-3 text-3xl font-extrabold text-white">500</p>
            </div>
            <div className="metric-card">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Elimination
              </p>
              <p className="mt-3 text-3xl font-extrabold text-white">0 pts</p>
            </div>
            <div className="metric-card">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Top payout
              </p>
              <p className="mt-3 text-3xl font-extrabold text-white">2x</p>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8">
            <p className="eyebrow mb-3">Game Setup</p>
            <h2 className="text-3xl font-extrabold text-white">
              Start a fresh match
            </h2>
            <p className="muted mt-2 text-sm leading-6">
              Pick player count first, then give each seat a unique name.
            </p>
          </div>

          {playerCount === null ? (
            <div>
              <label className="mb-4 block text-sm font-bold uppercase tracking-[0.18em] text-white/85">
                Choose seats
              </label>

              <div className="grid grid-cols-3 gap-3">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                <button
                  key={count}
                  onClick={() => handlePlayerCountChange(count)}
                  className="button-ghost border border-white/10 px-4 py-4 text-lg font-extrabold text-white hover:border-cyan-300/40 hover:bg-cyan-300/10"
                >
                  {count}
                </button>
              ))}
            </div>

            <div className="surface-outline mt-6 rounded-[1.5rem] p-4">
              <p className="text-sm font-semibold text-white">Before you start</p>
              <p className="muted mt-2 text-sm leading-6">
                Every player starts with 500 points. Anyone who drops to zero is
                out, and the biggest stack after 10 rounds wins.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="muted text-sm">
                Enter names for {playerCount} players
              </p>
              <button
                onClick={() => setPlayerCount(null)}
                className="button-ghost px-4 py-2 text-sm"
              >
                Back
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {playerNames.map((name, index) => (
                <div key={index}>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                    Player {index + 1}
                  </label>
                  <input
                    type="text"
                    placeholder={`Enter player ${index + 1} name`}
                    value={name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    maxLength={20}
                    className="field-input"
                  />
                </div>
              ))}
            </div>

            {playerNames.some((n) => n.trim()) && !isFormValid && (
              <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                {!playerNames.every((n) => n.trim().length > 0)
                  ? "All names required"
                  : "Player names must be unique"}
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={!isFormValid}
              className="button-primary w-full px-5 py-4 text-lg"
            >
              Start match
            </button>
          </div>
        )}
        </section>
      </div>
    </div>
  );
}
