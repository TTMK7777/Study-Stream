import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import type { Topic } from "@/content/shindanshi";

import { ANTHROPIC_MODEL, getAnthropicClient } from ".";
import { LESSON_SYS, QUIZ_SYS } from "./prompts";
import {
  LessonSchema,
  QuizSchema,
  type Lesson,
  type Quiz,
} from "./schemas";

const LESSON_TOOL_NAME = "submit_lesson";
const QUIZ_TOOL_NAME = "submit_quiz";

// QuizSchema は配列スキーマなので、tool input には wrapper でくるむ
const QuizWrapperSchema = z.object({ questions: QuizSchema });

const LESSON_TOOL = {
  name: LESSON_TOOL_NAME,
  description:
    "中小企業診断士1次試験の指定論点について構造化された学習レッスンを返す。",
  input_schema: z.toJSONSchema(LessonSchema, {
    target: "draft-7",
  }) as Record<string, unknown>,
};

const QUIZ_TOOL = {
  name: QUIZ_TOOL_NAME,
  description: "指定論点に対する4択クイズを3問構造化して返す。",
  input_schema: z.toJSONSchema(QuizWrapperSchema, {
    target: "draft-7",
  }) as Record<string, unknown>,
};

type GenerateOptions = {
  client?: Anthropic;
  model?: string;
  maxTokens?: number;
};

export type GenerateResult<T> = {
  data: T;
  retried: boolean;
};

function buildUserMessage(topic: Topic, kind: "lesson" | "quiz"): string {
  const tags = topic.tags.length > 0 ? topic.tags.join(", ") : "（なし）";
  const hint = topic.promptHint ?? "（補足なし）";
  const target =
    kind === "lesson"
      ? "上記論点に対する4セクション構成のレッスンを作成してください。"
      : "上記論点に対する4択クイズを3問作成してください。";
  return [
    `論点タイトル: ${topic.title}`,
    `論点ID: ${topic.id}`,
    `タグ: ${tags}`,
    `補足ヒント: ${hint}`,
    "",
    target,
  ].join("\n");
}

function extractToolInput(
  message: Anthropic.Messages.Message,
  toolName: string,
): unknown {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return block.input;
    }
  }
  throw new Error(
    `Anthropic 応答に tool_use(${toolName}) ブロックが見つかりませんでした。`,
  );
}

export async function generateLesson(
  topic: Topic,
  opts: GenerateOptions = {},
): Promise<GenerateResult<Lesson>> {
  const client = opts.client ?? getAnthropicClient();
  const model = opts.model ?? ANTHROPIC_MODEL;
  const maxTokens = opts.maxTokens ?? 2500;

  const tools: Anthropic.Messages.Tool[] = [
    LESSON_TOOL as unknown as Anthropic.Messages.Tool,
  ];

  const baseUserMsg = buildUserMessage(topic, "lesson");

  const callOnce = async (
    userMsg: string,
  ): Promise<{ raw: unknown; parsed: Lesson | null; error: z.ZodError | null }> => {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: LESSON_SYS,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      tool_choice: { type: "tool", name: LESSON_TOOL_NAME },
      messages: [{ role: "user", content: userMsg }],
    });
    const raw = extractToolInput(response, LESSON_TOOL_NAME);
    const result = LessonSchema.safeParse(raw);
    if (result.success) {
      return { raw, parsed: result.data, error: null };
    }
    return { raw, parsed: null, error: result.error };
  };

  const first = await callOnce(baseUserMsg);
  if (first.parsed) return { data: first.parsed, retried: false };

  // CTO 所見 [I] 反映: zod 検証失敗時は1回だけ retry。
  // 前回エラー要約を user message に追記してモデルに修正を促す。
  const errorSummary = formatZodError(first.error!);
  const retryMsg = `${baseUserMsg}\n\n## 前回出力の検証エラー\n${errorSummary}\n上記を踏まえ、スキーマに完全に適合する形で再生成してください。`;
  const retry = await callOnce(retryMsg);
  if (retry.parsed) return { data: retry.parsed, retried: true };

  throw new Error(
    `Lesson 生成が2回連続でスキーマ検証に失敗しました。\n${formatZodError(retry.error!)}`,
  );
}

export async function generateQuiz(
  topic: Topic,
  opts: GenerateOptions = {},
): Promise<GenerateResult<Quiz>> {
  const client = opts.client ?? getAnthropicClient();
  const model = opts.model ?? ANTHROPIC_MODEL;
  const maxTokens = opts.maxTokens ?? 2000;

  const tools: Anthropic.Messages.Tool[] = [
    QUIZ_TOOL as unknown as Anthropic.Messages.Tool,
  ];

  const baseUserMsg = buildUserMessage(topic, "quiz");

  const callOnce = async (
    userMsg: string,
  ): Promise<{ raw: unknown; parsed: Quiz | null; error: z.ZodError | null }> => {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: QUIZ_SYS,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      tool_choice: { type: "tool", name: QUIZ_TOOL_NAME },
      messages: [{ role: "user", content: userMsg }],
    });
    const raw = extractToolInput(response, QUIZ_TOOL_NAME);
    const wrapper = QuizWrapperSchema.safeParse(raw);
    if (wrapper.success) {
      return { raw, parsed: wrapper.data.questions, error: null };
    }
    return { raw, parsed: null, error: wrapper.error };
  };

  const first = await callOnce(baseUserMsg);
  if (first.parsed) return { data: first.parsed, retried: false };

  const errorSummary = formatZodError(first.error!);
  const retryMsg = `${baseUserMsg}\n\n## 前回出力の検証エラー\n${errorSummary}\n上記を踏まえ、スキーマに完全に適合する形で再生成してください。`;
  const retry = await callOnce(retryMsg);
  if (retry.parsed) return { data: retry.parsed, retried: true };

  throw new Error(
    `Quiz 生成が2回連続でスキーマ検証に失敗しました。\n${formatZodError(retry.error!)}`,
  );
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}
