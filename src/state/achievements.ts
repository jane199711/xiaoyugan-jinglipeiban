import { getItem, setItem, KEYS, getTodayDateString } from "./storage";
import type { EnergyRecord } from "./types";

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_charge", emoji: "✨", name: "充能先锋", desc: "完成了第一次深度充能" },
  { id: "daily_charge_count", emoji: "🌟", name: "精力大富翁", desc: "今日完成了 ≥2 次充能" },
  { id: "total_charge_count", emoji: "💎", name: "深度修复者", desc: "累计完成 10 次充能" },
  { id: "daily_blind_box_count", emoji: "🎁", name: "盲盒狂魔", desc: "今日抽了 ≥5 次盲盒" },
  { id: "consecutive_records", emoji: "📔", name: "坚持小能手", desc: "连续 7 天有记录" },
  { id: "daily_high_energy", emoji: "⚡", name: "满电超人", desc: "今日所有记录都 ≥8 条(≥3 次)" },
  { id: "first_record", emoji: "🐱", name: "第一次见面", desc: "完成了第一次精力记录" },
  { id: "self_care", emoji: "🫧", name: "好好爱自己", desc: "记录过「自我照顾」" },
];

interface UnlockedMap { [id: string]: { unlocked_at: string } }

export function getUnlocked(): UnlockedMap {
  return getItem<UnlockedMap>(KEYS.achievements) ?? {};
}

export function unlock(id: string) {
  const m = getUnlocked();
  if (m[id]) return null;
  m[id] = { unlocked_at: new Date().toISOString() };
  setItem(KEYS.achievements, m);
  return ACHIEVEMENTS.find(a => a.id === id) ?? null;
}

export interface AchievementContext {
  records: EnergyRecord[];
  blindBoxCount: number;
  chargeSessionsToday: { status: string }[];
  totalChargeCount: number;
  consecutiveDays: number;
}

export function evaluateAll(ctx: AchievementContext): Achievement[] {
  const unlocked: Achievement[] = [];
  const u = getUnlocked();
  const tryUnlock = (id: string, cond: boolean) => {
    if (cond && !u[id]) {
      const a = unlock(id);
      if (a) unlocked.push(a);
    }
  };

  tryUnlock("first_record", ctx.records.length >= 1);
  tryUnlock("self_care", ctx.records.some(r => r.event_category === "自我照顾"));
  tryUnlock("first_charge", ctx.totalChargeCount >= 1);
  tryUnlock("daily_charge_count", ctx.chargeSessionsToday.filter(c => c.status === "completed").length >= 2);
  tryUnlock("total_charge_count", ctx.totalChargeCount >= 10);
  tryUnlock("daily_blind_box_count", ctx.blindBoxCount >= 5);
  tryUnlock("consecutive_records", ctx.consecutiveDays >= 7);
  const highEnergyCount = ctx.records.filter(r => r.energy_score >= 8).length;
  tryUnlock("daily_high_energy", highEnergyCount >= 3);

  return unlocked;
}

/** 估算近期连续记录天数(扫最近 14 天 localStorage) */
export function computeConsecutiveDays(): number {
  let count = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const rec = getItem<unknown[]>(KEYS.records(ds));
    if (rec && rec.length > 0) count++;
    else if (i === 0) continue; // 今日为空也允许
    else break;
  }
  return count;
}

export function getTodayBlindBoxCount(): number {
  const arr = getItem<unknown[]>(KEYS.blindBox(getTodayDateString())) ?? [];
  return arr.length;
}

export interface ChargeSession {
  id: string;
  activity_id: string;
  activity_title: string;
  cost: number;
  gain: number;
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  ended_at?: string;
}

export function getTodayChargeSessions(): ChargeSession[] {
  return getItem<ChargeSession[]>(KEYS.chargeSessions(getTodayDateString())) ?? [];
}

export function getTotalChargeCount(): number {
  let total = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const sessions = getItem<ChargeSession[]>(KEYS.chargeSessions(ds)) ?? [];
    total += sessions.filter(s => s.status === "completed").length;
  }
  return total;
}