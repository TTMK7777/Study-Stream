import { z } from "zod";

import { getTopicById } from "@/content/shindanshi";
import { checkAndRecord } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  topicId: z.string().min(1),
  quizScore: z.number().int().min(0).max(3),
  quizTotal: z.number().int().min(1).max(3).default(3),
});

const ENDPOINT = "/api/study-history";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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
  const { topicId, quizScore, quizTotal } = parsed.data;

  const entry = getTopicById(topicId);
  if (!entry) {
    return Response.json({ error: "topic not found" }, { status: 404 });
  }

  // 非正規化: subject_id をクライアントから受け取らず、サーバー側で論点ツリーから解決
  const subjectId = entry.subject.id;

  const admin = getAdminClient();

  // 60秒30件のレート制限（POST 連打防止）
  const rl = await checkAndRecord(user.id, ENDPOINT, admin);
  if (!rl.ok) {
    return Response.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const { error } = await admin.from("study_history").insert({
    user_id: user.id,
    topic_id: topicId,
    subject_id: subjectId,
    quiz_score: quizScore,
    quiz_total: quizTotal,
  });

  if (error) {
    console.error("[/api/study-history] insert failed:", error);
    return Response.json({ error: "insert failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
