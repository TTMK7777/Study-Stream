"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-red-400">
        Error
      </p>
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p className="text-sm text-zinc-400">
        ページの読み込みに失敗しました。リトライするか、ホームに戻ってください。
      </p>
      {error.digest ? (
        <p className="font-mono text-[10px] text-zinc-600">
          digest: {error.digest}
        </p>
      ) : null}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          もう一度試す
        </button>
        <Link
          href="/"
          className="rounded border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
        >
          ホームへ
        </Link>
      </div>
    </main>
  );
}
