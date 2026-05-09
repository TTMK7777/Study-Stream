import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        404
      </p>
      <h1 className="text-2xl font-bold">ページが見つかりません</h1>
      <p className="text-sm text-zinc-400">
        URL が間違っているか、削除された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-2 rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
      >
        ホームへ
      </Link>
    </main>
  );
}
