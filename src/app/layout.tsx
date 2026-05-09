import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "StudyStream",
  description: "中小企業診断士試験対策を主軸にした、AI 生成レッスン × クイズ学習アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
