import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminClient } from "./supabase/admin";

export const LESSON_RATE_LIMIT = 10;
export const RATE_LIMIT_WINDOW_SEC = 60;

/**
 * エンドポイントごとの分次レート制限上限。
 * 未登録のエンドポイントは LESSON_RATE_LIMIT をデフォルト適用。
 */
export const ENDPOINT_LIMITS: Readonly<Record<string, number>> = {
  "/api/lesson": LESSON_RATE_LIMIT, // 60秒10件（生成コスト発生のため厳格）
  "/api/study-history": 30, // POST 軽量だが連打 DB 圧迫対策
  "/api/highlights": 60, // POST/DELETE 軽量、GET は対象外
};

// 月次クォータ（コスト爆破防止の防御層）
export const USER_MONTHLY_LIMIT = 50;
export const GLOBAL_MONTHLY_LIMIT = 200;
export const MONTHLY_WINDOW_SEC = 30 * 24 * 60 * 60;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

export type QuotaResult =
  | { ok: true }
  | { ok: false; reason: "user" | "global"; current: number };

/**
 * count + INSERT をアトミックに行うレート制限チェック。
 *
 * Postgres 関数 check_and_record_rate_limit() で advisory lock を取得し、
 * (user_id, endpoint) ペアごとに直列化することで TOCTOU 競合を排除する。
 * 旧実装は SELECT count -> INSERT が非アトミックで、N 本の並列リクエストが
 * 同時に SELECT 完了 -> 全部 INSERT で制限すり抜けが可能だった (Issue #40 H-1)。
 *
 * service_role での実行を前提（api_calls は RLS で authenticated 完全 deny）。
 */
export async function checkAndRecord(
  userId: string,
  endpoint: string,
  client: SupabaseClient = getAdminClient(),
  _now: Date = new Date(),
): Promise<RateLimitResult> {
  const limit = ENDPOINT_LIMITS[endpoint] ?? LESSON_RATE_LIMIT;

  const { data, error } = await client.rpc("check_and_record_rate_limit", {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_limit: limit,
    p_window_seconds: RATE_LIMIT_WINDOW_SEC,
  });

  if (error) {
    throw new Error(`rate-limit RPC failed: ${error.message}`);
  }

  const result = data as { ok: boolean; retry_after?: number } | null;
  if (!result) {
    throw new Error("rate-limit RPC returned null");
  }
  if (result.ok) return { ok: true };
  return { ok: false, retryAfter: result.retry_after ?? RATE_LIMIT_WINDOW_SEC };
}

/**
 * 月次クォータをチェック（INSERT は行わず count のみ）。
 * `checkAndRecord` で同じ api_calls テーブルに INSERT されるため二重計上不要。
 *
 * - USER_MONTHLY_LIMIT: 個人ユーザーごと
 * - GLOBAL_MONTHLY_LIMIT: 全体予算（攻撃者が多数アカウント作成しても全体上限で頭打ち）
 */
export async function checkMonthlyQuota(
  userId: string,
  endpoint: string,
  client: SupabaseClient = getAdminClient(),
  now: Date = new Date(),
): Promise<QuotaResult> {
  const since = new Date(
    now.getTime() - MONTHLY_WINDOW_SEC * 1000,
  ).toISOString();

  const { count: userCount, error: userErr } = await client
    .from("api_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("called_at", since);

  if (userErr) {
    throw new Error(`monthly user count failed: ${userErr.message}`);
  }
  if ((userCount ?? 0) >= USER_MONTHLY_LIMIT) {
    return { ok: false, reason: "user", current: userCount ?? 0 };
  }

  const { count: globalCount, error: globalErr } = await client
    .from("api_calls")
    .select("id", { count: "exact", head: true })
    .eq("endpoint", endpoint)
    .gte("called_at", since);

  if (globalErr) {
    throw new Error(`monthly global count failed: ${globalErr.message}`);
  }
  if ((globalCount ?? 0) >= GLOBAL_MONTHLY_LIMIT) {
    return { ok: false, reason: "global", current: globalCount ?? 0 };
  }

  return { ok: true };
}
