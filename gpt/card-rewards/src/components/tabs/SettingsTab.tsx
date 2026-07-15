"use client";

import { useState } from "react";
import type { CreditCard, UserSettings } from "@/types";
import cardsData from "@/data/cards.json";

const allCards = cardsData as CreditCard[];

// Group cards by bank
const banks = Array.from(new Set(allCards.map((c) => c.bank)));

interface SettingsTabProps {
  settings: UserSettings | null;
  onSettingsChange: (settings: UserSettings) => void;
}

export function SettingsTab({ settings, onSettingsChange }: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<"cards" | "admin" | "about">("cards");
  const [adminCardId, setAdminCardId] = useState<string | null>(null);
  const [editedCard, setEditedCard] = useState<Partial<CreditCard>>({});
  const [savedMsg, setSavedMsg] = useState("");

  const ownedCards = settings?.ownedCards ?? [];

  const toggleCard = (cardId: string) => {
    if (!settings) return;
    const next = ownedCards.includes(cardId)
      ? ownedCards.filter((id) => id !== cardId)
      : [...ownedCards, cardId];
    onSettingsChange({ ...settings, ownedCards: next });
  };

  const selectAll = () => {
    if (!settings) return;
    onSettingsChange({ ...settings, ownedCards: allCards.map((c) => c.id) });
  };

  const clearAll = () => {
    if (!settings) return;
    onSettingsChange({ ...settings, ownedCards: [] });
  };

  const showSaved = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 2000);
  };

  return (
    <div className="scroll-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-30 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">設定</h1>
        <div className="flex gap-2">
          {[
            { id: "cards", label: "我的卡片", emoji: "💳" },
            { id: "admin", label: "資料管理", emoji: "⚙️" },
            { id: "about", label: "關於", emoji: "ℹ️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeSection === tab.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 animate-fade-in">
        {activeSection === "cards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                選擇你持有的卡片，App會優先顯示這些卡
              </p>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-blue-600 font-medium">全選</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAll} className="text-xs text-gray-400 font-medium">清除</button>
              </div>
            </div>

            {banks.map((bank) => {
              const bankCards = allCards.filter((c) => c.bank === bank);
              return (
                <div key={bank}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{bank}</p>
                  <div className="ios-card overflow-hidden">
                    {bankCards.map((card, i) => {
                      const owned = ownedCards.includes(card.id);
                      return (
                        <button
                          key={card.id}
                          onClick={() => toggleCard(card.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left active-scale transition-colors ${
                            i < bankCards.length - 1 ? "border-b border-gray-100" : ""
                          } ${owned ? "bg-blue-50" : "bg-white"}`}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: card.color }}
                          >
                            {card.bank.slice(0, 2)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{card.shortName}</p>
                            <p className="text-xs text-gray-400">{card.card}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            owned ? "bg-blue-600 border-blue-600" : "border-gray-300"
                          }`}>
                            {owned && <span className="text-white text-xs">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-gray-400 text-center">
              已選 {ownedCards.length} 張卡片
              {ownedCards.length === 0 && " — 顯示全部卡片"}
            </p>
          </div>
        )}

        {activeSection === "admin" && (
          <div className="space-y-4">
            <div className="ios-card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 資料管理</h3>
              <p className="text-xs text-gray-500 mb-3">
                所有資料儲存在 LocalStorage，可匯出備份或清除重設。
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const data = {
                      settings: localStorage.getItem("card_rewards_settings"),
                      trackers: localStorage.getItem("card_rewards_trackers"),
                      tasks: localStorage.getItem("card_rewards_tasks"),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `card-rewards-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    showSaved("✅ 備份已下載");
                  }}
                  className="w-full text-sm bg-blue-50 text-blue-700 py-2.5 rounded-xl font-medium active-scale"
                >
                  📤 匯出備份 JSON
                </button>
                <button
                  onClick={() => {
                    if (confirm("確定清除所有任務紀錄和回饋追蹤？（卡片設定保留）")) {
                      localStorage.removeItem("card_rewards_trackers");
                      localStorage.removeItem("card_rewards_tasks");
                      showSaved("✅ 已清除追蹤資料");
                    }
                  }}
                  className="w-full text-sm bg-red-50 text-red-600 py-2.5 rounded-xl font-medium active-scale"
                >
                  🗑️ 清除追蹤資料
                </button>
              </div>
            </div>

            {/* Cards Admin List */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🃏 卡片資料</h3>
              <p className="text-xs text-gray-400 mb-2">
                卡片資料儲存於 <code className="bg-gray-100 px-1 rounded">src/data/cards.json</code>，
                可直接編輯 JSON 新增/修改卡片。
              </p>
              <div className="ios-card overflow-hidden">
                {allCards.map((card, i) => (
                  <div
                    key={card.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < allCards.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.bank.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{card.shortName}</p>
                      <p className="text-xs text-gray-400 truncate">{card.id}</p>
                    </div>
                    <span className="text-xs text-gray-400">{card.expiryDate.slice(0, 7)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                共 {allCards.length} 張卡片
              </p>
            </div>
          </div>
        )}

        {activeSection === "about" && (
          <div className="space-y-4">
            <div className="ios-card p-4 text-center">
              <div className="text-5xl mb-3">💳</div>
              <h2 className="text-lg font-bold text-gray-800">信用卡回饋助手</h2>
              <p className="text-sm text-gray-400 mt-1">個人信用卡管理工具</p>
              <p className="text-xs text-gray-300 mt-2">v1.0.0</p>
            </div>

            <div className="ios-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">🔑 功能說明</h3>
              {[
                "所有資料儲存在本機 LocalStorage，不上傳任何資料",
                "可加入主畫面作為 PWA App 使用",
                "日本模式：切換顯示日本最佳回饋卡",
                "回饋追蹤：記錄每月各卡已獲得的回饋金額",
                "任務提醒：月/季任務勾選完成後自動記錄",
              ].map((item, i) => (
                <p key={i} className="text-xs text-gray-500 flex gap-2">
                  <span className="text-blue-400 flex-shrink-0">•</span>
                  {item}
                </p>
              ))}
            </div>

            <div className="ios-card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 資料更新</h3>
              <p className="text-xs text-gray-500">
                卡片回饋活動資料存於 <code className="bg-gray-100 px-1 rounded">src/data/cards.json</code>，
                任務資料存於 <code className="bg-gray-100 px-1 rounded">src/data/tasks.json</code>。
                活動到期後直接修改 JSON 並重新部署即可更新。
              </p>
            </div>

            <div className="ios-card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">⚠️ 免責聲明</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                本工具僅供個人參考使用，回饋資訊以各銀行官方公告為準。
                請定期確認活動細節，本工具不保證資訊的即時準確性。
              </p>
            </div>
          </div>
        )}

        {savedMsg && (
          <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-gray-800 text-white text-sm text-center py-3 rounded-2xl z-50 shadow-lg">
            {savedMsg}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
