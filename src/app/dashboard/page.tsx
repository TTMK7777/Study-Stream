import Link from "next/link";
import { redirect } from "next/navigation";

import { SubjectProgress } from "@/components/dashboard/subject-progress";
import { subjects } from "@/content/shindanshi";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HistoryRow = {
  topic_id: string;
  subject_id: string;
  quiz_score: number | null;
  quiz_total: number;
  completed_at: string;
};

export type SubjectStat = {
  subjectId: string;
  subjectTitle: string;
  totalAttempts: number;
  uniqueTopics: number;
  totalTopicsInSubject: number;
  avgRatio: number;
};

export type DailyStat = {
  date: string;
  attempts: number;
  correct: number;
};

function aggregate(rows: HistoryRow[]) {
  const bySubject = new Map<
    string,
    { attempts: number; correct: number; total: number; topics: Set<string> }
  >();
  for (const row of rows) {
    if (row.quiz_score === null) continue;
    const cur =
      bySubject.get(row.subject_id) ??
      { attempts: 0, correct: 0, total: 0, topics: new Set<string>() };
    cur.attempts += 1;
    cur.correct += row.quiz_score;
    cur.total += row.quiz_total;
    cur.topics.add(row.topic_id);
    bySubject.set(row.subject_id, cur);
  }

  const subjectStats: SubjectStat[] = subjects.map((s) => {
    const agg = bySubject.get(s.id);
    return {
      subjectId: s.id,
      subjectTitle: s.title,
      totalAttempts: agg?.attempts ?? 0,
      uniqueTopics: agg?.topics.size ?? 0,
      totalTopicsInSubject: s.topics.length,
      avgRatio: agg && agg.total > 0 ? agg.correct / agg.total : 0,
    };
  });

  // 直近 7 日（今日含む）
  const days: DailyStat[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    days.push({ date: dateStr, attempts: 0, correct: 0 });
  }
  const dayKeyToIndex = new Map(days.map((d, i) => [d.date, i]));
  for (const row of rows) {
    const d = new Date(row.completed_at);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    const idx = dayKeyToIndex.get(key);
    if (idx !== undefined) {
      days[idx].attempts += 1;
      if (row.quiz_score !== null) days[idx].correct += row.quiz_score;
    }
  }

  return { subjectStats, days };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const admin = getAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await admin
    .from("study_history")
    .select("topic_id, subject_id, quiz_score, quiz_total, completed_at")
    .eq("user_id", user.id)
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: false });

  const rows = (error ? [] : (data ?? [])) as HistoryRow[];
  const { subjectStats, days } = aggregate(rows);
  const totalAttempts = subjectStats.reduce(
    (acc, s) => acc + s.totalAttempts,
    0,
  );
  const overallRatio =
    subjectStats.reduce((acc, s) => acc + s.avgRatio * s.totalAttempts, 0) /
    Math.max(1, totalAttempts);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="mt-1 text-xs text-zinc-500">
            直近 30 日 / {totalAttempts} 回挑戦 / 平均正答率{" "}
            {(overallRatio * 100).toFixed(1)}%
          </p>
        </div>
        <nav className="text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            ホーム
          </Link>
        </nav>
      </header>

      {error ? (
        <div className="rounded-md border border-red-900/40 bg-red-950/20 p-6 text-sm text-red-300">
          履歴の取得に失敗しました。
        </div>
      ) : (
        <SubjectProgress subjectStats={subjectStats} days={days} />
      )}
    </main>
  );
}
