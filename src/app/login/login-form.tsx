"use client";

import { useState, useTransition } from "react";

import { signInWithMagicLink } from "./actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInWithMagicLink(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
        <p>{email} にログインリンクを送信しました。</p>
        <p className="mt-1 text-xs text-emerald-300">
          メール内のリンクをクリックするとログインが完了します。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "送信中…" : "ログインリンクを送る"}
      </button>
      <p className="text-xs text-zinc-500">
        パスワード不要のマジックリンク方式です。届いたメール内のリンクをクリックしてください。
      </p>
    </form>
  );
}
