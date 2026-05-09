# StudyStream

YouTube ライクな受動視聴 UX に **インプット → 即テスト** ループを組み合わせ、AI がリアルタイムにレッスン+クイズを生成する学習アプリ。

## 現状: Phase 1 Sprint 0 進行中（2026-05-09 着手）

Next.js 16 + Supabase + Drizzle で Web MVP 化中。プラン詳細は `C:\Users\ttsuj\.claude\plans\silly-frolicking-meteor.md` 参照。

### Phase 0（完了）

- claude.ai Artifact 環境で動作する単一 React コンポーネント (`prototype/study-stream.jsx`, 659 行)
- 中小企業診断士試験の一部トピック（財務会計 / 経済学 / 中小企業政策 / IT）8 種をプリセット
- カスタム入力で任意トピックも学習可能
- レッスン4セクション（テキスト + bar/metrics/comparison ビジュアル）→ 4択クイズ3問 → 結果

> **prototype/ はそのままでは公開不可**（API キーがクライアント直叩き、永続化なし）。Phase 1 で Web MVP 化する。詳細は [Issues](https://github.com/TTMK7777/Study-Stream/issues) と [`ROADMAP.md`](ROADMAP.md) 参照。

## 目標

| フェーズ | 期間目安 | 内容 |
|---------|---------|------|
| Phase 0 | 完了 | 単一 JSX プロトタイプ |
| Phase 1 | 4-8 週 | Next.js 16 移行、API プロキシ、Supabase 永続化、診断士1次7科目 |
| Phase 2 | +4-6 週 | 診断士2次対応（事例I-IV、AI採点、模範解答比較） |
| Phase 3 | +将来 | 他資格対応の抽象化、コンテンツプラグイン化 |

## 主軸: 中小企業診断士試験対策

### 1次試験 7 科目
1. 経済学・経済政策
2. 財務・会計
3. 企業経営理論
4. 運営管理
5. 経営法務
6. 経営情報システム
7. 中小企業経営・中小企業政策

### 2次試験
- 事例I（組織・人事）
- 事例II（マーケ・流通）
- 事例III（生産・技術）
- 事例IV（財務・会計）

## 技術スタック（現状）

| 要素 | 採用技術 |
|---|---|
| フレームワーク | React (JSX / Hooks) |
| グラフ | recharts |
| AI 生成 | Anthropic API `/v1/messages` |
| モデル | `claude-sonnet-4-20250514`（要更新 → Issue #5） |
| スタイリング | インライン CSS |
| 状態管理 | useState / useRef / useEffect |
| 永続化 | なし（要対応 → Issue #2） |

## ディレクトリ構成

```
study-stream/
├── README.md
├── ROADMAP.md
├── docs/
│   └── handoff-v3.md      # 実装記録・バグ修正履歴・プロンプト設計
└── prototype/
    └── study-stream.jsx   # claude.ai Artifact 用プロトタイプ
```

Phase 1 で `apps/web/`（Next.js）と `packages/content/`（科目体系・問題定義）に再編予定。

## ローカルで動かす（プロトタイプ）

`prototype/study-stream.jsx` は **claude.ai Artifact 環境専用**。同環境では `fetch("https://api.anthropic.com/v1/messages")` が認証付きで実行できる。

通常の Web 環境で動かすには Phase 1 の API プロキシ実装を待つか、ローカルで Anthropic SDK 経由のサーバを立ててエンドポイントを差し替える。

## ライセンス

未定（private リポ運用中）。
