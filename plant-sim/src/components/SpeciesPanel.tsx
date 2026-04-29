import { useMemo } from "react";
import { usePlant } from "@/stores/plantStore";
import { useTimeline } from "@/stores/timelineStore";
import { SPECIES_LIST } from "@/species";
import { findStage } from "@/models/phenology";

export default function SpeciesPanel() {
  const species = usePlant((s) => s.species);
  const setSpecies = usePlant((s) => s.setSpecies);
  const replant = usePlant((s) => s.replant);
  const cumulativeGdd = usePlant((s) => s.cumulativeGdd);
  const plantedAt = usePlant((s) => s.plantedAt);
  const now = useTimeline((s) => s.now);

  const stage = useMemo(
    () => findStage(species, cumulativeGdd),
    [species, cumulativeGdd],
  );

  const ageDays = Math.max(0, (now - plantedAt) / 86_400_000);
  const totalGdd =
    species.lifecycle.stages[species.lifecycle.stages.length - 1].gddStart;
  const lifeProgress = Math.min(100, (cumulativeGdd / totalGdd) * 100);

  return (
    <div className="pointer-events-auto absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 w-[min(20rem,calc(100vw-1.5rem))]">
      <div className="rounded-xl bg-black/55 p-3 text-xs leading-tight text-emerald-100 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center gap-2">
          <select
            value={species.id}
            onChange={(e) => {
              const s = SPECIES_LIST.find((x) => x.id === e.target.value);
              if (s) {
                setSpecies(s);
                replant(useTimeline.getState().now);
              }
            }}
            className="flex-1 rounded-md bg-white/10 px-2 py-1 text-white outline-none ring-1 ring-white/15"
          >
            {SPECIES_LIST.map((s) => (
              <option key={s.id} value={s.id} className="bg-zinc-800">
                🌻 {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => replant(useTimeline.getState().now)}
            className="rounded-md bg-emerald-500/90 px-2 py-1 text-xs font-medium text-black hover:bg-emerald-400"
            title="把当前时间设为种植日,清零生长进度"
          >
            重新种植
          </button>
        </div>

        <div className="mb-2">
          <div className="text-[10px] text-emerald-300/70">学名</div>
          <div className="italic text-white/90">{species.scientific}</div>
        </div>

        {species.description && (
          <div className="mb-3 text-[11px] text-emerald-100/80">
            {species.description}
          </div>
        )}

        <Row label="生育期 GDD">
          <span className="font-mono">
            {Math.round(cumulativeGdd)} / {Math.round(totalGdd)} ℃·d
          </span>
        </Row>
        <Row label="种植后天数">
          <span className="font-mono">{ageDays.toFixed(1)} 天</span>
        </Row>
        <Row label="当前阶段">
          <span className="rounded bg-emerald-500/30 px-1.5 py-0.5 font-medium text-emerald-100">
            {stage.label}
          </span>
        </Row>

        <div className="mt-2">
          <StageBar
            stages={species.lifecycle.stages.map((s) => ({
              id: s.id,
              label: s.label,
              from: s.gddStart,
              to: s.gddEnd,
            }))}
            current={cumulativeGdd}
            total={totalGdd}
          />
        </div>

        <div className="mt-2 text-[10px] text-emerald-200/60">
          一生进度 {lifeProgress.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-emerald-200/70">{label}</span>
      {children}
    </div>
  );
}

function StageBar({
  stages,
  current,
  total,
}: {
  stages: { id: string; label: string; from: number; to: number }[];
  current: number;
  total: number;
}) {
  const visibleStages = stages.filter((s) => s.from < total);
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
        {visibleStages.map((s, i) => {
          const width = ((Math.min(s.to, total) - s.from) / total) * 100;
          const inThis = current >= s.from && current < s.to;
          return (
            <div
              key={s.id}
              style={{ width: `${width}%` }}
              className={
                inThis
                  ? "bg-emerald-400"
                  : current >= s.to
                    ? "bg-emerald-700"
                    : "bg-white/20"
              }
              title={`${s.label} (${Math.round(s.from)}-${Math.round(s.to)} ℃·d)`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-emerald-200/50">
        {visibleStages.map((s) => (
          <span key={s.id} title={s.label}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
