import type { Subject } from "./types";

export const zaimu: Subject = {
  id: "zaimu",
  title: "財務・会計",
  examWeight: 100,
  topics: [
    {
      id: "zaimu-bs-pl",
      title: "貸借対照表と損益計算書の構造",
      difficulty: 1,
      tags: ["財務会計", "基本財務諸表"],
      promptHint:
        "BS の資産・負債・純資産の区分、PL の段階利益（売上総利益→経常利益→当期純利益）。両者の連携も触れる。",
    },
    {
      id: "zaimu-roe",
      title: "ROE 分解（デュポン分析）",
      difficulty: 2,
      tags: ["経営分析", "収益性"],
      promptHint:
        "ROE = 売上高利益率 × 総資産回転率 × 財務レバレッジ。各要素の改善施策と限界。",
    },
    {
      id: "zaimu-cashflow",
      title: "キャッシュフロー計算書（営業/投資/財務）",
      difficulty: 2,
      tags: ["財務会計", "CF"],
      promptHint:
        "間接法での営業 CF 算出、投資 CF と財務 CF の典型項目、フリーキャッシュフローの意味。",
    },
    {
      id: "zaimu-cvp",
      title: "CVP 分析と損益分岐点",
      difficulty: 2,
      tags: ["管理会計", "CVP"],
      promptHint:
        "限界利益・損益分岐点売上高・安全余裕率の計算と意思決定への活用。",
    },
    {
      id: "zaimu-npv",
      title: "正味現在価値（NPV）と投資判断",
      difficulty: 3,
      tags: ["ファイナンス", "投資意思決定"],
      promptHint:
        "NPV、IRR、回収期間法の比較。割引率（資本コスト）の意味と WACC への接続。",
    },
  ],
};
