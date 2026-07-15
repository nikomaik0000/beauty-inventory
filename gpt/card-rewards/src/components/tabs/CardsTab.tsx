"use client";

import { useState, useEffect, useRef } from "react";
import type { CreditCard, UserSettings, RewardTracker, SearchCategory } from "@/types";
import {
  getDaysUntilExpiry,
  getExpiryUrgency,
  formatExpiryDate,
  getRewardTrackers,
  saveRewardTrackers,
  getCurrentMonthKey,
} from "@/lib/storage";
import cardsData from "@/data/cards.json";

const allCards = cardsData as CreditCard[];

const CATEGORIES: { id: SearchCategory; label: string; emoji: string }[] = [
  { id: "all", label: "全部", emoji: "🃏" },
  { id: "japan", label: "日本", emoji: "🗾" },
  { id: "domestic", label: "國內", emoji: "🏠" },
  { id: "overseas", label: "海外", emoji: "✈️" },
  { id: "dining", label: "餐飲", emoji: "🍜" },
  { id: "department", label: "百貨", emoji: "🏬" },
  { id: "ecommerce", label: "網購", emoji: "🛒" },
  { id: "travel", label: "旅遊", emoji: "🧳" },
  { id: "convenience", label: "超商", emoji: "🏪" },
];

interface CardsTabProps {
  settings: UserSettings | null;
  japanMode: boolean;
}

export function CardsTab({ settings, japanMode }: CardsTabProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SearchCategory>(japanMode ? "japan" : "all");
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [trackers, setTrackers] = useState<RewardTracker[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [editingTracker, setEditingTracker] = useState<string | null>(null);
  const [trackerInput, setTrackerInput] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTrackers(getRewardTrackers());
  }, []);

  useEffect(() => {
    if (japanMode) setCategory("japan");
  }, [japanMode]);

  const ownedCards = settings?.ownedCards ?? [];

  const filtered = allCards.filter((card) => {
    if (showOwnedOnly && ownedCards.length > 0 && !ownedCards.includes(card.id)) return false;
    if (category !== "all" && !card.categories.includes(category)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        card.bank.includes(q) ||
        card.card.includes(q) ||
        card.shortName.includes(q) ||
        card.tags.some((t) => t.includes(q)) ||
        card.notes.includes(q)
      );
    }
    return true;
  });

  const getTracker = (cardId: string) => {
    const month = getCurrentMonthKey();
    return trackers.find((t) => t.cardId === cardId && t.month === month);
  };

  const updateTracker = (cardId: string, earned: number, cap: number) => {
    const month = getCurrentMonthKey();
    const updated = trackers.filter((t) => !(t.cardId === cardId && t.month === month));
    updated.push({ cardId, month, earned, cap, entries: [] });
    setTrackers(updated);
    saveRewardTrackers(updated);
  };

  const urgencyColor = (days: number) => {
    const u = getExpiryUrgency(days);
    if (u === "critical") return "text-red-500 bg-red-50";
    if (u === "warning") return "text-amber-500 bg-amber-50";
    return "text-gray-400 bg-gray-50";
  };

  return (
    <div className="scroll-container">
      {/* Header + Search */}
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">信用卡</h1>
          <button
            onClick={() => setShowOwnedOnly(!showOwnedOnly)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              showOwnedOnly ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {showOwnedOnly ? "✓ 我的卡" : "我的卡"}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋銀行、卡片、通路..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                category === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-3 space-y-3 animate-fade-in">
        <p className="text-xs text-gray-400 font-medium">找到 {filtered.length} 張卡片</p>

        {filtered.map((card) => {
          const days = getDaysUntilExpiry(card.expiryDate);
          const tracker = getTracker(card.id);
          const pct = tracker ? Math.min(100, Math.round((tracker.earned / tracker.cap) * 100)) : 0;
          const isExpanded = expandedCard === card.id;
          const isEditing = editingTracker === card.id;

          return (
            <div key={card.id} className="ios-card overflow-hidden">
              {/* Card Header */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left active-scale"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: card.color }}
                >
                  {card.bank.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{card.shortName}</p>
                    <p className="text-xs text-gray-400">{card.bank}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {card.rewards.japan && (
                      <span className="tag-pill bg-red-50 text-red-700">🗾 {card.rewards.japan}</span>
                    )}
                    {card.rewards.domestic && (
                      <span className="tag-pill bg-blue-50 text-blue-700">國內 {card.rewards.domestic}</span>
                    )}
                    {card.rewards.overseas && (
                      <span className="tag-pill bg-green-50 text-green-700">海外 {card.rewards.overseas}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColor(days)}`}>
                    {days <= 30 ? `剩${days}天` : formatExpiryDate(card.expiryDate).slice(0, 7)}
                  </span>
                  <span className="text-gray-300 text-sm">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Reward Tracker Bar */}
              {tracker && (
                <div className="px-4 pb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>本月回饋</span>
                    <span>{tracker.earned} / {tracker.cap} 元 ({pct}%)</span>
                  </div>
                  <div className="reward-progress-track">
                    <div
                      className="reward-progress-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 100 ? "#16A34A" : card.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Notes */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500 leading-relaxed">{card.notes}</p>
                    {card.requirements && (
                      <div className="mt-2">
                        {card.requirements.map((req, i) => (
                          <p key={i} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg mt-1">
                            ⚠️ {req}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reward Tracker Input */}
                  <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">📊 回饋額度追蹤（本月）</p>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={trackerInput}
                          onChange={(e) => setTrackerInput(e.target.value)}
                          placeholder="已獲得回饋金額"
                          className="flex-1 text-sm px-3 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            const earned = parseFloat(trackerInput) || 0;
                            const cap = card.cap || 500;
                            updateTracker(card.id, earned, cap);
                            setEditingTracker(null);
                            setTrackerInput("");
                          }}
                          className="bg-blue-600 text-white text-sm px-3 py-2 rounded-xl font-medium"
                        >
                          儲存
                        </button>
                        <button
                          onClick={() => { setEditingTracker(null); setTrackerInput(""); }}
                          className="bg-gray-200 text-gray-600 text-sm px-3 py-2 rounded-xl"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {tracker ? (
                          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-500">已獲得</span>
                              <span className="text-xs font-bold" style={{ color: card.color }}>
                                {tracker.earned} 元
                              </span>
                            </div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-xs text-gray-500">剩餘額度</span>
                              <span className="text-xs text-green-600 font-bold">
                                {Math.max(0, tracker.cap - tracker.earned)} 元
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="flex-1 text-xs text-gray-400">
                            上限 {card.cap ? `${card.cap} 元` : "無上限"}
                          </p>
                        )}
                        <button
                          onClick={() => {
                            setEditingTracker(card.id);
                            setTrackerInput(tracker ? String(tracker.earned) : "");
                          }}
                          className="text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-xl font-medium"
                        >
                          {tracker ? "更新" : "記錄"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Links */}
                  {(card.links.activity || card.links.register || card.links.official) && (
                    <div className="px-4 pb-3 flex gap-2 flex-wrap border-t border-gray-100 pt-3">
                      {card.links.official && (
                        <a
                          href={card.links.official}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
                        >
                          🏦 官網
                        </a>
                      )}
                      {card.links.activity && (
                        <a
                          href={card.links.activity}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium"
                        >
                          🎯 活動頁
                        </a>
                      )}
                      {card.links.register && (
                        <a
                          href={card.links.register}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg font-medium"
                        >
                          ✅ 登錄頁
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm">找不到符合條件的卡片</p>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
