import { describe, it, expect } from "vitest";

import {
  LessonSchema,
  QuizSchema,
  VisualSchema,
  type Lesson,
} from "@/lib/anthropic/schemas";

const validBarVisual = {
  type: "bar",
  title: "売上構成",
  data: [
    { label: "国内", value: 70, color: "#3b82f6" },
    { label: "海外", value: 30, color: "#FF8C42" },
  ],
};

const validMetricsVisual = {
  type: "metrics",
  data: [
    { icon: "💰", label: "ROE", value: "12.5%" },
    { icon: "📈", label: "ROA", value: "8.0%" },
  ],
};

const validComparisonVisual = {
  type: "comparison",
  labels: { left: "従来", right: "改善後" },
  data: [
    { aspect: "コスト", left: "100", right: "70" },
    { aspect: "納期", left: "30日", right: "15日" },
  ],
};

const validNoneVisual = { type: "none" };

const buildLesson = (
  override: Partial<Lesson> = {},
): Record<string, unknown> => ({
  title: "ROE 分解（デュポン分析）",
  subtitle: "自己資本利益率を3要素に分解する分析手法",
  sections: [
    {
      icon: "📐",
      heading: "ROE の定義",
      content:
        "ROE（自己資本利益率）は当期純利益を自己資本で除した比率で、株主から見た投資効率を示す主要な収益性指標である。",
      visual: validBarVisual,
    },
    {
      icon: "🧩",
      heading: "3要素分解",
      content:
        "ROE は売上高利益率・総資産回転率・財務レバレッジの3要素の積に分解できる。デュポン分析と呼ばれる。",
      visual: validMetricsVisual,
    },
    {
      icon: "🧮",
      heading: "計算例",
      content:
        "売上高利益率5%、総資産回転率1.0、財務レバレッジ2.0の場合、ROE = 5% × 1.0 × 2.0 = 10% となる。",
      visual: validComparisonVisual,
    },
    {
      icon: "🎯",
      heading: "試験ポイント",
      content:
        "各要素の改善が ROE に与える影響と、財務レバレッジ過剰によるリスクは頻出論点として押さえる必要がある。",
      visual: validNoneVisual,
    },
  ],
  key_points: [
    "ROE は3要素の積に分解できる",
    "財務レバレッジは諸刃の剣",
    "業種特性で各要素の重みが異なる",
  ],
  ...override,
});

const buildQuiz = (): unknown =>
  Array.from({ length: 3 }).map((_, i) => ({
    question: `問題${i + 1}: ROE に関する記述として最も適切なものはどれか。`,
    options: [
      "選択肢A の説明文",
      "選択肢B の説明文",
      "選択肢C の説明文",
      "選択肢D の説明文",
    ],
    correct: i % 4,
    explanation: "正解は X、理由は Y、その他選択肢の誤りも併記する解説文。",
  }));

describe("anthropic/schemas: VisualSchema", () => {
  it("bar visual の正常系", () => {
    expect(() => VisualSchema.parse(validBarVisual)).not.toThrow();
  });
  it("metrics visual の正常系", () => {
    expect(() => VisualSchema.parse(validMetricsVisual)).not.toThrow();
  });
  it("comparison visual の正常系", () => {
    expect(() => VisualSchema.parse(validComparisonVisual)).not.toThrow();
  });
  it("none visual の正常系", () => {
    expect(() => VisualSchema.parse(validNoneVisual)).not.toThrow();
  });

  it("不明な type は拒否", () => {
    expect(() => VisualSchema.parse({ type: "pie", data: [] })).toThrow();
  });

  it("bar の color が hex でない場合は拒否", () => {
    expect(() =>
      VisualSchema.parse({
        type: "bar",
        data: [{ label: "x", value: 50, color: "red" }],
      }),
    ).toThrow();
  });

  it("bar の value が 100 超は拒否", () => {
    expect(() =>
      VisualSchema.parse({
        type: "bar",
        data: [{ label: "x", value: 150, color: "#abc" }],
      }),
    ).toThrow();
  });

  it("bar の data 6件以上は拒否（上限5件）", () => {
    const tooMany = {
      type: "bar",
      data: Array.from({ length: 6 }).map((_, i) => ({
        label: `l${i}`,
        value: 50,
        color: "#abc",
      })),
    };
    expect(() => VisualSchema.parse(tooMany)).toThrow();
  });

  it("comparison の labels が欠損だと拒否", () => {
    expect(() =>
      VisualSchema.parse({
        type: "comparison",
        data: [{ aspect: "x", left: "a", right: "b" }],
      }),
    ).toThrow();
  });
});

describe("anthropic/schemas: LessonSchema", () => {
  it("正常系のレッスンが parse できる", () => {
    expect(() => LessonSchema.parse(buildLesson())).not.toThrow();
  });

  it("sections が4件でないと拒否", () => {
    const lesson = buildLesson();
    lesson.sections = (lesson.sections as unknown[]).slice(0, 3);
    expect(() => LessonSchema.parse(lesson)).toThrow();
  });

  it("section.content が短すぎる（40字未満）と拒否", () => {
    const lesson = buildLesson();
    (lesson.sections as Array<{ content: string }>)[0].content = "短すぎる";
    expect(() => LessonSchema.parse(lesson)).toThrow();
  });

  it("section.content が長すぎる（220字超）と拒否", () => {
    const lesson = buildLesson();
    (lesson.sections as Array<{ content: string }>)[0].content = "あ".repeat(
      221,
    );
    expect(() => LessonSchema.parse(lesson)).toThrow();
  });

  it("key_points が3件でないと拒否", () => {
    const lesson = buildLesson();
    lesson.key_points = ["1点だけ"];
    expect(() => LessonSchema.parse(lesson)).toThrow();
  });
});

describe("anthropic/schemas: QuizSchema", () => {
  it("正常系のクイズ3問が parse できる", () => {
    expect(() => QuizSchema.parse(buildQuiz())).not.toThrow();
  });

  it("3問でないと拒否", () => {
    const q = (buildQuiz() as unknown[]).slice(0, 2);
    expect(() => QuizSchema.parse(q)).toThrow();
  });

  it("options が4つでないと拒否", () => {
    const q = buildQuiz() as Array<{ options: string[] }>;
    q[0].options = ["A", "B", "C"];
    expect(() => QuizSchema.parse(q)).toThrow();
  });

  it("correct が範囲外（4以上）だと拒否", () => {
    const q = buildQuiz() as Array<{ correct: number }>;
    q[0].correct = 4;
    expect(() => QuizSchema.parse(q)).toThrow();
  });

  it("correct が小数だと拒否", () => {
    const q = buildQuiz() as Array<{ correct: number }>;
    q[0].correct = 1.5;
    expect(() => QuizSchema.parse(q)).toThrow();
  });
});
