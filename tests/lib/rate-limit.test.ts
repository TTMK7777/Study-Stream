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
  rpcData?:
    | {
        ok: boolean;
        reason?: "minute" | "monthly_user" | "monthly_global";
        retry_after?: number;
      }
    | null;
  rpcError?: { message: string } | null;
}) {
  const rpc = vi.fn(async () => ({
    data: opts.rpcData === undefined ? { ok: true } : opts.rpcData,
    error: opts.rpcError ?? null,
  }));
  return { rpc, _rpc: rpc };
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
  it("RPC が ok:true を返したら ok:true を返す", async () => {
    const client = makeClient({ rpcData: { ok: true } });
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result).toEqual({ ok: true });
    expect(client._rpc).toHaveBeenCalledWith("check_and_record_rate_limit", {
      p_user_id: "user-1",
      p_endpoint: "/api/lesson",
      p_limit: LESSON_RATE_LIMIT,
      p_window_seconds: RATE_LIMIT_WINDOW_SEC,
      p_monthly_limit: 0,
      p_global_monthly_limit: 0,
    });
  });

  it("monthlyLimit / globalMonthlyLimit を渡すと RPC に転送される (TOCTOU 統合経路)", async () => {
    const client = makeClient({ rpcData: { ok: true } });
    await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
      { monthlyLimit: USER_MONTHLY_LIMIT, globalMonthlyLimit: GLOBAL_MONTHLY_LIMIT },
    );
    expect(client._rpc).toHaveBeenCalledWith(
      "check_and_record_rate_limit",
      expect.objectContaining({
        p_monthly_limit: USER_MONTHLY_LIMIT,
        p_global_monthly_limit: GLOBAL_MONTHLY_LIMIT,
      }),
    );
  });

  it("RPC が ok:false (minute) を返したら reason:minute と retryAfter 付きで reject", async () => {
    const client = makeClient({
      rpcData: {
        ok: false,
        reason: "minute",
        retry_after: RATE_LIMIT_WINDOW_SEC,
      },
    });
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(result).toEqual({
      ok: false,
      reason: "minute",
      retryAfter: RATE_LIMIT_WINDOW_SEC,
    });
  });

  it("RPC が ok:false (monthly_user) を返したら reason:monthly_user で reject", async () => {
    const client = makeClient({
      rpcData: { ok: false, reason: "monthly_user", retry_after: 86400 },
    });
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
      { monthlyLimit: USER_MONTHLY_LIMIT },
    );
    expect(result).toEqual({
      ok: false,
      reason: "monthly_user",
      retryAfter: 86400,
    });
  });

  it("RPC が ok:false (monthly_global) を返したら reason:monthly_global で reject", async () => {
    const client = makeClient({
      rpcData: { ok: false, reason: "monthly_global", retry_after: 86400 },
    });
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
      { globalMonthlyLimit: GLOBAL_MONTHLY_LIMIT },
    );
    expect(result).toEqual({
      ok: false,
      reason: "monthly_global",
      retryAfter: 86400,
    });
  });

  it("RPC エラーは throw", async () => {
    const client = makeClient({
      rpcError: { message: "function does not exist" },
    });
    await expect(
      checkAndRecord(
        "user-1",
        "/api/lesson",
        // @ts-expect-error テスト用 mock
        client,
      ),
    ).rejects.toThrow(/RPC failed/);
  });

  it("RPC 戻り値が null の場合は throw", async () => {
    const client = makeClient({ rpcData: null });
    await expect(
      checkAndRecord(
        "user-1",
        "/api/lesson",
        // @ts-expect-error テスト用 mock
        client,
      ),
    ).rejects.toThrow(/returned null/);
  });

  it("/api/highlights の上限 (60) が p_limit に渡る", async () => {
    const client = makeClient({ rpcData: { ok: true } });
    await checkAndRecord(
      "user-1",
      "/api/highlights",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(client._rpc).toHaveBeenCalledWith(
      "check_and_record_rate_limit",
      expect.objectContaining({ p_limit: 60 }),
    );
  });

  it("未登録エンドポイントは LESSON_RATE_LIMIT (10) フォールバック", async () => {
    const client = makeClient({ rpcData: { ok: true } });
    await checkAndRecord(
      "user-1",
      "/api/unknown",
      // @ts-expect-error テスト用 mock
      client,
    );
    expect(client._rpc).toHaveBeenCalledWith(
      "check_and_record_rate_limit",
      expect.objectContaining({ p_limit: LESSON_RATE_LIMIT }),
    );
  });

  it("ENDPOINT_LIMITS マップが想定値を持つ", () => {
    expect(ENDPOINT_LIMITS["/api/lesson"]).toBe(LESSON_RATE_LIMIT);
    expect(ENDPOINT_LIMITS["/api/study-history"]).toBe(30);
    expect(ENDPOINT_LIMITS["/api/highlights"]).toBe(60);
  });

  it("retry_after / reason が未設定なら minute + RATE_LIMIT_WINDOW_SEC フォールバック", async () => {
    const client = makeClient({ rpcData: { ok: false } });
    const result = await checkAndRecord(
      "user-1",
      "/api/lesson",
      // @ts-expect-error テスト用 mock
      client,
    );
    if (!result.ok) {
      expect(result.retryAfter).toBe(RATE_LIMIT_WINDOW_SEC);
      expect(result.reason).toBe("minute");
    } else {
      throw new Error("expected ok:false");
    }
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
