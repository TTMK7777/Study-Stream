"use client";

import { useState } from "react";

import type { Quiz } from "@/lib/anthropic/schemas";

import { ResultView } from "./result-view";

type Props = {
  quiz: Quiz;
  topicId: string;
};

export function QuizView({ quiz, topicId }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);

  if (answers.length === quiz.length) {
    return <ResultView quiz={quiz} answers={answers} topicId={topicId} />;
  }

  const current = quiz[index];
  const selected = answers[index];

  function selectOption(i: number) {
    if (revealed) return;
    const next = [...answers];
    next[index] = i;
    setAnswers(next);
    setRevealed(true);
  }

  function goNext() {
    setRevealed(false);
    if (index < quiz.length - 1) {
      setIndex(index + 1);
    } else {
      // commit final answer to trigger ResultView in next render
      setAnswers([...answers]);
    }
  }

  return (
    <section className="space-y-4 rounded-md border border-zinc-800 bg-zinc-900/40 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-bold">理解度クイズ</h2>
        <span className="text-xs text-zinc-500">
          {index + 1} / {quiz.length}
        </span>
      </header>

      <p className="text-sm leading-relaxed">{current.question}</p>

      <ul className="space-y-2">
        {current.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === current.correct;
          const showResult = revealed;
          let classes =
            "w-full rounded border px-3 py-2 text-left text-sm transition-colors ";
          if (showResult && isCorrect) {
            classes += "border-emerald-700 bg-emerald-950/40 text-emerald-100";
          } else if (showResult && isSelected && !isCorrect) {
            classes += "border-red-700 bg-red-950/40 text-red-100";
          } else if (isSelected) {
            classes += "border-orange-500 bg-orange-950/30";
          } else {
            classes +=
              "border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900";
          }
          return (
            <li key={`${current.question}-${i}`}>
              <button
                type="button"
                onClick={() => selectOption(i)}
                disabled={revealed}
                className={classes}
              >
                <span className="mr-2 font-bold">
                  {["ア", "イ", "ウ", "エ"][i]}
                </span>
                {opt}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed ? (
        <div className="rounded border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs font-bold text-orange-400">解説</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
            {current.explanation}
          </p>
          <button
            type="button"
            onClick={goNext}
            className="mt-3 rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white"
          >
            {index < quiz.length - 1 ? "次の問題へ" : "結果を見る"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
