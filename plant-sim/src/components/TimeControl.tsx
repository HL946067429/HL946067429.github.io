import { useMemo } from "react";
import { useTimeline } from "@/stores/timelineStore";
import { useEnv, PRESET_LOCATIONS } from "@/stores/envStore";
import { computeSolar, toDeg } from "@/models/solar";

const SPEED_OPTIONS = [
  { label: "实时", value: 1 },
  { label: "1 分/秒", value: 60 },
  { label: "1 时/秒", value: 3600 },
  { label: "1 天/秒", value: 86400 },
];

export default function TimeControl() {
  const now = useTimeline((s) => s.now);
  const playing = useTimeline((s) => s.playing);
  const speed = useTimeline((s) => s.speed);
  const setPlaying = useTimeline((s) => s.setPlaying);
  const setSpeed = useTimeline((s) => s.setSpeed);
  const setHourOfDay = useTimeline((s) => s.setHourOfDay);
  const setDate = useTimeline((s) => s.setDate);
  const location = useEnv((s) => s.location);
  const setLocation = useEnv((s) => s.setLocation);

  const date = useMemo(() => new Date(now), [now]);
  const hourOfDay = date.getHours() + date.getMinutes() / 60;
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const solar = useMemo(
    () => computeSolar(date, location.lat, location.lon),
    [date, location],
  );

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-2xl rounded-2xl bg-black/55 p-3 text-sm shadow-xl backdrop-blur">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-emerald-200/90">
          <span className="font-mono text-base text-white">
            {dateStr} {timeStr}
          </span>
          <span className="ml-auto">
            ☀ 高度 {toDeg(solar.altitude).toFixed(1)}° · 方位{" "}
            {toDeg(solar.azimuth).toFixed(1)}°
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label={`日期 ${dateStr}`}>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                const [y, m, d] = e.target.value.split("-").map(Number);
                if (y && m && d) setDate(y, m, d);
              }}
              className="w-full rounded-md bg-white/10 px-2 py-1 text-white outline-none ring-1 ring-white/15"
            />
          </Field>
          <Field label={`时刻 ${timeStr}`}>
            <input
              type="range"
              min={0}
              max={24}
              step={0.05}
              value={hourOfDay}
              onChange={(e) => setHourOfDay(parseFloat(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="rounded-md bg-emerald-500/90 px-3 py-1.5 font-medium text-black hover:bg-emerald-400"
          >
            {playing ? "❚❚ 暂停" : "▶ 播放"}
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="rounded-md bg-white/10 px-2 py-1 text-white outline-none ring-1 ring-white/15"
          >
            {SPEED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-zinc-800">
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={location.name}
            onChange={(e) => {
              const loc = PRESET_LOCATIONS.find((l) => l.name === e.target.value);
              if (loc) setLocation(loc);
            }}
            className="ml-auto rounded-md bg-white/10 px-2 py-1 text-white outline-none ring-1 ring-white/15"
          >
            {PRESET_LOCATIONS.map((l) => (
              <option key={l.name} value={l.name} className="bg-zinc-800">
                📍 {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs text-emerald-200/70">{label}</span>
      {children}
    </label>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
