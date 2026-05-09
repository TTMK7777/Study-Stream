import Link from "next/link";
import { redirect } from "next/navigation";

import { HighlightList } from "@/components/highlights/highlight-list";
import { getTopicById } from "@/content/shindanshi";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  topic_id: string;
  section_heading: string;
  text: string;
  note: string | null;
  created_at: string;
};

export default async function HighlightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/highlights");

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("highlights")
    .select("id, topic_id, section_heading, text, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (error ? [] : (data ?? [])) as Row[];

  // 表示用に topic title を解決
  const enriched = rows.map((row) => ({
    ...row,
    topicTitle: getTopicById(row.topic_id)?.topic.title ?? row.topic_id,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ハイライト</h1>
          <p className="mt-1 text-xs text-zinc-500">
            保存した {rows.length} 件
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
          ハイライトの取得に失敗しました。
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
          まだハイライトがありません。レッスン中にテキストを選択すると保存できます。
        </div>
      ) : (
        <HighlightList items={enriched} />
      )}
    </main>
  );
}
