import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminClient } from "./supabase/admin";

export const LESSON_RATE_LIMIT = 10;
export const RATE_LIMIT_WINDOW_SEC = 60;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

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
