"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyStat, SubjectStat } from "@/app/dashboard/page";

type Props = {
  subjectStats: SubjectStat[];
  days: DailyStat[];
};

export function SubjectProgress({ subjectStats, days }: Props) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
          科目別進捗
        </h2>
        <ul className="space-y-2">
          {subjectStats.map((stat) => {
            const coverage =
              stat.totalTopicsInSubject > 0
                ? stat.uniqueTopics / stat.totalTopicsInSubject
                : 0;
            const ratioColor =
              stat.avgRatio >= 0.7
                ? "bg-emerald-500"
                : stat.avgRatio >= 0.4
                  ? "bg-orange-500"
                  : stat.totalAttempts > 0
                    ? "bg-red-500"
                    : "bg-zinc-700";

            return (
              <li
                key={stat.subjectId}
                className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{stat.subjectTitle}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {stat.uniqueTopics} / {stat.totalTopicsInSubject} 論点
                      ・ {stat.totalAttempts} 回挑戦
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold">
                      {stat.totalAttempts > 0
                        ? `${(stat.avgRatio * 100).toFixed(0)}%`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-zinc-500">平均正答率</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-500">カバレッジ</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${coverage * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500">正答率</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full transition-all ${ratioColor}`}
                        style={{ width: `${stat.avgRatio * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
          直近 7 日の挑戦数
        </h2>
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={days}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#e4e4e7",
                }}
              />
              <Bar
                dataKey="attempts"
                fill="#FF8C42"
                radius={[4, 4, 0, 0]}
                name="挑戦数"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
