import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * `next` クエリ値を内部パスのみに制限する（open redirect 緩和）。
 * 許可: "/", "/path", "/path?q=v", "/path#frag"
 * 拒否: 絶対 URL ("https://evil.com")、プロトコル相対 ("//evil.com")、
 *       バックスラッシュ ("/\\evil.com" — 一部ブラウザで解釈差あり)
 */
export function isSafeNext(value: string | null): string {
  if (!value) return "/";
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  ) {
    return value;
  }
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = isSafeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
