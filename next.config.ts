import type { NextConfig } from "next";

// Content-Security-Policy
// Next.js は inline script/style を多用する（Hydration / styled-jsx）ため
// 'unsafe-inline' を許容。connect-src で Supabase へのアクセスを許可。
// 'unsafe-eval' は dev mode（React Refresh / Fast Refresh）でのみ必要。
// 本番ビルドでは削除し、XSS から任意コード実行への直結経路を遮断する。
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  // クリックジャッキング対策（iframe で読み込ませない）
  { key: "X-Frame-Options", value: "DENY" },
  // MIME 型推測の無効化（IE/旧ブラウザ向け、現代ブラウザでも保険）
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 外部サイトへ URL 全体を漏らさない
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // XSS 多層防御（CSP）
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  // HTTPS 強制（2年、サブドメイン含む、preload 対応）
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // カメラ・マイク・位置情報等の機能を全面禁止
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
