import type { Subject } from "./types";

export const keieihoumu: Subject = {
  id: "keieihoumu",
  title: "経営法務",
  examWeight: 100,
  topics: [
    {
      id: "keieihoumu-company-types",
      title: "会社の種類（株式/合同/合名/合資）",
      difficulty: 1,
      tags: ["会社法", "組織形態"],
      promptHint:
        "各会社形態の責任範囲、機関設計、設立コスト、中小企業での選択肢としての合同会社の特徴。",
    },
    {
      id: "keieihoumu-share-issue",
      title: "株式・新株発行と既存株主保護",
      difficulty: 3,
      tags: ["会社法", "資金調達"],
      promptHint:
        "公募/第三者割当/株主割当、有利発行規制、株主総会特別決議、希薄化への対応。",
    },
    {
      id: "keieihoumu-trademark",
      title: "商標権の取得と侵害対応",
      difficulty: 2,
      tags: ["知的財産権", "商標"],
      promptHint:
        "出願→審査→登録のフロー、不使用取消審判、侵害時の差止・損害賠償請求。",
    },
    {
      id: "keieihoumu-patent",
      title: "特許権の要件と職務発明",
      difficulty: 2,
      tags: ["知的財産権", "特許"],
      promptHint:
        "新規性・進歩性・産業上の利用可能性、職務発明の相当の利益、先願主義。",
    },
    {
      id: "keieihoumu-contract",
      title: "契約の成立と契約不適合責任",
      difficulty: 2,
      tags: ["民法", "契約"],
      promptHint:
        "申込み・承諾、書面要件、改正民法の契約不適合責任（旧瑕疵担保責任）の論点。",
    },
  ],
};
