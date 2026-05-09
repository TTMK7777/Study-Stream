import { z } from "zod";

import { getTopicById } from "@/content/shindanshi";
import { ANTHROPIC_MODEL, PROMPT_VERSION } from "@/lib/anthropic";
import {
  generateLesson,
  generateQuiz,
} from "@/lib/anthropic/generators";
import type { Lesson, Quiz } from "@/lib/anthropic/schemas";
import { checkAndRecord, checkMonthlyQuota } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({ topicId: z.string().min(1) });

const ENDPOINT = "/api/lesson";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. body validate
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const { topicId } = parsed.data;

  // 3. topic existence
  const topicEntry = getTopicById(topicId);
  if (!topicEntry) {
    return Response.json({ error: "topic not found" }, { status: 404 });
  }

  // 4. cache lookup（cache hit はレート制限の対象外）
  const admin = getAdminClient();
  const { data: cached, error: cacheErr } = await admin
    .from("lessons_cache")
    .select("lesson_json, quiz_json")
    .eq("topic_id", topicId)
    .eq("model_version", ANTHROPIC_MODEL)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();

  if (cacheErr) {
    console.error("[/api/lesson] cache lookup failed:", cacheErr);
    return Response.json({ error: "internal error" }, { status: 500 });
  }

  if (cached) {
    return Response.json({
      lesson: cached.lesson_json as Lesson,
      quiz: cached.quiz_json as Quiz,
      cached: true,
    });
  }

  // 5. monthly quota（コスト爆破防止の防御層、cache miss のみ）
  const quota = await checkMonthlyQuota(user.id, ENDPOINT, admin);
  if (!quota.ok) {
    return Response.json(
      {
        error:
          quota.reason === "user"
            ? "monthly user quota exceeded"
            : "monthly global budget reached",
        current: quota.current,
      },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  // 6. minute rate-limit（cache miss = 生成コスト発生する場合のみカウント）
  const rl = await checkAndRecord(user.id, ENDPOINT, admin);
  if (!rl.ok) {
    return Response.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // 6. generate (parallel)
  let lesson: Lesson;
  let quiz: Quiz;
  try {
    const [lr, qr] = await Promise.all([
      generateLesson(topicEntry.topic),
      generateQuiz(topicEntry.topic),
    ]);
    lesson = lr.data;
    quiz = qr.data;
  } catch (err) {
    console.error("[/api/lesson] generation failed:", err);
    return Response.json({ error: "generation failed" }, { status: 502 });
  }

  // 7. INSERT cache（同時 generate の race は uniqueIndex 違反として無視）
  const { error: insertErr } = await admin.from("lessons_cache").insert({
    topic_id: topicId,
    model_version: ANTHROPIC_MODEL,
    prompt_version: PROMPT_VERSION,
    lesson_json: lesson,
    quiz_json: quiz,
  });
  if (insertErr && !/duplicate key/i.test(insertErr.message)) {
    console.error("[/api/lesson] cache insert failed:", insertErr);
    // 失敗してもレッスン自体は返却可能なので 200 維持
  }

  return Response.json({ lesson, quiz, cached: false });
}
