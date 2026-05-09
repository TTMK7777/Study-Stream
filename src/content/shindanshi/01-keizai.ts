import type { Subject } from "./types";

export const keizai: Subject = {
  id: "keizai",
  title: "経済学・経済政策",
  examWeight: 100,
  topics: [
    {
      id: "keizai-supply-demand",
      title: "需要と供給・市場均衡",
      difficulty: 1,
      tags: ["ミクロ", "市場理論"],
      promptHint:
        "需要曲線・供給曲線のシフト要因と均衡価格・均衡数量の決定。価格弾力性の概念にも触れること。",
    },
    {
      id: "keizai-elasticity",
      title: "需要の価格弾力性・所得弾力性",
      difficulty: 2,
      tags: ["ミクロ", "弾力性"],
      promptHint:
        "弾力性の定義、計算方法、必需品/奢侈品の区別、企業の価格戦略への応用。",
    },
    {
      id: "keizai-gdp",
      title: "GDP と国民経済計算",
      difficulty: 1,
      tags: ["マクロ", "国民経済計算"],
      promptHint:
        "名目 GDP と実質 GDP、三面等価、GDP デフレーター、GDP に含まれる/含まれないものの区別。",
    },
    {
      id: "keizai-is-lm",
      title: "IS-LM 分析と財政・金融政策",
      difficulty: 3,
      tags: ["マクロ", "IS-LM"],
      promptHint:
        "IS 曲線・LM 曲線の導出、財政政策・金融政策の効果、クラウディングアウト、流動性の罠。",
    },
    {
      id: "keizai-trade",
      title: "国際貿易と為替レート",
      difficulty: 2,
      tags: ["マクロ", "国際経済"],
      promptHint:
        "比較優位、為替レートの決定要因（購買力平価・金利平価）、円高/円安が輸出入に与える影響。",
    },
  ],
};
