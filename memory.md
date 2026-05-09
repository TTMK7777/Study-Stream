# StudyStream プロジェクト記憶

失敗・教訓・運用上の注意点を蓄積する。

---

## Stack PR の落とし穴（重要）

### 起きたこと
PR #16-#22 を連鎖 PR スタックとして作成し（base が前の feature branch）、`gh pr merge --delete-branch` で順次マージしようとしたら、**2 本目以降が CLOSED 状態に変わってしまった**。

### 原因
GitHub の挙動として、stack PR の base ブランチが削除された時の処理が**不規則**:
- 一部は base を main に自動繰り上げる（PR #17 はこれが起きた）
- 一部は CLOSED にする（PR #18 以降）

GitHub UI で見える「base auto-update」機能は完璧ではない。

### リカバリで採用した方法
新ブランチ + 新規 PR で迂回（force push 不要）:
1. ローカルで `git checkout feat/xxx`
2. `git rebase main`（既に main にある commit は自動 skip）
3. `git checkout -b feat/xxx-v2`
4. `git push -u origin feat/xxx-v2`
5. `gh pr create --base main --head feat/xxx-v2 --title ... --body ...`
6. CI 待ち → `gh pr merge` で squash + delete-branch
7. 古い PR には「PR #YY で取り込み済み」コメント追加

PR 番号は連続せず（#23-#27）になるが、force push 不要で安全。

### 教訓
- **stack PR マージ時は `--delete-branch` を使わない、ブランチは残す**
- すべての PR を main にマージした後でブランチをまとめて削除
- もし CLOSE されたら新ブランチ + 新規 PR で迂回（force push 禁止ルール維持）

---

## zod-to-json-schema は zod v4 と非互換

PR #15 で `zod-to-json-schema@^3.25.2` を入れたが、TypeScript 型エラー発生:
```
Type 'ZodObject<...>' is missing the following properties: _type, _parse, _getType...
```

### 解決
- zod-to-json-schema を uninstall
- zod 4 内蔵の `z.toJSONSchema(schema, { target: "draft-7" })` を使用
- これで Anthropic tool input_schema として渡せる

### 教訓
新しいライブラリでは内蔵機能を先に確認する。zod 4 には `toJSONSchema()` がビルトインで入っている。

---

## Plan モードの制約: 取締役会の外部AI召集不可

PR #16 着手前に取締役会レビューを実施した時、Plan モード中だったため `board_reviewers.py` を Bash で起動できず（Plan モードは Write 制限）。

### 対応
内部 CTO/COO/CEO の三視点インライン審査で代替（`--no-external` 相当）。「社外取締役不在」と明記してプランに記載。

### 教訓
Plan モード中は外部AI召集を使えない。内部レビューで進める前提でプランを設計する。完了後に通常モードで CISO + 取締役会の補強レビューを行う運用が安全。

---

## --delete-branch + 連鎖 PR の組み合わせは危険

上記 Stack PR の落とし穴の根本原因。**この 2 つを組み合わせない**こと。

代替パターン:
1. PR を main 起点に並列にする（依存があっても各 PR を独立に main 起点で作成 → conflict 解決の手間と引き換えに stable）
2. 連鎖 PR にする場合は `--delete-branch` を使わず、最後にブランチ一括削除

---

## Plan の実装プラン path

このプロジェクトの実装プランは `C:\Users\ttsuj\.claude\plans\silly-frolicking-meteor.md` に保存。

Phase 2 着手時に参照する設計判断:
- `lessons_cache.modelVersion + promptVersion`: モデル更新時の自然 cache invalidation
- `studyHistory.subjectId` 非正規化: 弱点分析の集計を高速化
- `src/lib/anthropic/schemas.ts` 集約: 2 次試験用 `EssaySchema` を隣接追加可能
- `Topic.difficulty` を **optional**: 記述式の軸違いに対応

---

## Phase 0 プロトタイプの archive 廃案

CISO レビュー時に「prototype/study-stream.jsx を Sprint 5 で archive へ移動」案があったが、ユーザー意向で**保守継続**:

理由: Claude.ai スマホアプリで Artifact として開けば、手元のスマホで気軽に診断士学習が可能。Phase 1 Web MVP（要ログイン）の前段として活用。

二系統並行運用の保守コストはあるが、Phase 0 は変更頻度が低い（バグ修正ベース）ので許容。

---

## CISO 招待制ベータ判定の根拠

CISO レビューで「招待制ベータ 3-10 名は Approved」と判定された理由:
- Supabase signup を invite-only にすれば、コスト連鎖被害（攻撃者がアカウント作成→/api/lesson 連打）を実質無効化
- 月次クォータ二段ガード（個人 50 + 全体 200）が二重防御として機能
- /api/study-history と /api/highlights のレート制限（PR #27 で追加）で DB 圧迫防止

公開ベータ（signup 開放）以降は CSP 設定 / Sentry 監視 / Anthropic 予算アラート等が追加で必要。
