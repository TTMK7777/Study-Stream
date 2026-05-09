"use client";

import Link from "next/link";
import { useState } from "react";

import type { Subject } from "@/content/shindanshi";

type Props = {
  subjects: readonly Subject[];
};

export function SubjectAccordion({ subjects }: Props) {
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(
    subjects[0]?.id ?? null,
  );

  return (
    <ul className="divide-y divide-zinc-800 overflow-hidden rounded border border-zinc-800">
      {subjects.map((subject) => {
        const isOpen = subject.id === openSubjectId;
        return (
          <li key={subject.id}>
            <button
              type="button"
              onClick={() => setOpenSubjectId(isOpen ? null : subject.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900"
            >
              <span className="font-medium">{subject.title}</span>
              <span className="text-xs text-zinc-500">
                {subject.topics.length} 論点
                <span className="ml-2 inline-block">{isOpen ? "▾" : "▸"}</span>
              </span>
            </button>
            {isOpen ? (
              <ul className="border-t border-zinc-900 bg-zinc-950">
                {subject.topics.map((topic) => (
                  <li key={topic.id}>
                    <Link
                      href={`/lesson/${topic.id}`}
                      className="flex items-center justify-between gap-3 border-b border-zinc-900/50 px-6 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-zinc-900"
                    >
                      <span>{topic.title}</span>
                      {topic.difficulty ? (
                        <span className="text-xs text-zinc-500">
                          難易度 {topic.difficulty}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
