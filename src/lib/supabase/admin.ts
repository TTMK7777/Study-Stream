import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | undefined;

/**
 * service_role キーで作成する管理用クライアント。
 * RLS をバイパスするため、サーバーサイドのみで使用すること。
 * lessons_cache の書き込み、api_calls の読み書きで利用する。
 */
export function getAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "getAdminClient() はサーバーサイドからのみ呼び出してください。" +
        "service_role キーがブラウザに露出すると RLS がバイパス可能になります。",
    );
  }
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定です。",
    );
  }
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith("NEXT_PUBLIC_") && value === serviceRoleKey) {
      throw new Error(
        `service_role キーが ${name} に設定されています。` +
          "NEXT_PUBLIC_* はクライアントバンドルに含まれるため、即時環境変数から削除してください。",
      );
    }
  }
  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
