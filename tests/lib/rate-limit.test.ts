import { describe, it, expect, vi } from "vitest";

import {
  checkAndRecord,
  checkMonthlyQuota,
  ENDPOINT_LIMITS,
  GLOBAL_MONTHLY_LIMIT,
  LESSON_RATE_LIMIT,
  RATE_LIMIT_WINDOW_SEC,
  USER_MONTHLY_LIMIT,
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

/**
 * 月次クォータ用: 1回目の count 呼び出し（user）と2回目の count 呼び出し（global）で
 * 異なる値を返すクライアント。`checkMonthlyQuota` の挙動検証に使う。
 */
function makeQuotaClient(opts: {
  userCount?: number;
  globalCount?: number;
  userError?: { message: string } | null;
  globalError?: { message: string } | null;
}) {
  let queryIndex = 0;
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(async () => {
      const idx = queryIndex++;
      if (idx === 0) {
        return {
          count: opts.userCount ?? 0,
          error: opts.userError ?? null,
        };
      }
      return {
        count: opts.globalCount ?? 0,
        error: opts.globalError ?? null,
      };
    }),
  };
  return { from: vi.fn(() => builder), _builder: builder };
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

  it("endpoint ごとに上限値が切り替わる: /api/highlights は 60 件まで通る", async () => {
    // /api/highlights の上限は 60 件
    const client = makeClient({ count: 30 });
    const result = await checkAndRecord(
      "user-1",
      "/api/highlights",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result).toEqual({ ok: true });
    expect(client._builder.insert).toHaveBeenCalled();
  });

  it("endpoint ごとに上限値が切り替わる: /api/study-history は 30 件で reject", async () => {
    const client = makeClient({ count: 30 });
    const result = await checkAndRecord(
      "user-1",
      "/api/study-history",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result.ok).toBe(false);
  });

  it("未登録エンドポイントは LESSON_RATE_LIMIT (10) フォールバック", async () => {
    const client = makeClient({ count: 10 });
    const result = await checkAndRecord(
      "user-1",
      "/api/unknown",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result.ok).toBe(false);
  });

  it("ENDPOINT_LIMITS マップが想定値を持つ", () => {
    expect(ENDPOINT_LIMITS["/api/lesson"]).toBe(LESSON_RATE_LIMIT);
    expect(ENDPOINT_LIMITS["/api/study-history"]).toBe(30);
    expect(ENDPOINT_LIMITS["/api/highlights"]).toBe(60);
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

describe("rate-limit: checkMonthlyQuota", () => {
  it("user/global ともに上限内 → ok:true", async () => {
    const client = makeQuotaClient({
      userCount: USER_MONTHLY_LIMIT - 1,
      globalCount: GLOBAL_MONTHLY_LIMIT - 1,
    });
    const result = await checkMonthlyQuota(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result).toEqual({ ok: true });
  });

  it("user 上限到達 → reason:user で reject", async () => {
    const client = makeQuotaClient({
      userCount: USER_MONTHLY_LIMIT,
      globalCount: 0,
    });
    const result = await checkMonthlyQuota(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("user");
      expect(result.current).toBe(USER_MONTHLY_LIMIT);
    }
  });

  it("user 内 / global 上限到達 → reason:global で reject", async () => {
    const client = makeQuotaClient({
      userCount: 1,
      globalCount: GLOBAL_MONTHLY_LIMIT,
    });
    const result = await checkMonthlyQuota(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("global");
    }
  });

  it("user count エラーは throw（global は問い合わせない）", async () => {
    const client = makeQuotaClient({
      userError: { message: "DB" },
    });
    await expect(
      checkMonthlyQuota(
        "user-1",
        "/api/lesson",
        // @ts-expect-error テスト用 mock
        client,
      ),
    ).rejects.toThrow(/monthly user/);
  });

  it("global count エラーは throw", async () => {
    const client = makeQuotaClient({
      userCount: 0,
      globalError: { message: "DB" },
    });
    await expect(
      checkMonthlyQuota(
        "user-1",
        "/api/lesson",
        // @ts-expect-error テスト用 mock
        client,
      ),
    ).rejects.toThrow(/monthly global/);
  });
});
