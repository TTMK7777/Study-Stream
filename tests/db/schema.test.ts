import { describe, it, expect } from "vitest";
import {
  profiles,
  lessonsCache,
  studyHistory,
  highlights,
  apiCalls,
} from "@/db/schema";

describe("db/schema", () => {
  it("全テーブルが期待する Postgres 名で定義されている", () => {
    const tables = [
      [profiles, "profiles"],
      [lessonsCache, "lessons_cache"],
      [studyHistory, "study_history"],
      [highlights, "highlights"],
      [apiCalls, "api_calls"],
    ] as const;

    for (const [table, name] of tables) {
      // drizzle の internal symbol で table 名を取得
      const symbols = Object.getOwnPropertySymbols(table);
      const nameSymbol = symbols.find((s) =>
        s.toString().includes("OriginalName"),
      );
      const actual = nameSymbol
        ? (table as unknown as Record<symbol, string>)[nameSymbol]
        : undefined;
      expect(actual).toBe(name);
    }
  });

  it("lessons_cache に topic_id + model_version + prompt_version の一意制約がある", () => {
    const cols = Object.keys(lessonsCache);
    expect(cols).toContain("topicId");
    expect(cols).toContain("modelVersion");
    expect(cols).toContain("promptVersion");
  });

  it("study_history は subjectId を非正規化保持する（弱点分析の集計用）", () => {
    const cols = Object.keys(studyHistory);
    expect(cols).toContain("subjectId");
    expect(cols).toContain("topicId");
    expect(cols).toContain("quizScore");
  });

  it("highlights は section_heading + text + 任意の note を持つ", () => {
    const cols = Object.keys(highlights);
    expect(cols).toContain("sectionHeading");
    expect(cols).toContain("text");
    expect(cols).toContain("note");
  });
});
