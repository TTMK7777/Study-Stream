"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Quiz } from "@/lib/anthropic/schemas";

type Props = {
  quiz: Quiz;
  answers: number[];
  topicId: string;
};

type SaveState = "saving" | "saved" | "error" | "skipped";

export function ResultView({ quiz, answers, topicId }: Props) {
  const score = quiz.reduce(
    (acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0),
    0,
  );
  const total = quiz.length;

  const [saveState, setSaveState] = useState<SaveState>("saving");
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;

    fetch("/api/study-history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topicId,
        quizScore: score,
        quizTotal: total,
      }),
    })
      .then((res) => {
        if (res.ok) {
          setSaveState("saved");
        } else if (res.status === 401) {
          setSaveState("skipped");
        } else {
          setSaveState("error");
        }
      })
      .catch(() => setSaveState("error"));
  }, [topicId, score, total]);

  const ratio = score / total;
  const tone =
    ratio === 1
      ? { color: "text-emerald-400", text: "全問正解" }
      : ratio >= 0.5
        ? { color: "text-orange-400", text: "あと一歩" }
        : { color: "text-red-400", text: "復習推奨" };

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-6 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        Result
      </p>
      <p className={`mt-2 text-4xl font-extrabold ${tone.color}`}>
        {score} / {total}
      </p>
      <p className={`mt-1 text-sm ${tone.color}`}>{tone.text}</p>

      <div className="mt-4 text-xs text-zinc-500">
        {saveState === "saving" ? "履歴を保存中…" : null}
        {saveState === "saved" ? "✓ 履歴を保存しました" : null}
        {saveState === "skipped" ? "（未ログインのため未保存）" : null}
        {saveState === "error" ? "履歴の保存に失敗しました" : null}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded border border-zinc-700 px-4 py-2 text-xs hover:border-zinc-500"
        >
          ホームに戻る
        </Link>
        <Link
          href="/history"
          className="rounded bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-white"
        >
          履歴を見る
        </Link>
      </div>
    </section>
  );
}
