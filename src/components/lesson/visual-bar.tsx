"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { VisualBar as VisualBarData } from "@/lib/anthropic/schemas";

const FALLBACK_COLORS = [
  "#FF8C42",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
];

export function VisualBar({ visual }: { visual: VisualBarData }) {
  return (
    <div className="mt-3 rounded-md bg-zinc-950 p-3">
      {visual.title ? (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
          {visual.title}
        </p>
      ) : null}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={visual.data}
          margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#ffffff10" }}
            contentStyle={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 6,
              fontSize: 12,
              color: "#e4e4e7",
            }}
          />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {visual.data.map((d, i) => (
              <Cell
                key={d.label}
                fill={d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
