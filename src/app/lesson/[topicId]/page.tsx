import { notFound, redirect } from "next/navigation";

import { LessonClient } from "@/components/lesson/lesson-client";
import { getTopicById } from "@/content/shindanshi";
import { ANTHROPIC_MODEL, PROMPT_VERSION } from "@/lib/anthropic";
import type { Lesson, Quiz } from "@/lib/anthropic/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ topicId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const { topicId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/lesson/${topicId}`);
  }

  const entry = getTopicById(topicId);
  if (!entry) notFound();

  let initialLesson: Lesson | undefined;
  let initialQuiz: Quiz | undefined;
  try {
    const admin = getAdminClient();
    const { data } = await admin
      .from("lessons_cache")
      .select("lesson_json, quiz_json")
      .eq("topic_id", topicId)
      .eq("model_version", ANTHROPIC_MODEL)
      .eq("prompt_version", PROMPT_VERSION)
      .maybeSingle();
    if (data) {
      initialLesson = data.lesson_json as Lesson;
      initialQuiz = data.quiz_json as Quiz;
    }
  } catch {
    // env 未設定や DB 不通でも UI は出す（client 側 fetch にフォールバック）
  }

  return (
    <LessonClient
      topicId={entry.topic.id}
      topicTitle={entry.topic.title}
      subjectTitle={entry.subject.title}
      initialLesson={initialLesson}
      initialQuiz={initialQuiz}
    />
  );
}
