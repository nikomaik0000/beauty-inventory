"use client";

import { useState } from "react";
import type { CreditCard, UserSettings } from "@/types";
import cardsData from "@/data/cards.json";
import japanStoresData from "@/data/japan-stores.json";

const allCards = cardsData as CreditCard[];

interface JapanStore {
  id: string;
  name: string;
  nameJa: string;
  category: string;
  emoji: string;
  bestCards: { cardId: string; rate: string; note?: string }[];
}

const japanStores = japanStoresData as JapanStore[];

const STORE_CATEGORIES = [
  { id: "all", label: "全部", emoji: "🗾" },
  { id: "drugstore", label: "藥妝", emoji: "💊" },
  { id: "electronics", label: "電器", emoji: "📱" },
  { id: "fashion", label: "時尚", emoji: "👕" },
  { id: "convenience", label: "超商", emoji: "🏪" },
  { id: "transport", label: "交通", emoji: "🚇" },
  { id: "amusement", label: "樂園", emoji: "🎡" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

interface JapanTabProps {
  settings: UserSettings | null;
}

export function JapanTab({ settings }: JapanTabProps) {
  const [storeCategory, setStoreCategory] = useState("all");
  const [selectedStore, setSelectedStore] = useState<JapanStore | null>(null);
  const [searchStore, setSearchStore] = useState("");

  const ownedCards = settings?.ownedCards ?? [];

  const filteredStores = japanStores.filter((s) => {
    if (storeCategory !== "all" && s.category !== storeCategory) return false;
    if (searchStore && !s.name.includes(searchStore) && !s.nameJa.includes(searchStore)) return false;
    return true;
  });

  const getCardInfo = (cardId: string) => allCards.find((c) => c.id === cardId);

  // Best Japan cards overall
  const japanBestCards = [
    { cardId: "ctbc-uni", rate: "最高11%", store: "統一企業+日韓泰", highlight: true },
    { cardId: "esun-kumamon", rate: "最高8.5%", store: "指定商店", highlight: true },
    { cardId: "jichi-card", rate: "最高8%", store: "ApplePay+指定商店" },
    { cardId: "fubon-dahu-plus", rate: "6%", store: "全通路" },
    { cardId: "fubon-jcb", rate: "5%+", store: "需季度登錄" },
    { cardId: "rakuten", rate: "4%", store: "日韓泰實體" },
    { cardId: "esun-unicard", rate: "4.5%", store: "全通路" },
  ];

  return (
    <div className="scroll-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">🇯🇵</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">日本攻略</h1>
            <p className="text-xs text-gray-400">各店最佳回饋卡推薦</p>
          </div>
        </div>
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="search"
            value={searchStore}
            onChange={(e) => setSearchStore(e.target.value)}
            placeholder="搜尋店家名稱..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {STORE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setStoreCategory(cat.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                storeCategory === cat.id
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">
        {/* Japan Top Cards */}
        {storeCategory === "all" && !searchStore && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-2">🏆 日本回饋總排行</h2>
            <div className="ios-card overflow-hidden">
              {japanBestCards.map((item, i) => {
                const card = getCardInfo(item.cardId);
                if (!card) return null;
                const isOwned = ownedCards.length === 0 || ownedCards.includes(card.id);
                return (
                  <div
                    key={item.cardId}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < japanBestCards.length - 1 ? "border-b border-gray-100" : ""
                    } ${!isOwned && ownedCards.length > 0 ? "opacity-40" : ""}`}
                  >
                    <span className="text-xl w-7 text-center flex-shrink-0">{MEDALS[i] || `${i + 1}`}</span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.bank.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{card.shortName}</p>
                      <p className="text-xs text-gray-400">{item.store}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-red-600">{item.rate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Store List */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-2">🏪 店家最佳卡</h2>
          <div className="space-y-2">
            {filteredStores.map((store) => (
              <div key={store.id} className="ios-card overflow-hidden">
                <button
                  onClick={() => setSelectedStore(selectedStore?.id === store.id ? null : store)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left active-scale"
                >
                  <span className="text-2xl flex-shrink-0">{store.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-400">{store.nameJa}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {(() => {
                      const best = store.bestCards[0];
                      return (
                        <p className="text-sm font-bold text-red-600">{best.rate}</p>
                      );
                    })()}
                    <span className="text-gray-300 text-sm">
                      {selectedStore?.id === store.id ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {selectedStore?.id === store.id && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {store.bestCards.map((rec, i) => {
                      const card = getCardInfo(rec.cardId);
                      if (!card) return null;
                      const isOwned = ownedCards.length === 0 || ownedCards.includes(card.id);
                      return (
                        <div
                          key={rec.cardId}
                          className={`flex items-center gap-3 p-2 rounded-xl ${
                            i === 0 ? "bg-yellow-50" : "bg-gray-50"
                          } ${!isOwned && ownedCards.length > 0 ? "opacity-40" : ""}`}
                        >
                          <span className="text-lg w-6">{MEDALS[i] || ""}</span>
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: card.color }}
                          >
                            {card.bank.slice(0, 2)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{card.shortName}</p>
                            {rec.note && <p className="text-xs text-gray-400">{rec.note}</p>}
                          </div>
                          <span className="text-sm font-bold text-red-600 flex-shrink-0">{rec.rate}</span>
                        </div>
                      );
                    })}

                    {/* Registration reminder */}
                    {store.bestCards.some((rec) => {
                      const c = getCardInfo(rec.cardId);
                      return c?.registrationRequired;
                    }) && (
                      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mt-1">
                        ⚠️ 部分卡片需先登錄才能享有加碼回饋
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Japan Tips */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-2">💡 日本旅遊小技巧</h2>
          <div className="ios-card p-4 space-y-3">
            {[
              { emoji: "💳", tip: "熊本熊卡 在 BicCamera/唐吉軻德/松本清 享 8.5% 回饋（免手續費+指定商店6%）" },
              { emoji: "📱", tip: "中信UNI 每月先登入APP領券，踩點5家統一企業品牌可加碼到11%" },
              { emoji: "🚇", tip: "SUICA/PASMO/ICOCA 儲值用幣倍卡，享旅遊通路4%加碼" },
              { emoji: "⚠️", tip: "吉鶴卡日本最高8%需要實體 Apple Pay 消費，記得先登錄" },
              { emoji: "🏆", tip: "建議同時帶：熊本熊（指定商店8.5%）+ 中信UNI（便利商店+踩點）" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xl flex-shrink-0">{item.emoji}</span>
                <p className="text-xs text-gray-600 leading-relaxed">{item.tip}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
}
