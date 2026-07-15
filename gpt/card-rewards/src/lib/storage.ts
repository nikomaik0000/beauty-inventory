import type { UserSettings, RewardTracker, TaskRecord } from "@/types";

export const STORAGE_KEYS = {
  USER_SETTINGS: "card_rewards_settings",
  REWARD_TRACKERS: "card_rewards_trackers",
  TASK_RECORDS: "card_rewards_tasks",
  JAPAN_MODE: "card_rewards_japan_mode",
};

export function getDefaultSettings(): UserSettings {
  return {
    ownedCards: [],
    japanMode: false,
    notificationsEnabled: false,
    myStoreMapping: [],
  };
}

export function getUserSettings(): UserSettings {
  if (typeof window === "undefined") return getDefaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    return raw ? { ...getDefaultSettings(), ...JSON.parse(raw) } : getDefaultSettings();
  } catch {
    return getDefaultSettings();
  }
}

export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
}

export function getRewardTrackers(): RewardTracker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REWARD_TRACKERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRewardTrackers(trackers: RewardTracker[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.REWARD_TRACKERS, JSON.stringify(trackers));
}

export function getTaskRecords(): TaskRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASK_RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTaskRecords(records: TaskRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.TASK_RECORDS, JSON.stringify(records));
}

export function getCurrentPeriod(frequency: "monthly" | "quarterly"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (frequency === "monthly") {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getExpiryUrgency(days: number): "expired" | "critical" | "warning" | "notice" | "ok" {
  if (days <= 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  if (days <= 90) return "notice";
  return "ok";
}

export function formatExpiryDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getRewardTracker(cardId: string, trackers: RewardTracker[]): RewardTracker | undefined {
  const monthKey = getCurrentMonthKey();
  return trackers.find((t) => t.cardId === cardId && t.month === monthKey);
}

export function upsertRewardTracker(
  cardId: string,
  cap: number,
  earned: number,
  trackers: RewardTracker[]
): RewardTracker[] {
  const monthKey = getCurrentMonthKey();
  const existing = trackers.find((t) => t.cardId === cardId && t.month === monthKey);
  if (existing) {
    return trackers.map((t) =>
      t.cardId === cardId && t.month === monthKey ? { ...t, earned } : t
    );
  }
  return [...trackers, { cardId, month: monthKey, earned, cap, entries: [] }];
}

export function isTaskDoneThisPeriod(taskId: string, frequency: "monthly" | "quarterly", records: TaskRecord[]): boolean {
  const period = getCurrentPeriod(frequency);
  return records.some((r) => r.taskId === taskId && r.period === period);
}

export function toggleTaskCompletion(
  taskId: string,
  frequency: "monthly" | "quarterly",
  records: TaskRecord[]
): TaskRecord[] {
  const period = getCurrentPeriod(frequency);
  const exists = records.some((r) => r.taskId === taskId && r.period === period);
  if (exists) {
    return records.filter((r) => !(r.taskId === taskId && r.period === period));
  }
  return [...records, { taskId, completedAt: new Date().toISOString(), period }];
}
