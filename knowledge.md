# StudyStream 技術知見

Phase 1 構築で確定した技術判断・検証結果・知見。

---

## Anthropic SDK + tool_use 構造化出力

### 採用構成
- `@anthropic-ai/sdk@^0.95.1`
- `tool_choice: { type: "tool", name: "submit_lesson" }` で tool_use 強制
- `system: [{ type:"text", text: LESSON_SYS, cache_control: { type:"ephemeral" } }]` で prompt caching
- 出力は zod で検証、失敗時は **1 回だけ retry**（CTO [I] 反映、retry 時に前回エラー要約を user message に注入）

### zod-to-json-schema は不採用
zod v4 と型非互換 → zod 4 内蔵の `z.toJSONSchema(schema, { target: "draft-7" })` を使用。`@anthropic-ai/sdk` の Tool 型に `as unknown as Anthropic.Messages.Tool` でキャストして渡す。

### prompt caching の発動条件
system プロンプトを 1024 token 以上に padding する必要あり。LESSON_SYS / QUIZ_SYS は意図的に詳細化（試験用語ルール、文体規定、避けるべき表現等）して条件を満たす。

### retry の効果
zod 検証失敗時の retry は実用的な信頼性を持つ。ループはしない（最大2回呼び出し）ためコスト爆破リスクなし。

---

## Supabase + Drizzle 設計

### Lazy Proxy パターン
`src/db/index.ts` で `Proxy` を使い、`process.env.DATABASE_URL` を **メソッド呼び出し時にのみ評価**。env 未設定でも import 段階で落ちないため CI でビルド可能。book-recording パターン全文流用。

### service_role admin client の運用ルール
RLS をバイパスするため、必ず以下のルールで使う:
1. **server-only に閉じる**: import するファイルは server pages / API routes のみ
2. **必ず `eq("user_id", user.id)` で WHERE 絞り込み**: 暗黙の規約、将来コード変更時に漏れ事故注意（CISO H2）
3. **削除は二重防御**: DELETE で RLS に頼らず `eq("user_id")` も WHERE に追加

### RLS ポリシー方針
- `profiles` / `study_history` / `highlights`: 自分の行のみ
- `lessons_cache`: authenticated 全員 SELECT 可（個人情報なし、Anthropic コスト共有）
- `api_calls`: authenticated 完全 deny、service_role のみ（レート制限の実装詳細を露出しない）

### 非正規化の使い所
`study_history.subject_id` を非正規化保持 → 弱点分析（Phase 2 想定）の `GROUP BY subject_id` 集計が高速。`getTopicById()` でサーバー側解決して INSERT、クライアントから受け取らず改竄防止。

---

## レート制限と月次クォータ

### 三段防御
1. **分次レート制限** (`checkAndRecord`): 過去 60 秒の `api_calls` count + INSERT
   - `ENDPOINT_LIMITS` マップで endpoint ごとに上限切替（lesson 10 / study-history 30 / highlights 60）
2. **月次個人クォータ** (`checkMonthlyQuota`): 30 日 rolling、ユーザーごと 50 件
3. **月次全体予算**: 同 200 件で全体上限

### キャッシュヒットはカウントしない
`/api/lesson` は cache hit 時 INSERT しない → コストゼロのリクエストはレート制限対象外。

### TOCTOU は許容
count → INSERT の 2 ステップで race condition あり。並列攻撃で 1-2 件超過する可能性は許容（個人運用、月次クォータが二段防御）。

### 順序
```
auth → cache lookup → cache hit return →
monthly quota → minute rate-limit → generate → INSERT
```

---

## Next.js 16 移行ノウハウ

### `Response.json()` を使う
`NextResponse.json()` ではなく `Response.json(...)` を使うのが Next.js 16 推奨。AGENTS.md にも明記。`NextResponse.redirect()` は redirect 用に残す。

### middleware → proxy リネーム警告
ビルド時に `The "middleware" file convention is deprecated. Please use "proxy" instead.` の警告。Phase 1 では未対応、Sprint 6 以降で対応検討。

### server component で env Lazy 評価
admin client / anthropic client は **モジュール読み込み時ではなくメソッド呼び出し時** に env を評価。CI で env なしビルドが通る重要パターン。

### dynamic route の `params` は Promise
Next.js 16 では `params: Promise<{ topicId: string }>` で `await params` する必要あり。

### `data-section-heading` でクライアント逆引き
Highlight popup で `range.startContainer.parentElement.closest("[data-section-heading]")` で論点位置を逆引き。サーバー render の static markup から client mouseup で情報取得する基本パターン。

---

## セキュリティ強化

### `isSafeNext` で open redirect 緩和
`/auth/callback?next=<path>` の値検証:
- ✅ `/` 始まり、`/path?q=v`, `/path#frag`
- ❌ `https://evil.com`（絶対URL）/ `//evil.com`（プロトコル相対）/ `/\\evil.com`（バックスラッシュ）/ `javascript:alert(1)`
- 不正値は silently `/` にフォールバック

### セキュリティヘッダ 3 種
`next.config.ts` の `headers()` で全パスに:
- `X-Frame-Options: DENY` (クリックジャッキング)
- `X-Content-Type-Options: nosniff` (MIME 推測無効化)
- `Referrer-Policy: strict-origin-when-cross-origin` (URL 漏洩抑制)

### API キー漏洩チェック
ビルド後に `grep -r "sk-ant" .next/static/` でヒットゼロを確認。CI に組み込めば理想的（未対応）。

---

## コスト試算

### Anthropic Sonnet 4.6 単価（¥150/$ 換算）
- 1 lesson + quiz 生成: 入力 2k + 出力 1.5k tokens ≈ **¥4-5**
- prompt caching 50% hit 想定: 平均 **¥2-3**
- cache hit 時: **¥0**

### 個人運用 1 人 / 月 60-90 論点学習想定
- 初月（cache miss 中心）: ¥150-400/月
- 2 ヶ月目以降（復習中心）: ¥50-150/月
- 7 科目フル学習完了後: ほぼ ¥0

### 想定インフラコスト
- Supabase Free: ¥0
- Vercel Hobby: ¥0
- Anthropic: ¥200 前後/月

---

## テスト戦略

### モック方針
- Supabase server client / admin client / Anthropic SDK は **`vi.mock` でモック**、API route handler を直接 `POST(request)` で叩く
- Drizzle / postgres は不使用（admin client の builder pattern を直接モック）
- 実 DB 接続は **integration test なし**、本人 1 週間使用で代替（Phase 2 開始時に Playwright 検討）

### モック builder pattern
Supabase client の `from(table).select().eq().maybeSingle()` 等のチェインは、すべて同じ builder オブジェクトを返す方式でモック化。method 数が少ないので実用的。

### カバレッジ
93 ケース全 PASS。targeted coverage 80%（book-recording 同等）。

---

## YAGNI 排除リスト（Phase 1 で意図的にやらなかったこと）

- monorepo 化 / `packages/content/` 分離
- 汎用 `Qualification` interface / plugin system
- ストリーミング `text/event-stream`
- E2E テスト
- 過去問データベース
- ダークモード切替（ダーク固定）
- i18n
- PWA / オフライン対応
- 履歴/ハイライトのページネーション（100/200 件上限固定）

これらは Phase 2-3 で必要時に再評価。
