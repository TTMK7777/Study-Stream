# TODO

## 完了（2026-05-09: Phase 1 Web MVP）

### Sprint 0: Bootstrap
- [x] PR #10: Next.js 16 + Supabase + Drizzle スケルトン

### Sprint 1: 認証 + DB + コンテンツ
- [x] PR #11: Drizzle schema + RLS ポリシー
- [x] PR #12: 7 科目 × 5 論点 = 35 件のコンテンツツリー
- [x] PR #13: Login + magic link callback
- [x] PR #14: ホーム画面アコーディオン

### Sprint 2: AI 連携
- [x] PR #15: Anthropic SDK + tool_use schemas + retry
- [x] PR #16: /api/lesson route + rate-limit + admin client
- [x] PR #17: Lesson UI + /lesson/[topicId] dynamic route

### Sprint 3-5: クイズ・履歴・ハイライト・ダッシュ
- [x] PR #23 (旧#18): Quiz + Result + /api/study-history + /history
- [x] PR #24 (旧#19): Highlight popup + /api/highlights + /highlights
- [x] PR #25 (旧#20): Dashboard + error/not-found + ホームナビ

### 取締役会 + CISO レビュー対応
- [x] PR #26 (旧#21): /auth/callback open redirect 緩和 + 月次クォータ
- [x] PR #27 (旧#22): レート制限拡張 + セキュリティヘッダ

### 集計
- 12 PR マージ完了（#10-#17, #23-#27、リカバリで #18-#22 は CLOSED）
- 93 テスト全 PASS
- 11 ルート（うち API 4 本）

---

## 次にやること（Sprint 6 / 運用設定）

### たいむさん側の運用設定（Phase 1 完了後すぐ）
- [ ] Supabase Dashboard → Auth → Email Provider で「Allow new users to sign up」OFF（invite-only 化）
- [ ] Anthropic Console → Billing → Usage Limits を ¥500/月 等に設定
- [ ] Supabase project 作成 + .env.local 設定（NEXT_PUBLIC_SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY/DATABASE_URL/ANTHROPIC_API_KEY）
- [ ] `npm run db:push` + Supabase SQL Editor で `drizzle/policies/001_rls.sql` 適用
- [ ] Vercel に GitHub 連携 → main を Production 設定
- [ ] 1 週間個人試用 → 致命バグログ収集

### Sprint 6（次フェーズ・3-5日想定）
- [ ] 各科目の論点を 5 → 10-15 件へ拡張（COO 所見 [R] 反映）
- [ ] 試用ログから出たバグを fix
- [ ] (任意) Magic link メール配信を Resend へ切替検討（30/h 上限突破時）

### CISO Low / Future（後送り可）
- [ ] L1: `server-only` パッケージで admin client / anthropic SDK の import を強制
- [ ] L4: quiz score サーバー側再採点（自己改竄防止）
- [ ] L5: error.tsx digest 表示の見直し
- [ ] M1: レート制限の TOCTOU 緩和（PostgreSQL atomic 化）
- [ ] M2: GitHub Dependabot 有効化 + 月次レビュー
- [ ] M4: CSP 設定（公開ベータ前）
- [ ] cleanup cron: lessons_cache / api_calls の 30 日経過削除

### Phase 2（+4-6週、要計画）
- [ ] 2 次試験事例 I-IV 対応
- [ ] AI 採点エンジン（観点比較、A/B/C/D スコア）
- [ ] 過去問データセット（H30-R5 の 24 セット、法務確認後）
- [ ] 答練モード（80 分タイマー）
- [ ] 弱点分析（Issue #7）

### Phase 3（将来）
- [ ] 他資格抽象化（簿記 2級/1級 / FP 1級 / 応用情報 / 宅建士 / 社労士）
- [ ] `src/content/<slug>/` 増設で対応（YAGNI: 汎用 plugin system は作らない）

---

## 凍結 / 廃案

- ❌ Phase 0 プロトタイプの archive 移動（Claude.ai スマホアプリで継続利用するため `prototype/` 保守維持）
- ❌ E2E テスト Playwright（Phase 1 では skip、Phase 2 開始時に検討）
- ❌ monorepo 化 / `packages/content/` 分離（Phase 3 で必要なら）
- ❌ ストリーミング `text/event-stream`（並列生成で十分体感速い）
- ❌ ダークモード切替（デフォルトダーク固定）
- ❌ i18n（日本語固定）
- ❌ PWA / オフライン対応
