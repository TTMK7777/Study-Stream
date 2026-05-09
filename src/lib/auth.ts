import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * 認証必須ページ・Server Action から呼ぶヘルパ。
 * 未ログインの場合 /login へ redirect する。
 */
export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return user.id;
}
