"use client";

interface ModeSelectionScreenProps {
  onSelectLocal: () => void;
  onSelectOnline: () => void;
}

export function ModeSelectionScreen({
  onSelectLocal,
  onSelectOnline,
}: ModeSelectionScreenProps) {
  return (
    <div className="screen-shell flex items-center">
      <div className="content-wrap grid gap-6 lg:grid-cols-2">
        <section className="glass-panel-strong rounded-[2rem] p-8 sm:p-10">
          <p className="eyebrow mb-4">Choose Mode</p>
          <h1 className="title-display text-6xl leading-none text-white sm:text-7xl">
            Dice Royale
          </h1>
          <p className="muted mt-5 max-w-xl text-base leading-7 sm:text-lg">
            Play locally on one screen, or launch a Liveblocks-backed room so
            everyone can join from their own device.
          </p>
        </section>

        <section className="grid gap-4">
          <button
            onClick={onSelectLocal}
            className="glass-panel rounded-[2rem] p-6 text-left"
          >
            <p className="eyebrow mb-3">Local</p>
            <h2 className="text-3xl font-extrabold text-white">Play here</h2>
            <p className="muted mt-3 text-sm leading-6">
              Pass the device around and run the match from a single screen.
            </p>
          </button>

          <button
            onClick={onSelectOnline}
            className="glass-panel rounded-[2rem] p-6 text-left"
          >
            <p className="eyebrow mb-3">Online</p>
            <h2 className="text-3xl font-extrabold text-white">
              Create or join a room
            </h2>
            <p className="muted mt-3 text-sm leading-6">
              Share an invite link, gather players into one live room, and let
              each player take their turn from their own system.
            </p>
          </button>
        </section>
      </div>
    </div>
  );
}
