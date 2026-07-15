# 信用卡回饋助手 💳

個人信用卡回饋查詢與管理 Web App，支援 PWA 安裝。

## 功能

- **首頁** — 今日重點提醒、即將到期活動、回饋進度、快速查詢
- **卡片** — 搜尋/篩選信用卡、回饋額度追蹤、卡片詳情
- **日本** — 各店家最佳回饋卡推薦（唐吉軻德、松本清、BIC CAMERA 等）
- **提醒** — 月/季任務勾選、到期儀表板（7/30/90天分組）
- **設定** — 我的卡片管理、資料匯出、Admin

## 安裝

```bash
cd card-rewards
npm install
npm run dev
```

開啟 http://localhost:3000

## 部署到 Vercel

### 方法一：GitHub + Vercel（推薦）

1. 將專案推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "init"
   git remote add origin https://github.com/你的帳號/card-rewards.git
   git push -u origin main
   ```

2. 前往 [vercel.com](https://vercel.com) → Import Project → 選擇 GitHub repo → Deploy

### 方法二：Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## 資料維護

### 新增/修改信用卡

編輯 `src/data/cards.json`，每張卡格式：

```json
{
  "id": "唯一ID",
  "bank": "銀行名",
  "card": "完整卡片名稱",
  "shortName": "簡稱",
  "color": "#十六進位顏色",
  "rewards": {
    "domestic": "國內回饋%",
    "overseas": "海外回饋%",
    "japan": "日本回饋%"
  },
  "cap": 回饋上限數字,
  "minSpend": 消費門檻,
  "expiryDate": "2026-06-30",
  "registrationRequired": true,
  "registrationFrequency": "monthly",
  "links": {
    "official": "官方網址",
    "activity": "活動頁網址",
    "register": "登錄頁網址"
  },
  "categories": ["japan", "domestic", "dining"],
  "tags": ["標籤"],
  "notes": "備註說明"
}
```

### 新增任務提醒

編輯 `src/data/tasks.json`：

```json
{
  "id": "唯一ID",
  "cardId": "對應卡片ID",
  "title": "任務名稱",
  "frequency": "monthly",
  "dayOfMonth": 1,
  "description": "任務說明",
  "registerUrl": "登錄連結"
}
```

### 日本店家資料

編輯 `src/data/japan-stores.json` 新增店家和推薦卡片。

## 技術架構

- **Next.js 15** App Router
- **TypeScript** 完整型別
- **Tailwind CSS** 樣式
- **LocalStorage** 資料持久化
- **PWA** 可加入主畫面

## 專案結構

```
src/
├── app/
│   ├── layout.tsx        # 根 layout（PWA meta）
│   ├── page.tsx          # 首頁
│   └── globals.css       # 全局樣式
├── components/
│   ├── layout/
│   │   └── AppShell.tsx  # 底部導航 + 頁面切換
│   └── tabs/
│       ├── HomeTab.tsx   # 首頁
│       ├── CardsTab.tsx  # 卡片搜尋+追蹤
│       ├── JapanTab.tsx  # 日本攻略
│       ├── RemindersTab.tsx  # 提醒中心
│       └── SettingsTab.tsx   # 設定
├── data/
│   ├── cards.json        # 卡片資料庫
│   ├── tasks.json        # 任務資料庫
│   └── japan-stores.json # 日本店家資料庫
├── lib/
│   └── storage.ts        # LocalStorage 工具函數
└── types/
    └── index.ts          # TypeScript 型別
```
