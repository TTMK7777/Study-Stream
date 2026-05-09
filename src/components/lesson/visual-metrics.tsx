import type { VisualMetrics as VisualMetricsData } from "@/lib/anthropic/schemas";

export function VisualMetrics({ visual }: { visual: VisualMetricsData }) {
  const cols = Math.min(visual.data.length, 4);
  return (
    <div
      className="mt-3 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {visual.data.map((m) => (
        <div
          key={m.label}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-3 text-center"
        >
          <div className="text-xl">{m.icon}</div>
          <div className="mt-1 text-base font-extrabold leading-tight text-orange-400">
            {m.value}
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
