"use client";

import { useState, useEffect } from "react";
import type { CreditCard, UserSettings, TaskRecord } from "@/types";
import {
  getDaysUntilExpiry,
  getExpiryUrgency,
  formatExpiryDate,
  getTaskRecords,
  saveTaskRecords,
  isTaskDoneThisPeriod,
  toggleTaskCompletion,
  getCurrentPeriod,
} from "@/lib/storage";
import cardsData from "@/data/cards.json";
import tasksData from "@/data/tasks.json";

const allCards = cardsData as CreditCard[];

interface Task {
  id: string;
  cardId: string;
  title: string;
  frequency: "monthly" | "quarterly";
  dayOfMonth?: number;
  openTime?: string;
  description: string;
  couponCode?: string;
  registerUrl: string;
}

const allTasks = tasksData as Task[];

interface RemindersTabProps {
  settings: UserSettings | null;
}

export function RemindersTab({ settings }: RemindersTabProps) {
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [activeSection, setActiveSection] = useState<"tasks" | "expiry">("tasks");

  useEffect(() => {
    setTaskRecords(getTaskRecords());
  }, []);

  const ownedCards = settings?.ownedCards ?? [];

  const myTasks = allTasks.filter(
    (t) => ownedCards.length === 0 || ownedCards.includes(t.cardId)
  );

  const monthlyTasks = myTasks.filter((t) => t.frequency === "monthly");
  const quarterlyTasks = myTasks.filter((t) => t.frequency === "quarterly");

  const handleToggle = (task: Task) => {
    const updated = toggleTaskCompletion(task.id, task.frequency, taskRecords);
    setTaskRecords(updated);
    saveTaskRecords(updated);
  };

  const isDone = (task: Task) => isTaskDoneThisPeriod(task.id, task.frequency, taskRecords);

  // Expiry data
  const cardsToShow = ownedCards.length > 0
    ? allCards.filter((c) => ownedCards.includes(c.id))
    : allCards;

  const expiryGroups = {
    critical: cardsToShow.filter((c) => {
      const d = getDaysUntilExpiry(c.expiryDate);
      return d > 0 && d <= 7;
    }),
    warning: cardsToShow.filter((c) => {
      const d = getDaysUntilExpiry(c.expiryDate);
      return d > 7 && d <= 30;
    }),
    notice: cardsToShow.filter((c) => {
      const d = getDaysUntilExpiry(c.expiryDate);
      return d > 30 && d <= 90;
    }),
    ok: cardsToShow.filter((c) => getDaysUntilExpiry(c.expiryDate) > 90),
  };

  const now = new Date();
  const periodLabel = (freq: "monthly" | "quarterly") => {
    const period = getCurrentPeriod(freq);
    if (freq === "monthly") {
      return `${now.getMonth() + 1}月任務`;
    }
    return `${period.replace("-", " ")} 任務`;
  };

  const doneCount = myTasks.filter(isDone).length;
  const totalCount = myTasks.length;

  return (
    <div className="scroll-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-30 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">提醒中心</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection("tasks")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeSection === "tasks" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            ✅ 任務提醒
          </button>
          <button
            onClick={() => setActiveSection("expiry")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeSection === "expiry" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            ⏰ 到期提醒
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">
        {activeSection === "tasks" && (
          <>
            {/* Progress */}
            <div className="ios-card p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">本期任務完成度</span>
                <span className="text-sm font-bold text-blue-600">{doneCount}/{totalCount}</span>
              </div>
              <div className="reward-progress-track">
                <div
                  className="reward-progress-fill"
                  style={{
                    width: `${totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%`,
                    backgroundColor: doneCount === totalCount ? "#16A34A" : "#007AFF",
                  }}
                />
              </div>
              {doneCount === totalCount && totalCount > 0 && (
                <p className="text-center text-xs text-green-600 font-semibold mt-2">🎉 全部完成！</p>
              )}
            </div>

            {/* Monthly Tasks */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-2">
                📅 每月任務 — {periodLabel("monthly")}
              </h2>
              <div className="ios-card overflow-hidden">
                {monthlyTasks.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">沒有每月任務</p>
                )}
                {monthlyTasks.map((task, i) => {
                  const card = allCards.find((c) => c.id === task.cardId);
                  const done = isDone(task);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        i < monthlyTasks.length - 1 ? "border-b border-gray-100" : ""
                      } ${done ? "opacity-60" : ""}`}
                    >
                      <button
                        onClick={() => handleToggle(task)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          done
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {done && <span className="text-xs">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {task.title}
                          </p>
                          {task.dayOfMonth && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                              {task.dayOfMonth}號 {task.openTime || ""}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {card?.bank} · {task.description}
                        </p>
                        {task.couponCode && (
                          <p className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block">
                            🎫 優惠碼：{task.couponCode}
                          </p>
                        )}
                      </div>
                      {task.registerUrl && (
                        <a
                          href={task.registerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg flex-shrink-0 font-medium"
                        >
                          登錄
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quarterly Tasks */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-2">
                📆 每季任務 — {periodLabel("quarterly")}
              </h2>
              <div className="ios-card overflow-hidden">
                {quarterlyTasks.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">沒有每季任務</p>
                )}
                {quarterlyTasks.map((task, i) => {
                  const card = allCards.find((c) => c.id === task.cardId);
                  const done = isDone(task);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        i < quarterlyTasks.length - 1 ? "border-b border-gray-100" : ""
                      } ${done ? "opacity-60" : ""}`}
                    >
                      <button
                        onClick={() => handleToggle(task)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          done
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {done && <span className="text-xs">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {card?.bank} · {task.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeSection === "expiry" && (
          <>
            {expiryGroups.critical.length > 0 && (
              <ExpirySection
                title="🔴 7天內到期"
                cards={expiryGroups.critical}
                colorClass="bg-red-50 border-red-200"
                textClass="text-red-600"
              />
            )}
            {expiryGroups.warning.length > 0 && (
              <ExpirySection
                title="🟡 30天內到期"
                cards={expiryGroups.warning}
                colorClass="bg-amber-50 border-amber-200"
                textClass="text-amber-600"
              />
            )}
            {expiryGroups.notice.length > 0 && (
              <ExpirySection
                title="🟢 90天內到期"
                cards={expiryGroups.notice}
                colorClass="bg-blue-50 border-blue-200"
                textClass="text-blue-600"
              />
            )}
            {expiryGroups.ok.length > 0 && (
              <ExpirySection
                title="✅ 90天以上"
                cards={expiryGroups.ok}
                colorClass="bg-gray-50 border-gray-200"
                textClass="text-gray-500"
              />
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

function ExpirySection({
  title,
  cards,
  colorClass,
  textClass,
}: {
  title: string;
  cards: CreditCard[];
  colorClass: string;
  textClass: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      <div className={`rounded-2xl border overflow-hidden ${colorClass}`}>
        {cards.map((card, i) => {
          const days = getDaysUntilExpiry(card.expiryDate);
          return (
            <div
              key={card.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < cards.length - 1 ? "border-b border-white/50" : ""
              }`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: card.color }}
              >
                {card.bank.slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{card.shortName}</p>
                <p className="text-xs text-gray-400">{formatExpiryDate(card.expiryDate)}</p>
              </div>
              <span className={`text-xs font-bold ${textClass}`}>
                {days > 0 ? `剩 ${days} 天` : "已到期"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
