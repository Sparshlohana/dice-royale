"use client";

import { useState } from "react";
import { Dice } from "./Dice";
import {
  CashState,
  PoolType,
  initCashGame,
  getPoolInfo,
  rollDice,
  settleCashRound,
  applyRoundAndAdvance,
  computeCashSettlement,
  nextBettor,
  firstActiveIndex,
} from "@/lib/cashGame";

const POOLS: PoolType[] = ["1.5x-low", "2x-mid", "1.5x-high"];

interface CashGameProps {
  onExit: () => void;
}

export function CashGame({ onExit }: CashGameProps) {
  const [state, setState] = useState<CashState | null>(null);

  if (!state) {
    return <CashSetup onStart={setState} onExit={onExit} />;
  }

  return (
    <div className="screen-shell">
      <button
        onClick={onExit}
        className="button-ghost fixed right-4 top-4 z-50 px-4 py-2 text-sm sm:right-6 sm:top-6"
      >
        Exit
      </button>
      <div className="content-wrap max-w-4xl">
        {state.phase === "betting" && (
          <CashBetting state={state} setState={setState} />
        )}
        {state.phase === "rolling" && (
          <CashRolling state={state} setState={setState} />
        )}
        {state.phase === "results" && (
          <CashResults state={state} setState={setState} />
        )}
        {state.phase === "gameOver" && (
          <CashGameOver state={state} onExit={onExit} />
        )}
      </div>
    </div>
  );
}

