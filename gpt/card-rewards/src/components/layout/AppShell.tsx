"use client";

import { useState, useEffect } from "react";
import { HomeTab } from "@/components/tabs/HomeTab";
import { CardsTab } from "@/components/tabs/CardsTab";
import { JapanTab } from "@/components/tabs/JapanTab";
import { RemindersTab } from "@/components/tabs/RemindersTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import type { UserSettings } from "@/types";
import { getUserSettings, saveUserSettings } from "@/lib/storage";

type Tab = "home" | "cards" | "japan" | "reminders" | "settings";

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [japanMode, setJapanMode] = useState(false);

  useEffect(() => {
    const s = getUserSettings();
    setSettings(s);
    setJapanMode(s.japanMode);
  }, []);

  const handleSettingsChange = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveUserSettings(newSettings);
  };

  const toggleJapanMode = () => {
    if (!settings) return;
    const newMode = !japanMode;
    setJapanMode(newMode);
    const updated = { ...settings, japanMode: newMode };
    handleSettingsChange(updated);
    if (newMode) setActiveTab("japan");
  };

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "首頁", icon: "🏠" },
    { id: "cards", label: "卡片", icon: "💳" },
    { id: "japan", label: "日本", icon: "🗾" },
    { id: "reminders", label: "提醒", icon: "🔔" },
    { id: "settings", label: "設定", icon: "⚙️" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Japan Mode Banner */}
      {japanMode && (
        <div className="japan-mode-badge text-white text-center py-1.5 text-xs font-semibold tracking-wider sticky top-0 z-50">
          🇯🇵 日本旅遊模式 ON — 顯示最佳日本回饋卡
        </div>
      )}

      {/* Content */}
      <main className="flex-1 pb-20 overflow-x-hidden">
        {activeTab === "home" && (
          <HomeTab
            settings={settings}
            japanMode={japanMode}
            onToggleJapanMode={toggleJapanMode}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "cards" && (
          <CardsTab settings={settings} japanMode={japanMode} />
        )}
        {activeTab === "japan" && (
          <JapanTab settings={settings} />
        )}
        {activeTab === "reminders" && (
          <RemindersTab settings={settings} />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 max-w-md mx-auto">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all active-scale ${
                activeTab === item.id
                  ? "text-blue-600"
                  : "text-gray-400"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span
                className={`text-xs font-medium ${
                  activeTab === item.id ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
        {/* iPhone safe area */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </nav>
    </div>
  );
}
