import Link from "next/link";

import { SubjectAccordion } from "@/components/home/subject-accordion";
import { subjects } from "@/content/shindanshi";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Study<span className="text-orange-500">Stream</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            中小企業診断士1次試験 7科目の論点ツリー
          </p>
        </div>
        {user ? (
          <form action={signOut} className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-400 sm:inline">
              {user.email}
            </span>
            <button
              type="submit"
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              ログアウト
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white"
          >
            ログイン
          </Link>
        )}
      </header>

      {user ? (
        <>
          <nav className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/dashboard"
              className="rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 hover:border-zinc-600 hover:bg-zinc-900"
            >
              📊 ダッシュボード
            </Link>
            <Link
              href="/history"
              className="rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 hover:border-zinc-600 hover:bg-zinc-900"
            >
              📜 学習履歴
            </Link>
            <Link
              href="/highlights"
              className="rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 hover:border-zinc-600 hover:bg-zinc-900"
            >
              🔖 ハイライト
            </Link>
          </nav>
          <SubjectAccordion subjects={subjects} />
        </>
      ) : (
        <div className="rounded border border-zinc-800 bg-zinc-950 p-6 text-center">
          <p className="text-sm text-zinc-300">
            ログインすると 7 科目 × 5 論点のツリーが表示されます。
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white"
          >
            ログインに進む
          </Link>
        </div>
      )}
    </main>
  );
}