// ---------- Setup ----------
function CashSetup({
  onStart,
  onExit,
}: {
  onStart: (s: CashState) => void;
  onExit: () => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [buyIn, setBuyIn] = useState(500);

  const filled = names.length > 0 && names.every((n) => n.trim());
  const unique =
    new Set(names.map((n) => n.trim().toLowerCase())).size === names.length;
  const valid = filled && unique && buyIn > 0;

  return (
    <div className="screen-shell flex items-center">
      <button
        onClick={onExit}
        className="button-ghost fixed right-4 top-4 z-50 px-4 py-2 text-sm sm:right-6 sm:top-6"
      >
        Back
      </button>
      <div className="content-wrap max-w-2xl">
        <section className="glass-panel-strong rounded-[2rem] p-6 sm:p-8">
          <p className="eyebrow mb-3">Cash game · zero-sum</p>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
            Real-money table
          </h1>
          <p className="muted mt-3 text-sm leading-6">
            Buy in with real cash, tracked here as numbers only. Every round is a
            pot: winners split the losers&apos; stakes. The app never takes a
            cut and never holds money — settle up between yourselves at the end.
          </p>

          {count === null ? (
            <div className="mt-8">
              <label className="mb-4 block text-sm font-bold uppercase tracking-[0.18em] text-white/85">
                How many players?
              </label>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCount(c);
                      setNames(Array(c).fill(""));
                    }}
                    className="button-ghost border border-white/10 px-4 py-4 text-lg font-extrabold text-white hover:border-cyan-300/40 hover:bg-cyan-300/10"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="mb-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                  Buy-in (per player)
                </label>
                <input
                  type="number"
                  min="1"
                  value={buyIn || ""}
                  onChange={(e) => setBuyIn(parseInt(e.target.value) || 0)}
                  className="field-input"
                />
              </div>

              <div className="space-y-3">
                {names.map((n, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Player ${i + 1} name`}
                    value={n}
                    maxLength={20}
                    onChange={(e) => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                    className="field-input"
                  />
                ))}
              </div>

              {names.some((n) => n.trim()) && !valid && (
                <p className="mt-4 text-sm font-semibold text-rose-300">
                  {!filled
                    ? "All names required"
                    : !unique
                      ? "Names must be unique"
                      : "Buy-in must be greater than 0"}
                </p>
              )}

              <button
                onClick={() =>
                  onStart(
                    initCashGame(
                      names.map((n) => n.trim()),
                      buyIn,
                    ),
                  )
                }
                disabled={!valid}
                className="button-primary mt-6 w-full px-5 py-4 text-lg"
              >
                Start cash game
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------- Betting (per seat: pick pool + stake) ----------
function CashBetting({
  state,
  setState,
}: {
  state: CashState;
  setState: (s: CashState) => void;
}) {
  const player = state.players[state.currentBettorIndex];
  const [pool, setPool] = useState<PoolType | null>(null);
  const [bet, setBet] = useState(0);

  const error =
    bet <= 0
      ? "Enter a stake above 0"
      : bet > player.balance
        ? `Max ${player.balance}`
        : "";
  const canConfirm = pool !== null && !error;

  const confirm = () => {
    if (!canConfirm) return;
    const players = state.players.map((p, i) =>
      i === state.currentBettorIndex ? { ...p, pool: pool!, bet } : p,
    );
    const { index, allBet } = nextBettor(players, state.currentBettorIndex);
    setState({
      ...state,
      players,
      currentBettorIndex: allBet ? firstActiveIndex(players) : index,
      phase: allBet ? "rolling" : "betting",
    });
  };

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Round {state.round}</p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            {player.name}, place your bet
          </h1>
        </div>
        <div className="metric-card min-w-[140px] text-right">
          <p className="muted text-xs uppercase tracking-[0.24em]">Balance</p>
          <p className="mt-2 text-3xl font-extrabold text-cyan-300">
            {player.balance}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {POOLS.map((pt) => {
          const info = getPoolInfo(pt);
          const selected = pool === pt;
          return (
            <button
              key={pt}
              onClick={() => setPool(pt)}
              className={`rounded-[1.5rem] border p-5 text-left transition-all ${
                selected
                  ? "border-cyan-300/60 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-cyan-300/30"
              }`}
            >
              <p className="text-2xl font-extrabold text-white">{info.name}</p>
              <p className="muted mt-1 text-sm">Wins on sums {info.range}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 glass-panel rounded-[2rem] p-5 sm:p-6">
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/75">
          Stake
        </label>
        <input
          type="number"
          min="1"
          max={player.balance}
          value={bet || ""}
          onChange={(e) => setBet(parseInt(e.target.value) || 0)}
          className="field-input text-2xl font-extrabold"
        />
        <p className="muted mt-3 text-sm leading-6">
          If you win you take a share of the whole round pot, sized to your
          stake. If the roll misses your range you lose this stake to the
          winners.
        </p>
        {bet > 0 && error && (
          <p className="mt-3 text-sm font-semibold text-rose-300">{error}</p>
        )}
        <button
          onClick={confirm}
          disabled={!canConfirm}
          className="button-primary mt-5 w-full px-5 py-4 text-lg"
        >
          Lock bet
        </button>
      </div>
    </>
  );
}

// ---------- Rolling (one shared roll) ----------
function CashRolling({
  state,
  setState,
}: {
  state: CashState;
  setState: (s: CashState) => void;
}) {
  const [rolling, setRolling] = useState(false);
  const bettors = state.players.filter((p) => p.active && (p.bet ?? 0) > 0);
  const pot = bettors.reduce((s, p) => s + (p.bet ?? 0), 0);

  const roll = async () => {
    setRolling(true);
    await new Promise((r) => setTimeout(r, 1500));
    const dice = rollDice();
    const results = settleCashRound(state.players, dice, state.round);
    setState({
      ...state,
      lastRoll: dice,
      roundResults: results,
      history: [...state.history, ...results],
      phase: "results",
    });
    setRolling(false);
  };

  return (
    <>
      <div className="mb-6 text-center">
        <p className="eyebrow mb-2">Round {state.round}</p>
        <h1 className="text-4xl font-extrabold text-white">
          All bets in — one roll
        </h1>
        <p className="muted mt-2 text-sm">
          Pot this round: {pot} across {bettors.length} players
        </p>
      </div>

      <div className="glass-panel rounded-[2rem] p-6">
        <Dice roll={state.lastRoll} isRolling={rolling} />
        <button
          onClick={roll}
          disabled={rolling}
          className="button-secondary mt-6 w-full px-5 py-4 text-lg"
        >
          {rolling ? "Rolling..." : "Roll the dice"}
        </button>
      </div>
    </>
  );
}

// ---------- Results ----------
function CashResults({
  state,
  setState,
}: {
  state: CashState;
  setState: (s: CashState) => void;
}) {
  const roll = state.lastRoll;
  const results = [...state.roundResults].sort(
    (a, b) => Number(b.won) - Number(a.won) || b.delta - a.delta,
  );
  const pot = state.roundResults[0]?.pot ?? 0;

  if (!roll) return null;

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Round {state.round} result</p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            Rolled {roll.sum} · pot {pot}
          </h1>
        </div>
        <div className="w-28 shrink-0">
          <Dice roll={roll} isRolling={false} />
        </div>
      </div>

      <div className="space-y-2">
        {results.map((r) => (
          <div
            key={r.playerId}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
              r.won
                ? "border-emerald-400/25 bg-emerald-400/8"
                : "border-rose-400/20 bg-rose-500/8"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-white">
                {r.playerName}
                {r.eliminated && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300">
                    Busted
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/50">
                {getPoolInfo(r.pool).name} · staked {r.stake}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-lg font-extrabold ${
                  r.delta >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {r.delta > 0 ? "+" : ""}
                {r.delta}
              </p>
              <p className="text-[10px] font-semibold text-white/40">
                balance {r.balanceAfter}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => setState(applyRoundAndAdvance(state, state.roundResults))}
          className="button-primary flex-1 px-5 py-4 text-lg"
        >
          Next round
        </button>
        <button
          onClick={() => setState({ ...state, phase: "gameOver" })}
          className="button-ghost flex-1 px-5 py-4 text-lg"
        >
          End &amp; settle up
        </button>
      </div>
    </>
  );
}

// ---------- Game over + settlement ----------
function CashGameOver({
  state,
  onExit,
}: {
  state: CashState;
  onExit: () => void;
}) {
  const { buyIn } = state.config;
  const ranked = [...state.players].sort((a, b) => b.balance - a.balance);
  const settlement = computeCashSettlement(state.players, buyIn);

  return (
    <>
      <div className="mb-8 text-center">
        <p className="eyebrow mb-3">Final standings</p>
        <h1 className="title-display text-5xl text-white sm:text-6xl">
          Cash out
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-panel-strong overflow-hidden rounded-[2rem]">
          <div className="divide-y divide-white/8">
            {ranked.map((p, idx) => {
              const net = p.balance - buyIn;
              return (
                <div key={p.id} className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                      idx === 0 ? "bg-amber-300 text-slate-900" : "bg-white/10 text-white"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-grow">
                    <p className="text-lg font-extrabold text-white">{p.name}</p>
                    <p className="text-xs text-white/50">
                      {p.active ? "Still in" : "Busted"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-cyan-300">
                      {p.balance}
                    </p>
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.18em] ${
                        net > 0
                          ? "text-emerald-300"
                          : net < 0
                            ? "text-rose-300"
                            : "text-white/45"
                      }`}
                    >
                      {net > 0 ? "+" : ""}
                      {net} net
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <h3 className="text-2xl font-extrabold text-white">Who pays whom</h3>
          <p className="muted mt-1 text-xs leading-5">
            Settle this cash between yourselves. The app held nothing.
          </p>
          <div className="mt-4 space-y-2">
            {settlement.length === 0 ? (
              <p className="muted text-sm">Everyone even — no money moves.</p>
            ) : (
              settlement.map((t, idx) => (
                <div
                  key={`${t.fromId}-${t.toId}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-2"
                >
                  <p className="min-w-0 truncate text-sm font-semibold text-white">
                    <span className="text-rose-300">{t.fromName}</span>
                    <span className="mx-1 text-white/40">→</span>
                    <span className="text-emerald-300">{t.toName}</span>
                  </p>
                  <p className="shrink-0 text-sm font-extrabold text-cyan-300">
                    {t.amount}
                  </p>
                </div>
              ))
            )}
          </div>

          <button
            onClick={onExit}
            className="button-primary mt-6 w-full px-6 py-4 text-lg"
          >
            Done
          </button>
        </aside>
      </div>
    </>
  );
}
