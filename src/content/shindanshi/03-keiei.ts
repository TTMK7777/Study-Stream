import type { Subject } from "./types";

export const keiei: Subject = {
  id: "keiei",
  title: "企業経営理論",
  examWeight: 100,
  topics: [
    {
      id: "keiei-swot",
      title: "SWOT 分析とクロス SWOT",
      difficulty: 1,
      tags: ["経営戦略", "戦略分析"],
      promptHint:
        "強み/弱み/機会/脅威の整理と、4 象限を掛け合わせた戦略立案（SO/WO/ST/WT）。",
    },
    {
      id: "keiei-5forces",
      title: "ファイブフォース分析",
      difficulty: 2,
      tags: ["経営戦略", "業界分析"],
      promptHint:
        "ポーターの5つの競争要因（業界内競争、新規参入、代替品、買い手、売り手）と業界収益性の関係。",
    },
    {
      id: "keiei-product-life",
      title: "プロダクトライフサイクル",
      difficulty: 1,
      tags: ["マーケティング", "戦略"],
      promptHint:
        "導入期・成長期・成熟期・衰退期それぞれの売上/利益曲線と、適切なマーケティング戦略。",
    },
    {
      id: "keiei-organization",
      title: "組織形態（機能別/事業部制/マトリクス）",
      difficulty: 2,
      tags: ["組織論", "組織設計"],
      promptHint:
        "各組織形態のメリット/デメリット、適用が向く事業環境、ライン&スタッフ概念。",
    },
    {
      id: "keiei-motivation",
      title: "動機づけ理論（マズロー/ハーズバーグ/期待理論）",
      difficulty: 2,
      tags: ["人的資源管理", "動機づけ"],
      promptHint:
        "欲求段階説、衛生要因と動機要因、期待 × 道具性 × 誘意性、それぞれの実務への応用。",
    },
  ],
};
