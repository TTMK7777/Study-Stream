"use client";

import { useEffect } from "react";

import type { Topic } from "@/content/shindanshi";

type Props = {
  topic: Topic;
  onClose: () => void;
};

export function NotImplementedModal({ topic, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded border border-zinc-700 bg-zinc-900 p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-modal-title"
      >
        <h2 id="topic-modal-title" className="text-base font-semibold">
          {topic.title}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          レッスン生成機能は Sprint 2 で実装予定です。
        </p>
        {topic.tags.length > 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            タグ: {topic.tags.join(" / ")}
          </p>
        ) : null}
        {topic.promptHint ? (
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            {topic.promptHint}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
