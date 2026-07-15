"use client";

import { useState, useEffect } from "react";
import type { UserSettings, RewardTracker, TaskRecord } from "@/types";
import {
  getDaysUntilExpiry,
  getExpiryUrgency,
  getUserSettings,
  getRewardTrackers,
  getTaskRecords,
  isTaskDoneThisPeriod,
  formatExpiryDate,
} from "@/lib/storage";
import cardsData from "@/data/cards.json";
import tasksData from "@/data/tasks.json";
import type { CreditCard } from "@/types";

const cards = cardsData as CreditCard[];

interface HomeTabProps {
  settings: UserSettings | null;
  japanMode: boolean;
  onToggleJapanMode: () => void;
  onNavigate: (tab: "home" | "cards" | "japan" | "reminders" | "settings") => void;
}

export function HomeTab({ settings, japanMode, onToggleJapanMode, onNavigate }: HomeTabProps) {
  const [trackers, setTrackers] = useState<RewardTracker[]>([]);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);

  useEffect(() => {
    setTrackers(getRewardTrackers());
    setTaskRecords(getTaskRecords());
  }, []);

  const ownedCards = settings?.ownedCards ?? [];
  const myCards = cards.filter((c) => ownedCards.length === 0 || ownedCards.includes(c.id));

  // Expiring soon (within 30 days)
  const expiringCards = myCards
    .map((c) => ({ card: c, days: getDaysUntilExpiry(c.expiryDate) }))
    .filter((x) => x.days <= 30 && x.days > 0)
    .sort((a, b) => a.days - b.days);

  // Pending monthly tasks
  const pendingTasks = tasksData.filter((task) => {
    const isOwned = ownedCards.length === 0 || ownedCards.includes(task.cardId);
    const isDone = isTaskDoneThisPeriod(task.id, task.frequency as "monthly" | "quarterly", taskRecords);
    return isOwned && !isDone;
  });

  // Active trackers
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeTrackers = trackers.filter((t) => t.month === monthKey && t.earned > 0);

  const urgencyColors: Record<string, string> = {
    critical: "text-red-600 bg-red-50",
    warning: "text-amber-600 bg-amber-50",
    notice: "text-blue-600 bg-blue-50",
    ok: "text-green-600 bg-green-50",
  };

  // Today's date
  const today = now.getDate();
  const isStarbucksDay = today === 1;

  return (
    <div className="scroll-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">卡回饋助手</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {now.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" })}
            </p>
          </div>
          {/* Japan Mode Toggle */}
          <button
            onClick={onToggleJapanMode}
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold transition-all active-scale ${
              japanMode
                ? "bg-red-600 text-white shadow-md"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            🗾 {japanMode ? "日本模式 ON" : "我在日本"}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">
        {/* Today's Highlights */}
        {(isStarbucksDay || pendingTasks.length > 0) && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-2">📌 今日重點</h2>
            <div className="ios-card p-3 space-y-2">
              {isStarbucksDay && (
                <div className="flex items-center gap-3 p-2 bg-green-50 rounded-xl">
                  <span className="text-2xl">☕</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800">星巴克活動登錄開放！</p>
                    <p className="text-xs text-green-600">今天 10:30 開放登入，快去登錄！</p>
                  </div>
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">今天</span>
                </div>
              )}
              {pendingTasks.slice(0, 3).map((task) => {
                const card = cards.find((c) => c.id === task.cardId);
                return (
                  <div key={task.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-xl">
                    <span className="text-2xl">📋</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800">{task.title}</p>
                      <p className="text-xs text-blue-600">{card?.bank} · {task.frequency === "monthly" ? "每月任務" : "每季任務"}</p>
                    </div>
                    <button
                      onClick={() => onNavigate("reminders")}
                      className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full"
                    >
                      去做
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Expiring Soon */}
        {expiringCards.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-2">⚠️ 即將到期</h2>
            <div className="ios-card overflow-hidden">
              {expiringCards.map(({ card, days }, i) => {
                const urgency = getExpiryUrgency(days);
                const colorClass = urgencyColors[urgency] || urgencyColors.notice;
                return (
                  <div
                    key={card.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < expiringCards.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: card.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {card.bank} {card.shortName}
                      </p>
                      <p className="text-xs text-gray-500">{formatExpiryDate(card.expiryDate)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${colorClass}`}>
                      剩{days}天
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Reward Progress Summary */}
        {activeTrackers.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-2">💰 本月回饋進度</h2>
            <div className="ios-card p-4 space-y-3">
              {activeTrackers.map((tracker) => {
                const card = cards.find((c) => c.id === tracker.cardId);
                if (!card) return null;
                const pct = Math.min(100, Math.round((tracker.earned / tracker.cap) * 100));
                return (
                  <div key={tracker.cardId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {card.bank} {card.shortName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {tracker.earned} / {tracker.cap} 元
                      </span>
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
                    <p className="text-right text-xs text-gray-400 mt-0.5">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-2">⚡ 快速查詢</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "日本最佳卡", emoji: "🗾", action: () => onNavigate("japan") },
              { label: "查詢回饋", emoji: "🔍", action: () => onNavigate("cards") },
              { label: "任務提醒", emoji: "✅", action: () => onNavigate("reminders") },
              { label: "額度追蹤", emoji: "📊", action: () => onNavigate("cards") },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="ios-card p-4 flex items-center gap-3 active-scale text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-sm font-semibold text-gray-700">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* All Cards Overview */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-700">🃏 我的卡片</h2>
            <button
              onClick={() => onNavigate("cards")}
              className="text-blue-600 text-sm font-medium"
            >
              全部 →
            </button>
          </div>
          <div className="space-y-2">
            {myCards.slice(0, 4).map((card) => {
              const days = getDaysUntilExpiry(card.expiryDate);
              const urgency = getExpiryUrgency(days);
              return (
                <div key={card.id} className="ios-card px-4 py-3 flex items-center gap-3 active-scale">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: card.color }}
                  >
                    {card.bank.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {card.bank} {card.shortName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {card.rewards.domestic && `國內${card.rewards.domestic}`}
                      {card.rewards.overseas && ` · 國外${card.rewards.overseas}`}
                      {card.rewards.japan && ` · 日本${card.rewards.japan}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-medium ${
                      urgency === "critical" ? "text-red-500" :
                      urgency === "warning" ? "text-amber-500" : "text-gray-400"
                    }`}>
                      {days <= 30 ? `剩${days}天` : formatExpiryDate(card.expiryDate).slice(5)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
}
