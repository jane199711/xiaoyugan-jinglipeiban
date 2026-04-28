import { useCallback, useEffect, useState } from "react";
import type { EnergyRecord, EventChangeType, EventSource, UserBaseline } from "./types";
import { calculateInitialEnergyV3, clamp, assertValidDelta } from "./energy";
import { KEYS, getItem, getTodayDateString, setItem } from "./storage";

const ENERGY_EVENT = "xyg:energy-changed";
function broadcast() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ENERGY_EVENT));
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useBaseline() {
  const [baseline, setBaseline] = useState<UserBaseline | null>(() =>
    getItem<UserBaseline>(KEYS.baseline)
  );
  const save = useCallback((b: UserBaseline) => {
    setItem(KEYS.baseline, b);
    setBaseline(b);
  }, []);
  return { baseline, save };
}

export interface EnergyState {
  date: string;
  initial: number;
  current: number;
  phase: string;
  records: EnergyRecord[];
}

function loadStateForToday(baseline: UserBaseline | null): EnergyState {
  const date = getTodayDateString();
  const initial = getItem<number>(KEYS.energyInitial(date));
  const current = getItem<number>(KEYS.energyCurrent(date));
  const records = getItem<EnergyRecord[]>(KEYS.records(date)) ?? [];

  if (initial !== null && current !== null) {
    return { date, initial, current, phase: "未追踪", records };
  }
  // 今日首次:用基线计算
  if (!baseline) {
    return { date, initial: 8, current: 8, phase: "未追踪", records };
  }
  const { S_initial, phase } = calculateInitialEnergyV3(baseline);
  setItem(KEYS.energyInitial(date), S_initial);
  setItem(KEYS.energyCurrent(date), S_initial);
  setItem(KEYS.lastOpenDate, date);
  return { date, initial: S_initial, current: S_initial, phase, records: [] };
}

export function useEnergyToday(baseline: UserBaseline | null) {
  const [state, setState] = useState<EnergyState>(() => loadStateForToday(baseline));

  useEffect(() => {
    setState(loadStateForToday(baseline));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline?.created_at]);

  // 跨组件 / 跨标签 / 返回前台时同步
  useEffect(() => {
    const reload = () => setState(loadStateForToday(baseline));
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener(ENERGY_EVENT, reload);
    window.addEventListener("storage", reload);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(ENERGY_EVENT, reload);
      window.removeEventListener("storage", reload);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline?.created_at]);

  const update = useCallback(
    (delta: number, source: EventSource = "quick", record?: { category: string; detail?: string }) => {
      try { assertValidDelta(delta); } catch (e) { console.error(e); return null; }
      const latest = loadStateForToday(baseline);
      const next = clamp(latest.current + delta, 0, 10);
      if (next === latest.current) {
        setState(latest);
        return null;
      }
        const change_type: EventChangeType = delta > 0 ? "add" : "subtract";
        const rec: EnergyRecord = {
          id: uid(),
          timestamp: new Date().toISOString(),
          energy_score: next,
        previous_score: latest.current,
          score_change: delta,
          event_category: record?.category ?? null,
          event_detail: record?.detail ?? null,
          change_type,
          source,
        };
      const nextRecords = [rec, ...latest.records].slice(0, 200);
      const nextState = { ...latest, current: next, records: nextRecords };
      setItem(KEYS.energyCurrent(latest.date), next);
      setItem(KEYS.records(latest.date), nextRecords);
      setState(nextState);
      broadcast();
      return delta;
    },
    [baseline]
  );

  return { state, update };
}