export default function HUD() {
  return (
    <div className="pointer-events-none absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10">
      <div className="rounded-xl bg-black/45 px-3 py-2 text-xs leading-tight text-emerald-100 backdrop-blur">
        <div className="text-sm font-semibold text-white">🌻 Plant Sim</div>
        <div className="opacity-70">阶段 1 · 全生命周期</div>
      </div>
    </div>
  );
}
