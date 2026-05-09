import { z } from "zod";

import { getTopicById } from "@/content/shindanshi";
import { checkAndRecord } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/highlights";

const PostSchema = z.object({
  topicId: z.string().min(1),
  sectionHeading: z.string().min(1).max(120),
  text: z.string().min(1).max(2000),
  note: z.string().max(2000).optional(),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("highlights")
    .select("id, topic_id, section_heading, text, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[/api/highlights GET] failed:", error);
    return Response.json({ error: "fetch failed" }, { status: 500 });
  }
  return Response.json({ items: data ?? [] });
}

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
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const { topicId, sectionHeading, text, note } = parsed.data;

  if (!getTopicById(topicId)) {
    return Response.json({ error: "topic not found" }, { status: 404 });
  }

  const admin = getAdminClient();

  // 60秒60件のレート制限（POST 連打防止）
  const rl = await checkAndRecord(user.id, ENDPOINT, admin);
  if (!rl.ok) {
    return Response.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const { data, error } = await admin
    .from("highlights")
    .insert({
      user_id: user.id,
      topic_id: topicId,
      section_heading: sectionHeading,
      text,
      note: note ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[/api/highlights POST] insert failed:", error);
    return Response.json({ error: "insert failed" }, { status: 500 });
  }

  return Response.json({ id: data.id });
}

export async function DELETE(request: Request) {
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
  const parsed = DeleteSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const admin = getAdminClient();

  // 60秒60件のレート制限（DELETE 連打防止、POST と同じ枠を共有）
  const rl = await checkAndRecord(user.id, ENDPOINT, admin);
  if (!rl.ok) {
    return Response.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // user_id でも絞ることで他人の highlights を消せない（防御的二重チェック）
  const { error } = await admin
    .from("highlights")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[/api/highlights DELETE] failed:", error);
    return Response.json({ error: "delete failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
