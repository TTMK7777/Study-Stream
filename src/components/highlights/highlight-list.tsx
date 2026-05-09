"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type Item = {
  id: string;
  topic_id: string;
  topicTitle: string;
  section_heading: string;
  text: string;
  note: string | null;
  created_at: string;
};

export function HighlightList({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("このハイライトを削除しますか？")) return;
    setPendingId(id);
    startTransition(async () => {
      const res = await fetch("/api/highlights", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== id));
      } else {
        alert("削除に失敗しました");
      }
      setPendingId(null);
    });
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
            <Link
              href={`/lesson/${item.topic_id}`}
              className="truncate hover:text-orange-400"
            >
              {item.topicTitle} / {item.section_heading}
            </Link>
            <span className="shrink-0">
              {new Date(item.created_at).toLocaleString("ja-JP", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <blockquote className="border-l-2 border-orange-500 pl-3 text-sm leading-relaxed text-zinc-200">
            {item.text}
          </blockquote>
          {item.note ? (
            <p className="mt-2 text-xs text-zinc-400">📝 {item.note}</p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={pendingId === item.id}
              className="text-[11px] text-zinc-500 hover:text-red-400 disabled:opacity-50"
            >
              {pendingId === item.id ? "削除中…" : "削除"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
