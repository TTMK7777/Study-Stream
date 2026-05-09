"use client";

import { useEffect, useState } from "react";

type Selection = {
  text: string;
  sectionHeading: string;
  top: number;
  left: number;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function HighlightPopup({ topicId }: { topicId: string }) {
  const [sel, setSel] = useState<Selection | null>(null);
  const [save, setSave] = useState<SaveState>("idle");

  useEffect(() => {
    const handler = () => {
      // 次フレームで取得して selection 完了を確実に
      requestAnimationFrame(() => {
        const s = window.getSelection();
        if (!s || s.isCollapsed) {
          setSel(null);
          return;
        }
        const text = s.toString().trim();
        if (text.length < 2 || text.length > 500) {
          setSel(null);
          return;
        }
        const range = s.getRangeAt(0);
        const startNode = range.startContainer.parentElement;
        const sectionEl = startNode?.closest<HTMLElement>(
          "[data-section-heading]",
        );
        if (!sectionEl) {
          setSel(null);
          return;
        }
        const heading = sectionEl.dataset.sectionHeading ?? "(不明)";
        const rect = range.getBoundingClientRect();
        setSel({
          text,
          sectionHeading: heading,
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX,
        });
        setSave("idle");
      });
    };
    document.addEventListener("mouseup", handler);
    document.addEventListener("touchend", handler);
    return () => {
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("touchend", handler);
    };
  }, []);

  async function handleSave() {
    if (!sel) return;
    setSave("saving");
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topicId,
          sectionHeading: sel.sectionHeading,
          text: sel.text,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSave("saved");
      setTimeout(() => {
        setSel(null);
        window.getSelection()?.removeAllRanges();
      }, 800);
    } catch {
      setSave("error");
    }
  }

  if (!sel) return null;

  return (
    <div
      className="absolute z-40 flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg"
      style={{ top: sel.top, left: sel.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {save === "saved" ? (
        <span className="text-emerald-400">✓ 保存しました</span>
      ) : save === "error" ? (
        <span className="text-red-400">保存失敗</span>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={save === "saving"}
          className="rounded bg-orange-500 px-2 py-1 text-[11px] font-bold text-zinc-900 hover:bg-orange-400 disabled:opacity-50"
        >
          {save === "saving" ? "保存中…" : "🔖 ハイライト保存"}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setSel(null);
          window.getSelection()?.removeAllRanges();
        }}
        aria-label="閉じる"
        className="text-zinc-500 hover:text-zinc-300"
      >
        ×
      </button>
    </div>
  );
}
