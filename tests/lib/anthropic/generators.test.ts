import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Topic } from "@/content/shindanshi";
import { generateLesson, generateQuiz } from "@/lib/anthropic/generators";

const TOPIC: Topic = {
  id: "zaimu-roe",
  title: "ROE 分解（デュポン分析）",
  difficulty: 2,
  tags: ["経営分析", "収益性"],
  promptHint: "ROE = 売上高利益率 × 総資産回転率 × 財務レバレッジ。",
};

function buildValidLessonInput() {
  return {
    title: "ROE 分解（デュポン分析）",
    subtitle: "自己資本利益率を3要素に分解する分析手法",
    sections: [
      {
        icon: "📐",
        heading: "ROE の定義",
        content:
          "ROE（自己資本利益率）は当期純利益を自己資本で除した比率で、株主から見た投資効率を示す主要な収益性指標である。",
        visual: { type: "none" },
      },
      {
        icon: "🧩",
        heading: "3要素分解",
        content:
          "ROE は売上高利益率・総資産回転率・財務レバレッジの3要素の積に分解できる。デュポン分析と呼ばれる。",
        visual: { type: "none" },
      },
      {
        icon: "🧮",
        heading: "計算例",
        content:
          "売上高利益率5%、総資産回転率1.0、財務レバレッジ2.0の場合、ROE = 5% × 1.0 × 2.0 = 10% となる。",
        visual: { type: "none" },
      },
      {
        icon: "🎯",
        heading: "試験ポイント",
        content:
          "各要素の改善が ROE に与える影響と、財務レバレッジ過剰によるリスクは頻出論点として押さえる必要がある。",
        visual: { type: "none" },
      },
    ],
    key_points: ["要点1の十分な長さ", "要点2の十分な長さ", "要点3の十分な長さ"],
  };
}

function buildValidQuizWrapperInput() {
  return {
    questions: Array.from({ length: 3 }).map((_, i) => ({
      question: `問題${i + 1}: ROE に関する適切な記述はどれか。`,
      options: [
        "選択肢A の説明文",
        "選択肢B の説明文",
        "選択肢C の説明文",
        "選択肢D の説明文",
      ],
      correct: i % 4,
      explanation: "正解は X、理由は Y。",
    })),
  };
}

function mockMessage(toolName: string, input: unknown) {
  return {
    content: [
      {
        type: "tool_use",
        id: "tool_1",
        name: toolName,
        input,
      },
    ],
  };
}

function mockClient(create: ReturnType<typeof vi.fn>) {
  return {
    messages: { create },
  } as unknown as Parameters<typeof generateLesson>[1] extends infer O
    ? O extends { client?: infer C }
      ? C
      : never
    : never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generators: generateLesson", () => {
  it("初回で valid 出力 → retried:false", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(
        mockMessage("submit_lesson", buildValidLessonInput()),
      );
    const result = await generateLesson(TOPIC, { client: mockClient(create) });
    expect(result.retried).toBe(false);
    expect(result.data.title).toContain("ROE");
    expect(result.data.sections).toHaveLength(4);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("初回 invalid → 2回目 valid → retried:true", async () => {
    const invalid = buildValidLessonInput();
    invalid.sections = invalid.sections.slice(0, 3);
    const create = vi
      .fn()
      .mockResolvedValueOnce(mockMessage("submit_lesson", invalid))
      .mockResolvedValueOnce(
        mockMessage("submit_lesson", buildValidLessonInput()),
      );
    const result = await generateLesson(TOPIC, { client: mockClient(create) });
    expect(result.retried).toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
    const secondCallArg = create.mock.calls[1][0];
    expect(secondCallArg.messages[0].content).toContain("検証エラー");
  });

  it("初回も2回目も invalid → throw", async () => {
    const invalid = buildValidLessonInput();
    invalid.sections = invalid.sections.slice(0, 3);
    const create = vi
      .fn()
      .mockResolvedValue(mockMessage("submit_lesson", invalid));
    await expect(
      generateLesson(TOPIC, { client: mockClient(create) }),
    ).rejects.toThrow(/2回連続/);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("tool_use ブロックが応答に無いと throw", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "ごめんなさい" }],
    });
    await expect(
      generateLesson(TOPIC, { client: mockClient(create) }),
    ).rejects.toThrow(/tool_use/);
  });

  it("system に cache_control: ephemeral が付与されている", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(
        mockMessage("submit_lesson", buildValidLessonInput()),
      );
    await generateLesson(TOPIC, { client: mockClient(create) });
    const arg = create.mock.calls[0][0];
    expect(Array.isArray(arg.system)).toBe(true);
    expect(arg.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("tool_choice で submit_lesson が強制指定されている", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(
        mockMessage("submit_lesson", buildValidLessonInput()),
      );
    await generateLesson(TOPIC, { client: mockClient(create) });
    const arg = create.mock.calls[0][0];
    expect(arg.tool_choice).toEqual({ type: "tool", name: "submit_lesson" });
  });
});

describe("generators: generateQuiz", () => {
  it("初回で valid 出力 → retried:false", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(
        mockMessage("submit_quiz", buildValidQuizWrapperInput()),
      );
    const result = await generateQuiz(TOPIC, { client: mockClient(create) });
    expect(result.retried).toBe(false);
    expect(result.data).toHaveLength(3);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("初回 invalid → 2回目 valid → retried:true", async () => {
    const invalid = buildValidQuizWrapperInput();
    invalid.questions[0].options = ["A", "B"];
    const create = vi
      .fn()
      .mockResolvedValueOnce(mockMessage("submit_quiz", invalid))
      .mockResolvedValueOnce(
        mockMessage("submit_quiz", buildValidQuizWrapperInput()),
      );
    const result = await generateQuiz(TOPIC, { client: mockClient(create) });
    expect(result.retried).toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
