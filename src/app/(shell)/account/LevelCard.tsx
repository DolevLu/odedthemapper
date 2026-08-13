import type { LevelInfo } from "@/lib/gamification";

export function LevelCard({ level, totalPoints }: { level: LevelInfo; totalPoints: number }) {
  return (
    <div
      className="game-pop-in mb-8 flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-6"
      style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, white), white)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="site-logo flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-extrabold text-white shadow-md"
            style={{ background: "linear-gradient(135deg, var(--primary), #EC4899)" }}
          >
            {level.level}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-50">רמה {level.level}</p>
            <p className="text-lg font-extrabold">{level.title}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-lg font-extrabold" style={{ color: "var(--primary)" }}>
            {totalPoints}
          </p>
          <p className="text-xs opacity-50">נקודות</p>
        </div>
      </div>

      <div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${level.progressPct}%`, background: "linear-gradient(90deg, var(--primary), #EC4899)" }}
          />
        </div>
        <p className="mt-1.5 text-xs opacity-60">
          {level.pointsIntoLevel} / {level.pointsForNextLevel} נקודות לרמה {level.level + 1}
        </p>
      </div>
    </div>
  );
}
