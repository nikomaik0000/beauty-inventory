export interface CardLinks {
  official: string;
  activity: string;
  register: string;
}

export interface CardRewards {
  domestic?: string;
  overseas?: string;
  japan?: string;
  japanNote?: string;
  easycard?: string;
  dining?: string;
  coffee?: string;
  digital?: string;
  travel?: string;
  mobile?: string;
  convenience?: string;
  specified?: string;
  payzhe?: string;
  everyday?: string;
  bigspend?: string;
  bonus?: string;
  holiday?: string;
  general?: string;
  selected?: string;
  subscribed?: string;
  unsubscribed?: string;
  funnow?: string;
  taiwanpay?: string;
}

export interface CreditCard {
  id: string;
  bank: string;
  card: string;
  shortName: string;
  color: string;
  rewards: CardRewards;
  cap: number | null;
  minSpend?: number;
  expiryDate: string;
  registrationRequired: boolean;
  registrationFrequency?: "monthly" | "quarterly" | "once";
  registrationNote?: string;
  links: CardLinks;
  categories: string[];
  tags: string[];
  notes: string;
  requirements?: string[];
  monthlyTasks?: string[];
  stores?: string[];
  japanStores?: string[];
  domesticStores?: string[];
}

export interface RewardTracker {
  cardId: string;
  month: string; // YYYY-MM
  earned: number;
  cap: number;
  entries: RewardEntry[];
}

export interface RewardEntry {
  id: string;
  date: string;
  amount: number;
  reward: number;
  note: string;
}

export interface TaskRecord {
  taskId: string;
  completedAt: string;
  period: string; // YYYY-MM or YYYY-Q1
}

export interface UserSettings {
  ownedCards: string[];
  japanMode: boolean;
  notificationsEnabled: boolean;
  myStoreMapping: { store: string; cardId: string }[];
}

export interface JapanStore {
  id: string;
  name: string;
  nameJa: string;
  category: string;
  bestCards: { cardId: string; rate: string; note?: string }[];
}

export type SearchCategory =
  | "all"
  | "domestic"
  | "overseas"
  | "japan"
  | "mobile"
  | "department"
  | "drugstore"
  | "dining"
  | "travel"
  | "ecommerce"
  | "convenience";

export interface MonthlyTask {
  id: string;
  cardId: string;
  title: string;
  frequency: "monthly" | "quarterly";
  dayOfMonth?: number;
  description: string;
}
