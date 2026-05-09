import type { Lesson } from "@/lib/anthropic/schemas";

import { VisualBlock } from "./visual-block";

export function LessonView({
  lesson,
  cached,
}: {
  lesson: Lesson;
  cached?: boolean;
}) {
  return (
    <article className="space-y-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
          {cached !== undefined ? (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                cached
                  ? "bg-emerald-950/50 text-emerald-400"
                  : "bg-orange-950/50 text-orange-400"
              }`}
            >
              {cached ? "cached" : "newly generated"}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-zinc-400">{lesson.subtitle}</p>
      </header>

      <div className="space-y-5">
        {lesson.sections.map((section) => (
          <section
            key={section.heading}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4"
          >
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <span className="text-lg">{section.icon}</span>
              {section.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">
              {section.content}
            </p>
            <VisualBlock visual={section.visual} />
          </section>
        ))}
      </div>

      <section className="rounded-md border border-orange-900/40 bg-orange-950/20 p-4">
        <h2 className="text-sm font-bold tracking-wide text-orange-300">
          試験で覚えるべき要点
        </h2>
        <ol className="mt-2 space-y-1 text-sm">
          {lesson.key_points.map((point, i) => (
            <li key={point} className="flex gap-2">
              <span className="font-bold text-orange-400">{i + 1}.</span>
              <span>{point}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
