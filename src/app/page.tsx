import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { signOut } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Study<span className="text-orange-500">Stream</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Phase 1 Sprint 1 — auth ready
        </p>
      </div>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-300">
            ログイン中: <span className="font-medium">{user.email}</span>
          </p>
          <p className="text-xs text-zinc-500">
            （論点ツリーは PR #12 マージ後に表示）
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              ログアウト
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          ログイン
        </Link>
      )}
    </main>
  );
}
