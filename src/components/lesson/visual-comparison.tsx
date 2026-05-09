import type { VisualComparison as VisualComparisonData } from "@/lib/anthropic/schemas";

export function VisualComparison({
  visual,
}: {
  visual: VisualComparisonData;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-zinc-800">
      <div className="grid grid-cols-3 bg-zinc-950 text-[11px] font-bold">
        <div className="border-r border-zinc-800 px-3 py-2 text-zinc-500">
          観点
        </div>
        <div className="border-r border-zinc-800 px-3 py-2 text-center text-blue-400">
          {visual.labels.left}
        </div>
        <div className="px-3 py-2 text-center text-orange-400">
          {visual.labels.right}
        </div>
      </div>
      {visual.data.map((row, i) => (
        <div
          key={row.aspect}
          className={`grid grid-cols-3 border-t border-zinc-800 text-xs ${
            i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/40"
          }`}
        >
          <div className="border-r border-zinc-800 px-3 py-2 text-zinc-500">
            {row.aspect}
          </div>
          <div className="border-r border-zinc-800 px-3 py-2 text-center">
            {row.left}
          </div>
          <div className="px-3 py-2 text-center">{row.right}</div>
        </div>
      ))}
    </div>
  );
}
