# StudyStream — Claude Code引き継ぎドキュメント

作成日: 2026-05-09  
バージョン: v3  
担当: たいむ（つじラボ）

---

## 1. プロジェクト概要

### アイデアの起点
「YouTubeを見るのと同じ感覚で勉強できるアプリ」という発想から開発。  
受動的・連続的に消費できるYouTubeのUXを学習体験に転用しつつ、**インプット→即テスト**のループで定着率を確保することを目指した。

### コンセプト
- **サービス名:** StudyStream
- **キャッチ:** YouTubeライクなUIで、AIがリアルタイムにレッスンを生成する学習アプリ
- **ターゲットユース:** 中小企業診断士試験対策（財務・経済・中小企業政策）を主軸に、汎用的な自己学習にも対応
- **ブランドカラー:** `#FF8C42`（つじラボのアクセントカラー）
- **テーマ:** ダークモード（YouTube Darkに近い `#0d0d0d` ベース）

---

## 2. 技術スタック

| 要素 | 採用技術 |
|---|---|
| フレームワーク | React（JSX / Hooks） |
| グラフ | recharts（BarChart / Cell / ResponsiveContainer） |
| AI生成 | Anthropic API `/v1/messages` |
| モデル | `claude-sonnet-4-20250514` |
| スタイリング | インラインCSS（Tailwindなし） |
| 状態管理 | useState / useRef / useEffect のみ（外部ライブラリなし） |
| 永続化 | セッション内メモリ（localStorage禁止環境のため） |

---

## 3. 画面構成・UXフロー

```
ホーム（フィード）
 ├─ プリセットトピックカード（8種）
 ├─ カスタム入力欄（任意テキスト→学習）
 └─ キャッシュ済みバッジ表示

     ↓ トピック選択

ローディング画面
 ├─ プログレスバー（0→100%、スムーズアニメーション）
 ├─ レッスン生成状態インジケーター（✓完了 / 生成中...）
 └─ クイズ生成状態インジケーター

     ↓ 生成完了（並列API）

レッスン画面
 ├─ NOW LEARNING ヘッダー（グラジェント）
 ├─ 進捗バー（自動で0→100%へ進む / %表示）
 ├─ セクション×4（テキスト＋ビジュアル）
 │    ├─ 棒グラフ（recharts BarChart）
 │    ├─ 指標カード（metrics）
 │    └─ 比較表（comparison）
 ├─ ハイライト機能（テキスト選択→ポップアップ→保存）
 ├─ キーポイント（進捗80%超で表示）
 └─ クイズ開始ボタン（進捗100%で解放）

     ↓

クイズ画面（4択×3問）
 ├─ 選択肢クリック → 正誤判定（色変化）
 ├─ 解説表示
 └─ 次へ

     ↓

結果画面
 ├─ スコア / % 表示
 └─ 再チャレンジ or ホームへ

ナビゲーションタブ（ヘッダー固定）
 ├─ 🏠 ホーム
 ├─ 📊 履歴（件数バッジ）
 └─ ✏️ HL（ハイライト件数バッジ）
```

---

## 4. AIプロンプト設計

### 4-1. レッスン生成プロンプト（LESSON_SYS）

**方針:** JSON形式を強制。セクション4つ×（テキスト80字＋visualデータ）。前置き・コードブロック禁止を明示。

**レスポンス構造:**
```json
{
  "title": "タイトル",
  "subtitle": "サブタイトル1文",
  "sections": [
    {
      "icon": "絵文字",
      "heading": "見出し",
      "content": "80字程度の解説",
      "visual": {
        "type": "bar | metrics | comparison | null",
        "title": "グラフタイトル（任意）",
        "data": [...],
        "labels": {"left": "A", "right": "B"}
      }
    }
  ],
  "key_points": ["ポイント1", "ポイント2", "ポイント3"]
}
```

**visual.typeごとのdataフォーマット:**

| type | dataフォーマット |
|---|---|
| `bar` | `[{"label":"項目","value":数値0-100,"color":"#hex"}]` 最大5項目 |
| `metrics` | `[{"icon":"絵文字","label":"名称","value":"数値や文字"}]` 最大4項目 |
| `comparison` | `[{"aspect":"観点","left":"内容","right":"内容"}]` 最大4行 |
| `null` | ビジュアルなし |

### 4-2. クイズ生成プロンプト（QUIZ_SYS）

**方針:** JSON配列のみ返却。3問固定。

**レスポンス構造:**
```json
[
  {
    "question": "問題文",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "解説文"
  }
]
```

### 4-3. APIパラメータ

```javascript
model: "claude-sonnet-4-20250514"
max_tokens: 2500  // レッスン生成。1000だと途中切れのバグが発生したため増量
```

---

## 5. 実装の核心ロジック

### 5-1. 並列API呼び出し（生成時間を約半分に）

