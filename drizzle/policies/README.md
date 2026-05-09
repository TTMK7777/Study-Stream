# RLS ポリシー適用手順

Drizzle は Row Level Security を自動生成しないため、`drizzle-kit migrate` 後に Supabase SQL Editor で手動適用する。

## 手順

1. `drizzle-kit migrate`（または `db:push`）でテーブルを作成
2. Supabase Dashboard → SQL Editor を開く
3. `001_rls.sql` の内容を貼り付けて実行
4. Authentication → Policies で各テーブルにポリシーが付与されたことを確認

## 設計方針

| テーブル | 公開範囲 | 理由 |
|---|---|---|
| `profiles` | 自分の行のみ | 個人情報 |
| `lessons_cache` | authenticated 全員 SELECT 可、書込は service_role のみ | 試験論点解説で個人情報なし。Anthropic コスト共有のためユーザー横断キャッシュ |
| `study_history` | 自分の行のみ | 個人の学習進捗 |
| `highlights` | 自分の行のみ | 個人のメモ |
| `api_calls` | authenticated は完全 deny、service_role のみ | レート制限の実装詳細をクライアントに露出しない |

## 検証

適用後、Supabase SQL Editor で別ユーザーの JWT を `set request.jwt.claims` してから他人の行が見えないことを確認すること。
