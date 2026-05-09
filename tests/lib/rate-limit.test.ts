import { describe, it, expect, vi } from "vitest";

import {
  checkAndRecord,
  LESSON_RATE_LIMIT,
  RATE_LIMIT_WINDOW_SEC,
} from "@/lib/rate-limit";

function makeClient(opts: {
  count?: number;
  countError?: { message: string } | null;
  insertError?: { message: string } | null;
}) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(async () => ({
      count: opts.count ?? 0,
      error: opts.countError ?? null,
    })),
    insert: vi.fn(async () => ({ error: opts.insertError ?? null })),
  };
  return {
    from: vi.fn(() => builder),
    _builder: builder,
  };
}

describe("rate-limit: checkAndRecord", () => {
  it("カウント < 上限 → INSERT して ok:true", async () => {
    const client = makeClient({ count: LESSON_RATE_LIMIT - 1 });
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result).toEqual({ ok: true });
    expect(client._builder.insert).toHaveBeenCalled();
  });

  it("カウント = 上限 → ok:false で retryAfter", async () => {
    const client = makeClient({ count: LESSON_RATE_LIMIT });
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result).toEqual({
      ok: false,
      retryAfter: RATE_LIMIT_WINDOW_SEC,
    });
    expect(client._builder.insert).not.toHaveBeenCalled();
  });

  it("count エラーは throw", async () => {
    const client = makeClient({
      countError: { message: "DB down" },
    });
    await expect(
      checkAndRecord(
        "user-1",
        "/api/lesson",
        // @ts-expect-error テスト用 mock
        client,
      ),
    ).rejects.toThrow(/count failed/);
  });

  it("INSERT エラーは throw", async () => {
    const client = makeClient({
      count: 0,
      insertError: { message: "permission denied" },
    });
    await expect(
      checkAndRecord(
        "user-1",
        "/api/lesson",
        // @ts-expect-error テスト用 mock
        client,
      ),
    ).rejects.toThrow(/insert failed/);
  });

  it("count が null の場合は 0 件として扱う", async () => {
    // Supabase の count が null になるエッジケース
    const client = makeClient({});
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result).toEqual({ ok: true });
  });
});
