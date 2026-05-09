import Link from "next/link";
import { redirect } from "next/navigation";

import { getTopicById, subjects } from "@/content/shindanshi";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HistoryRow = {
  id: string;
  topic_id: string;
  subject_id: string;
  quiz_score: number | null;
  quiz_total: number;
  completed_at: string;
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/history");

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("study_history")
    .select("id, topic_id, subject_id, quiz_score, quiz_total, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(100);

  const rows = (error ? [] : (data ?? [])) as HistoryRow[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">学習履歴</h1>
          <p className="mt-1 text-xs text-zinc-500">
            直近 {rows.length} 件のクイズ結果
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
          履歴の取得に失敗しました。env 設定（DATABASE_URL / SERVICE_ROLE_KEY）を確認してください。
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
          まだ履歴がありません。論点を選んでクイズを受けてみましょう。
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded border border-zinc-800">
          {rows.map((row) => {
            const entry = getTopicById(row.topic_id);
            const subject =
              entry?.subject ??
              subjects.find((s) => s.id === row.subject_id);
            const ratio =
              row.quiz_score !== null && row.quiz_total > 0
                ? row.quiz_score / row.quiz_total
                : 0;
            const tone =
              ratio === 1
                ? "text-emerald-400"
                : ratio >= 0.5
                  ? "text-orange-400"
                  : "text-red-400";

            return (
              <li key={row.id} className="bg-zinc-900/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">
                      {subject?.title ?? row.subject_id}
                    </p>
                    {entry ? (
                      <Link
                        href={`/lesson/${entry.topic.id}`}
                        className="block truncate text-sm font-medium hover:text-orange-400"
                      >
                        {entry.topic.title}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium">
                        {row.topic_id}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tone}`}>
                      {row.quiz_score ?? "-"} / {row.quiz_total}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(row.completed_at).toLocaleString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
