// 浏览器版本的 wx.getStorageSync / setStorageSync 兼容层

export function getItem<T = unknown>(key: string, fallback: T | null = null): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage 写入失败", e);
  }
}

export function removeItem(key: string) {
  localStorage.removeItem(key);
}

export function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const KEYS = {
  baseline: "xyg_user_baseline",
  hasSeenTutorial: "xyg_has_seen_tutorial",
  lastOpenDate: "xyg_last_open_date",
  energyInitial: (date: string) => `xyg_energy_initial_${date}`,
  energyCurrent: (date: string) => `xyg_energy_current_${date}`,
  records: (date: string) => `xyg_records_${date}`,
  dailyStatus: (date: string) => `xyg_daily_status_${date}`,
  insightShown: (date: string) => `xyg_insight_${date}`,
  onboardingProgress: "xyg_onboarding_progress",
  blindBox: (date: string) => `xyg_blindbox_${date}`,
  chargeSessions: (date: string) => `xyg_charge_${date}`,
  dailyReport: (date: string) => `xyg_report_${date}`,
  hollowChat: "xyg_hollow_chat",
  achievements: "xyg_achievements",
};