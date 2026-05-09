import type { Subject } from "./types";

export const unei: Subject = {
  id: "unei",
  title: "運営管理",
  examWeight: 100,
  topics: [
    {
      id: "unei-production-form",
      title: "生産形態（受注/見込・個別/連続）",
      difficulty: 1,
      tags: ["生産管理", "生産形態"],
      promptHint:
        "受注生産 vs 見込生産、個別/ロット/連続生産の区分、それぞれが向く製品特性と在庫戦略。",
    },
    {
      id: "unei-jit",
      title: "JIT・かんばん方式",
      difficulty: 2,
      tags: ["生産管理", "トヨタ生産方式"],
      promptHint:
        "ジャストインタイムの理念、かんばんによるプル型生産、平準化と1個流しの位置づけ。",
    },
    {
      id: "unei-inventory",
      title: "在庫管理（ABC 分析・経済発注量）",
      difficulty: 2,
      tags: ["在庫管理", "発注方式"],
      promptHint:
        "ABC 分析、定量発注法 vs 定期発注法、経済発注量（EOQ）の前提と算式の意味。",
    },
    {
      id: "unei-store-layout",
      title: "店舗レイアウトと動線設計",
      difficulty: 1,
      tags: ["店舗・販売管理"],
      promptHint:
        "ワンウェイコントロール、ゴンドラ配置、客動線/従業員動線、視認性・回遊性の最大化。",
    },
    {
      id: "unei-pos",
      title: "POS システムと販売データ活用",
      difficulty: 2,
      tags: ["店舗・販売管理", "情報活用"],
      promptHint:
        "POS の単品管理、ID-POS によるバスケット分析、死に筋商品排除と商品開発への接続。",
    },
  ],
};
