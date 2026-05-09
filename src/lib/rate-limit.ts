import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminClient } from "./supabase/admin";

export const LESSON_RATE_LIMIT = 10;
export const RATE_LIMIT_WINDOW_SEC = 60;

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
 * 過去 RATE_LIMIT_WINDOW_SEC 秒の api_calls をカウントし、
 * LESSON_RATE_LIMIT 未満なら INSERT して ok:true を返す。
 *
 * service_role での実行を前提（api_calls は RLS で authenticated 完全 deny）。
 */
export async function checkAndRecord(
  userId: string,
  endpoint: string,
  client: SupabaseClient = getAdminClient(),
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const since = new Date(now.getTime() - RATE_LIMIT_WINDOW_SEC * 1000);

  const { count, error: countError } = await client
    .from("api_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("called_at", since.toISOString());

  if (countError) {
    throw new Error(`rate-limit count failed: ${countError.message}`);
  }

  if ((count ?? 0) >= LESSON_RATE_LIMIT) {
    return { ok: false, retryAfter: RATE_LIMIT_WINDOW_SEC };
  }

  const { error: insertError } = await client
    .from("api_calls")
    .insert({ user_id: userId, endpoint });

  if (insertError) {
    throw new Error(`rate-limit insert failed: ${insertError.message}`);
  }

  return { ok: true };
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
