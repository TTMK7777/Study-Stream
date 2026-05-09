import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // クリックジャッキング対策（iframe で読み込ませない）
  { key: "X-Frame-Options", value: "DENY" },
  // MIME 型推測の無効化（IE/旧ブラウザ向け、現代ブラウザでも保険）
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 外部サイトへ URL 全体を漏らさない
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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
