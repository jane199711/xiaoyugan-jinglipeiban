export type BaseEnergy = 4 | 7 | 10;
export type DailyLoad = 0.7 | 0.85 | 1.0;
export type SleepQuality = 0.7 | 0.85 | 1.0 | 1.1;
export type EmoScore = 0.8 | 0.9 | 1.0 | 1.1;
export type EHabit = 0.95 | 1.05;

export interface UserBaseline {
  base_energy: BaseEnergy;
  daily_load: DailyLoad;
  e_habit: EHabit;
  s_base: number; // 4-10 hours
  emo_score: EmoScore;
  s_quality: SleepQuality;
  last_period_start?: string | null;
  cycle_days: number;
  period_days: number;
  skip_cycle: boolean;
  exercises: string[];
  created_at: string;
}

export type EventChangeType = "add" | "subtract";
export type EventSource = "quick" | "longpress" | "detail" | "charge_start" | "charge_complete";

export interface EnergyRecord {
  id: string;
  timestamp: string;
  energy_score: number;
  previous_score: number;
  score_change: number;
  event_category: string | null;
  event_detail: string | null;
  change_type: EventChangeType;
  source: EventSource;
}

export type CyclePhase = "未追踪" | "月经期" | "卵泡期" | "排卵期" | "黄体期";