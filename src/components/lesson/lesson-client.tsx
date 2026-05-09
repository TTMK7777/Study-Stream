"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Lesson, Quiz } from "@/lib/anthropic/schemas";

import { LessonView } from "./lesson-view";
import { QuizView } from "./quiz-view";

type Props = {
  topicId: string;
  topicTitle: string;
  subjectTitle: string;
  initialLesson?: Lesson;
  initialQuiz?: Quiz;
};

type State =
  | { phase: "idle"; lesson: Lesson; quiz: Quiz; cached: boolean }
  | { phase: "loading" }
  | { phase: "error"; message: string };

export function LessonClient({
  topicId,
  topicTitle,
  subjectTitle,
  initialLesson,
  initialQuiz,
}: Props) {
  const [state, setState] = useState<State>(
    initialLesson && initialQuiz
      ? {
          phase: "idle",
          lesson: initialLesson,
          quiz: initialQuiz,
          cached: true,
        }
      : { phase: "loading" },
  );

  useEffect(() => {
    if (state.phase !== "loading") return;
    const ctrl = new AbortController();
    fetch("/api/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topicId }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((body: { lesson: Lesson; quiz: Quiz; cached: boolean }) => {
        setState({
          phase: "idle",
          lesson: body.lesson,
          quiz: body.quiz,
          cached: body.cached,
        });
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setState({ phase: "error", message: err.message });
      });
    return () => ctrl.abort();
  }, [state.phase, topicId]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="mb-6 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          ホーム
        </Link>
        <span className="mx-2">/</span>
        <span>{subjectTitle}</span>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{topicTitle}</span>
      </nav>

      {state.phase === "loading" ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-center">
          <p className="text-sm text-zinc-300">
            🤖 AI がレッスンを生成中… 約 10-20 秒
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            並列で 4 セクションのレッスンと 4 択クイズ 3 問を作成しています。
          </p>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <div className="rounded-md border border-red-900/40 bg-red-950/20 p-6">
          <p className="text-sm font-semibold text-red-300">
            生成に失敗しました
          </p>
          <p className="mt-1 text-xs text-zinc-400">{state.message}</p>
          <button
            type="button"
            onClick={() => setState({ phase: "loading" })}
            className="mt-3 rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-zinc-500"
          >
            再試行
          </button>
        </div>
      ) : null}

      {state.phase === "idle" ? (
        <div className="space-y-8">
          <LessonView lesson={state.lesson} cached={state.cached} />
          <QuizView quiz={state.quiz} topicId={topicId} />
        </div>
      ) : null}
    </main>
  );
}
