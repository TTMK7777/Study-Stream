import type { Subject } from "./types";

export const jouhou: Subject = {
  id: "jouhou",
  title: "経営情報システム",
  examWeight: 100,
  topics: [
    {
      id: "jouhou-rdb",
      title: "リレーショナル DB と正規化",
      difficulty: 2,
      tags: ["データベース", "正規化"],
      promptHint:
        "1NF/2NF/3NF の判定、主キー/外部キー、結合（INNER/LEFT）、トランザクションの ACID。",
    },
    {
      id: "jouhou-network",
      title: "ネットワーク基礎（OSI/TCP-IP）",
      difficulty: 2,
      tags: ["ネットワーク", "プロトコル"],
      promptHint:
        "OSI 7 階層と TCP/IP 4 階層の対応、IP/TCP/HTTP の役割、LAN/WAN の概念。",
    },
    {
      id: "jouhou-security",
      title: "情報セキュリティ（CIA/暗号/認証）",
      difficulty: 2,
      tags: ["セキュリティ"],
      promptHint:
        "機密性・完全性・可用性、共通鍵/公開鍵暗号、PKI、二要素認証、ゼロトラスト概念。",
    },
    {
      id: "jouhou-system-dev",
      title: "システム開発手法（ウォーターフォール/アジャイル）",
      difficulty: 2,
      tags: ["システム開発"],
      promptHint:
        "ウォーターフォールの V 字モデル、アジャイル/スクラム、DevOps、適用が向くプロジェクト特性。",
    },
    {
      id: "jouhou-cloud",
      title: "クラウドサービスモデル（IaaS/PaaS/SaaS）",
      difficulty: 1,
      tags: ["クラウド"],
      promptHint:
        "各モデルの責任分界、パブリック/プライベート/ハイブリッドクラウド、中小企業のクラウド活用シナリオ。",
    },
  ],
};
