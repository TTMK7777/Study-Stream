import { z } from "zod";

import { getTopicById } from "@/content/shindanshi";
import { ANTHROPIC_MODEL, PROMPT_VERSION } from "@/lib/anthropic";
import {
  generateLesson,
  generateQuiz,
} from "@/lib/anthropic/generators";
import type { Lesson, Quiz } from "@/lib/anthropic/schemas";
import {
  GLOBAL_MONTHLY_LIMIT,
  USER_MONTHLY_LIMIT,
  checkAndRecord,
} from "@/lib/rate-limit";
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

  // 5. rate-limit + monthly quota（コスト爆破防止の防御層、cache miss のみ）
  //
  // Issue #48 H-1: 分次レート制限と月次クォータ (USER / GLOBAL) を同一
  // advisory lock・同一トランザクションで検証する。旧実装では
  // checkMonthlyQuota (SELECT のみ) と checkAndRecord (advisory lock + INSERT)
  // が別トランザクションで実行されていたため、並列リクエストが両方を
  // すり抜けて月次上限を大幅超過する TOCTOU 競合があった。
  const rl = await checkAndRecord(user.id, ENDPOINT, admin, {
    monthlyLimit: USER_MONTHLY_LIMIT,
    globalMonthlyLimit: GLOBAL_MONTHLY_LIMIT,
  });
  if (!rl.ok) {
    const errorMessage =
      rl.reason === "monthly_user"
        ? "monthly user quota exceeded"
        : rl.reason === "monthly_global"
          ? "monthly global budget reached"
          : "rate limit exceeded";
    return Response.json(
      { error: errorMessage },
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
