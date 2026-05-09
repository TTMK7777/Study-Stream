import type { Subject } from "./types";

export const chuusho: Subject = {
  id: "chuusho",
  title: "中小企業経営・中小企業政策",
  examWeight: 100,
  topics: [
    {
      id: "chuusho-definition",
      title: "中小企業の定義（資本金・従業員数）",
      difficulty: 1,
      tags: ["中小企業政策", "基本概念"],
      promptHint:
        "中小企業基本法の業種別定義（製造業/卸売業/小売業/サービス業）、小規模企業者の区分。",
    },
    {
      id: "chuusho-financing",
      title: "中小企業の資金調達と政策金融",
      difficulty: 2,
      tags: ["中小企業政策", "金融"],
      promptHint:
        "日本政策金融公庫、信用保証協会、マル経融資、各支援制度の対象と利点。",
    },
    {
      id: "chuusho-jigyo-shokei",
      title: "事業承継支援（経営承継円滑化法・M&A）",
      difficulty: 2,
      tags: ["中小企業政策", "事業承継"],
      promptHint:
        "経営承継円滑化法（民法特例/金融支援）、事業承継税制、第三者承継（M&A）の選択肢。",
    },
    {
      id: "chuusho-it-support",
      title: "IT 導入補助金と DX 支援策",
      difficulty: 1,
      tags: ["中小企業政策", "IT 化"],
      promptHint:
        "IT 導入補助金、ものづくり補助金、小規模事業者持続化補助金の各対象と要件。",
    },
    {
      id: "chuusho-statistics",
      title: "中小企業白書の要点（直近年度）",
      difficulty: 2,
      tags: ["中小企業経営", "統計"],
      promptHint:
        "事業者数・付加価値額・従業員数の業種別構成、廃業率と開業率、地域経済への寄与。直近2-3年のトレンド。",
    },
  ],
};
