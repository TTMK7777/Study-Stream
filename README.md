# StudyStream

YouTube ライクな受動視聴 UX に **インプット → 即テスト** ループを組み合わせ、AI がリアルタイムにレッスン+クイズを生成する学習アプリ。

## 現状: Phase 1 Web MVP 完了（2026-05-09）

中小企業診断士1次試験 7 科目に対応した Next.js 16 + Supabase Web アプリ。ログイン → 論点選択 → AI 生成レッスン+クイズ → 履歴保存 → 科目別進捗ダッシュ までが動作。

## 機能一覧

| 機能 | 詳細 |
|---|---|
| **認証** | Supabase Auth Email magic link |
| **論点ツリー** | 7 科目 × 各 5 論点 = 35 件（Sprint 6 で 10-15 件へ拡張予定） |
| **AI 生成** | レッスン 4 セクション（テキスト + bar/metrics/comparison ビジュアル）+ 4択クイズ 3 問、tool_use 強制 + zod 検証 + 1 回 retry |
| **永続化** | `lessons_cache`（横断キャッシュ）/ `study_history` / `highlights` / `api_calls` |
| **ハイライト** | テキスト選択ポップアップ → 一覧 + 削除 |
| **ダッシュボード** | 直近 30 日の科目別進捗 + 直近 7 日 BarChart |
| **二重ガード** | レート制限（60秒） + 月次クォータ（個人 50/全体 200） |

## 技術スタック

| 要素 | 採用技術 |
|---|---|
| フレームワーク | Next.js 16.2.4 (App Router + Turbopack) |
| UI | React 19.2.4 + Tailwind v4 (`@tailwindcss/postcss`) |
| 認証/DB | `@supabase/ssr` 0.10 + `@supabase/supabase-js` 2.104 |
| ORM | drizzle-orm 0.45 + drizzle-kit + `postgres` 3.4（Lazy Proxy） |
| AI | `@anthropic-ai/sdk` 0.95（`claude-sonnet-4-6` デフォルト） |
| グラフ | recharts 3.x |
| バリデーション | zod 4.3（`z.toJSONSchema()` で tool input_schema 生成） |
| テスト | Vitest 4.1（93 ケース全 PASS） |
| ホスティング | Vercel Hobby |

## ディレクトリ構成

```
study-stream/
├── README.md / ROADMAP.md / AGENTS.md
├── docs/
│   └── handoff-v3.md           # Phase 0 の実装記録
├── prototype/
│   └── study-stream.jsx        # claude.ai Artifact 用（保守継続、archive しない）
├── drizzle/
│   ├── 0000_init.sql           # スキーマ migration
│   └── policies/001_rls.sql    # 手書き RLS
├── src/
│   ├── app/
│   │   ├── (login/auth/callback)
│   │   ├── api/                # /api/lesson, /api/study-history, /api/highlights
│   │   ├── lesson/[topicId]/
│   │   ├── history, highlights, dashboard
│   │   ├── error.tsx, not-found.tsx
│   │   ├── layout.tsx, page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── home/subject-accordion
│   │   ├── lesson/{lesson-view,lesson-client,quiz-view,result-view,highlight-popup,visual-*}
│   │   ├── highlights/highlight-list
│   │   └── dashboard/subject-progress
│   ├── content/shindanshi/     # 7 科目論点ツリー（01-keizai〜07-chuusho）
│   ├── db/                     # schema + Lazy Proxy
│   └── lib/
│       ├── anthropic/          # SDK + schemas + prompts + generators
│       ├── supabase/           # client/server/middleware/admin
│       ├── auth.ts, rate-limit.ts
│   └── middleware.ts           # /lesson, /history, /highlights, /dashboard 保護
├── tests/                      # 93 ケース
├── next.config.ts              # セキュリティヘッダ 3 種
└── package.json / tsconfig / vitest.config / drizzle.config
```

## セットアップ

### 1. Supabase プロジェクト作成
- [supabase.com](https://supabase.com/) で新規プロジェクト（region: Northeast Asia / Tokyo 推奨）
- Authentication → Providers → Email 有効、**「Allow new users to sign up」を OFF**（個人運用 / 招待制ベータ向け）
- Settings → API から `URL` と `anon key` / `service_role key` を取得

### 2. 環境変数
`.env.example` をコピーして `.env.local` を作成:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # ← admin client 用、漏洩厳禁
DATABASE_URL=                     # postgres://... Drizzle migrate 用
ANTHROPIC_API_KEY=                # ← 月次予算アラート設定推奨
ANTHROPIC_MODEL=claude-sonnet-4-6
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. DB 初期化
```bash
npm install
npm run db:push                   # drizzle/0000_init.sql 適用
# Supabase SQL Editor で drizzle/policies/001_rls.sql を実行
```

### 4. 起動
```bash
npm run dev                       # localhost:3000
npm run typecheck                 # tsc --noEmit
npm run test                      # vitest run (93 PASS)
npm run build                     # Next.js production build
```

### 5. デプロイ
- Vercel に GitHub 連携 → main を Production、PR を Preview
- Vercel Production / Preview の env vars に上記 5 つを設定（`NEXT_PUBLIC_` プレフィックス以外は暗号化保管）

## セキュリティ

- RLS で user 分離（profiles / study_history / highlights）、`lessons_cache` のみ authenticated 横断 SELECT 可（コスト共有）
- service_role admin client は server-only、ビルド出力 `.next/static/` 漏洩なし確認済
- レート制限: `/api/lesson` 60秒10件 + 月次個人50 + 月次全体200、`/api/study-history` 30/60s、`/api/highlights` POST/DELETE 60/60s
- セキュリティヘッダ: X-Frame-Options DENY / X-Content-Type-Options nosniff / Referrer-Policy strict-origin-when-cross-origin
- open redirect 緩和: `/auth/callback?next=` を `/` 始まりのみ許可（`isSafeNext`）
- 削除の二重防御: DELETE で RLS + `eq("user_id")` を WHERE に追加
- **CISO レビュー判定**: 個人運用 + 招待制ベータ 3-10 名で Approved

## 主軸: 中小企業診断士試験対策

### 1次試験 7 科目（実装済）
1. 経済学・経済政策
2. 財務・会計
3. 企業経営理論
4. 運営管理
5. 経営法務
6. 経営情報システム
7. 中小企業経営・中小企業政策

### 2次試験（Phase 2 で対応）
- 事例I（組織・人事）/ II（マーケ・流通）/ III（生産・技術）/ IV（財務・会計）

## ロードマップ
[`ROADMAP.md`](ROADMAP.md) 参照。

- ✅ **Phase 0**: claude.ai Artifact プロトタイプ
- ✅ **Phase 1**: Next.js + Supabase Web MVP（このリリース）
- 🟡 **Sprint 6**: 論点を各 10-15 件へ拡張、Resend 等メール配信切替検討
- ⏳ **Phase 2**: 2 次試験対応（記述式 + AI 採点）
- ⏳ **Phase 3**: 他資格抽象化（簿記 / FP / 応用情報 / 宅建士 / 社労士）

## ライセンス

[MIT](LICENSE)（private リポ運用中、必要に応じて public 化判断）。

## 参考資料

- 実装プラン: `C:\Users\ttsuj\.claude\plans\silly-frolicking-meteor.md`
- 取締役会レビュー結果: PR #21 / #26
- CISO レビュー結果: PR #22 / #27（HIGH/MEDIUM 全対応）
- Phase 0 実装記録: `docs/handoff-v3.md`