```javascript
const [lessonRaw, quizRaw] = await Promise.all([
  callClaude(LESSON_SYS, `トピック: ${t.title}`)
    .then(r => { setSteps(s => ({...s, lesson:true})); return r; }),
  callClaude(QUIZ_SYS, `トピック: ${t.title}`)
    .then(r => { setSteps(s => ({...s, quiz:true}));   return r; }),
]);
```

### 5-2. JSONパース（多段階フォールバック）

```javascript
function parseJSON(raw) {
  const s = raw.replace(/```(?:json)?/g, "").trim();
  try { return JSON.parse(s); } catch {}
  const o = s.match(/(\{[\s\S]*\})/); if (o) try { return JSON.parse(o[1]); } catch {}
  const a = s.match(/(\[[\s\S]*\])/); if (a) try { return JSON.parse(a[1]); } catch {}
  throw new Error("JSON parse failed");
}
```

### 5-3. コンテンツキャッシュ

```javascript
// stateとして保持
const [cache, setCache] = useState({}); // { [topicTitle]: { lesson, quiz } }

// 学習開始時にチェック
if (cache[t.title]) {
  setLesson(cache[t.title].lesson);
  setQuiz(cache[t.title].quiz);
  setView("lesson");
  return; // API呼び出しをスキップ
}

// 生成後に保存
setCache(c => ({...c, [t.title]: { lesson: l, quiz: q }}));
```

### 5-4. ハイライト機能（修正済み）

**バグの原因（v2まで）:**
1. `onMouseUp` をdivに付けていたため、選択が複数divにまたがると取りこぼし
2. `position: fixed` のポップアップに `window.scrollY` を加算していたため座標ずれ

**修正方針:**
```javascript
useEffect(() => {
  const onUp = () => {
    setTimeout(() => {  // 選択完了を待つための10ms遅延
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 5) { setPopup(null); return; }

      // refでセクション特定
      let sectionHeading = "レッスン";
      const anchor = sel.anchorNode;
      sectionRefs.current.forEach((ref, i) => {
        if (ref && anchor && ref.contains(anchor)) {
          sectionHeading = lesson.sections?.[i]?.heading || sectionHeading;
        }
      });

      const range = sel.getRangeAt(0).getBoundingClientRect();
      // scrollY を足さない（fixed positioning なので viewport 座標をそのまま使う）
      setPopup({ x: range.left + range.width/2, y: range.top - 8, text, section: sectionHeading });
    }, 10);
  };
  document.addEventListener("mouseup", onUp);
  return () => document.removeEventListener("mouseup", onUp);
}, [lesson]);
```

**ポップアップのポイント:**  
保存ボタンは `onClick` でなく `onMouseDown` を使用。`onClick` だと選択解除が先に走りテキストが消える。

---

## 6. 実装記録（バグ修正履歴）

| バージョン | 問題 | 原因 | 修正 |
|---|---|---|---|
| v1 | 「コンテンツの生成に失敗しました」 | `max_tokens:1000` でJSONが途中切れ→パース失敗 | `max_tokens:2500` に増量 ＋ parseJSONを多段階フォールバック化 |
| v2 | ハイライトが機能しない | divの`onMouseUp`では複数div選択を取りこぼし / fixed positionにscrollYを加算 | `document`レベルのmouseupリスナー ＋ viewport座標に統一 |
| v2 | エラーメッセージが不明瞭 | catch句が汎用メッセージのみ | `e.message` を表示するよう変更 |

---

## 7. コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `StudyStream` | メインApp、state管理、ルーティング |
| `TopicCard` | フィードのトピックカード（キャッシュバッジ付き） |
| `LoadingView` | 並列生成中の進捗表示 |
| `LessonView` | レッスン本体（セクション＋ビジュアル＋ハイライト） |
| `QuizView` | 4択クイズ（正誤判定・解説） |
| `ResultView` | 結果表示 |
| `HistoryView` | 学習履歴一覧 |
| `HighlightsView` | ハイライト一覧（トピック別グループ） |
| `VisualBar` | rechartsの棒グラフ |
| `VisualMetrics` | 指標カードグリッド |
| `VisualComparison` | 2列比較表 |
| `VisualBlock` | type別にVisual系コンポーネントを振り分けるルーター |
| `Bar2` | 汎用プログレスバー |
| `Btn` | 汎用ボタン（primary / ghost / outline） |

---

## 8. 既知の制約・今後の改善候補

### 制約
- **セッション限定:** キャッシュ・履歴・ハイライトはページリロードで消える（Artifact環境でlocalStorage使用不可）
- **ビジュアルの品質:** AIがvisualデータを生成するためトピックによって棒グラフの値が概算になる場合がある

### 改善候補
- `window.storage` API（Artifact永続化）でキャッシュ・履歴・ハイライトを跨ぎセッション保存
- 難易度選択（基礎 / 応用）をプロンプトに組み込む
- 8月試験モード：診断士頻出テーマのみ絞り込み表示
- セクション別進捗ではなく、スクロール位置連動の進捗バーに変更
- 棒グラフ以外のビジュアル追加（折れ線グラフ、フローチャート）
- レッスン内容のPDF/Markdownエクスポート
