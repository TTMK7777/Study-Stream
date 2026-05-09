import { describe, it, expect } from "vitest";
import { subjects, getSubjectById, getTopicById } from "@/content/shindanshi";

describe("content/shindanshi", () => {
  it("7 科目すべてが定義されている", () => {
    expect(subjects).toHaveLength(7);
    const ids = subjects.map((s) => s.id);
    expect(ids).toEqual([
      "keizai",
      "zaimu",
      "keiei",
      "unei",
      "keieihoumu",
      "jouhou",
      "chuusho",
    ]);
  });

  it("各科目に最低 5 論点ある（Sprint 1 骨格）", () => {
    for (const subject of subjects) {
      expect(subject.topics.length, `${subject.id}`).toBeGreaterThanOrEqual(5);
    }
  });

  it("topic.id は subject.id プレフィックスを持つ（衝突回避）", () => {
    for (const subject of subjects) {
      for (const topic of subject.topics) {
        expect(
          topic.id.startsWith(`${subject.id}-`),
          `${topic.id} は ${subject.id}- で始まるべき`,
        ).toBe(true);
      }
    }
  });

  it("topic.id がツリー全体で一意", () => {
    const allIds = subjects.flatMap((s) => s.topics.map((t) => t.id));
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it("各 topic に必須フィールド（id, title, tags）がある", () => {
    for (const subject of subjects) {
      for (const topic of subject.topics) {
        expect(topic.id, JSON.stringify(topic)).toBeTruthy();
        expect(topic.title, JSON.stringify(topic)).toBeTruthy();
        expect(Array.isArray(topic.tags), JSON.stringify(topic)).toBe(true);
        expect(topic.tags.length, JSON.stringify(topic)).toBeGreaterThan(0);
      }
    }
  });

  it("difficulty が定義されていれば 1..3 の範囲内", () => {
    for (const subject of subjects) {
      for (const topic of subject.topics) {
        if (topic.difficulty !== undefined) {
          expect([1, 2, 3]).toContain(topic.difficulty);
        }
      }
    }
  });

  it("getSubjectById / getTopicById が正しく解決する", () => {
    expect(getSubjectById("zaimu")?.title).toBe("財務・会計");
    expect(getSubjectById("not-exist")).toBeUndefined();

    const found = getTopicById("zaimu-roe");
    expect(found?.topic.title).toBe("ROE 分解（デュポン分析）");
    expect(found?.subject.id).toBe("zaimu");

    expect(getTopicById("not-exist-id")).toBeUndefined();
  });
});
