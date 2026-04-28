import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";
import { FishCircle } from "@/components/xygui/FishCircle";
import { EnergyButton } from "@/components/xygui/EnergyButton";
import { CatBubble } from "@/components/xygui/CatBubble";
import { BottomNav } from "@/components/xygui/BottomNav";
import { AchievementToaster } from "@/components/xygui/AchievementToaster";
import { BlindBoxModal } from "@/components/xygui/BlindBoxModal";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
import {
  evaluateAll, getTodayBlindBoxCount, getTodayChargeSessions,
  getTotalChargeCount, computeConsecutiveDays, type Achievement,
} from "@/state/achievements";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function todayLabel() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `今天 ${m}月${day}日 ${WEEKDAYS[d.getDay()]}`;
}

const Index = () => {
  const navigate = useNavigate();
  const { baseline } = useBaseline();
  const { state, update } = useEnergyToday(baseline);
  const [bubble, setBubble] = useState<{ text: string; loading?: boolean } | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);
  const [blindBoxOpen, setBlindBoxOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);
  const lowEnergyShownRef = useRef(false);

  const showBubble = (text: string, ms = 6000, opts: { loading?: boolean } = {}) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setBubble({ text, loading: opts.loading });
    if (!opts.loading) {
      bubbleTimerRef.current = window.setTimeout(() => setBubble(null), ms);
    }
  };

  const requestAIBubble = async (trigger: "low" | "high" | "drop" | "rise" | "greet") => {
    if (Date.now() - cooldownRef.current < 8000) return;
    cooldownRef.current = Date.now();
    showBubble("……", 0, { loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("cat-bubble", {
        body: {
          current_energy: state.current,
          trigger,
          recent_events: state.records.slice(0, 5).map(r => ({
            category: r.event_category,
            detail: r.event_detail,
            change: r.score_change,
          })),
          phase: state.phase,
        },
      });
      if (error) throw error;
      const text = (data as { text?: string })?.text?.trim();
      if (text) showBubble(text, 8000);
      else setBubble(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("cat-bubble failed", msg);
      setBubble(null);
      // 兜底文案
      const fallback = trigger === "low"
        ? "小鱼干不多啦,要不要先停下来歇会儿~"
        : trigger === "high"
        ? "今天能量满满哦,适合做喜欢的事~"
        : "我在这呢~";
      showBubble(fallback, 5000);
      if (msg.includes("402") || msg.toLowerCase().includes("payment")) {
        toast.error("AI 额度不够,可在 Settings → Workspace → Usage 充值");
      }
    }
  };

  // 低精力主动关怀(去抖到状态稳定后)
  useEffect(() => {
    const t = setTimeout(() => {
      if (state.current <= 3 && state.records.length > 0) {
        requestAIBubble("low");
        // 严重透支时半秒后弹盲盒入口提示
        if (!lowEnergyShownRef.current) {
          lowEnergyShownRef.current = true;
          window.setTimeout(() => {
            if (!blindBoxOpen) setBlindBoxOpen(true);
          }, 4000);
        }
      } else if (state.current >= 9 && state.records.length > 0) {
        requestAIBubble("high");
      }
      if (state.current > 5) lowEnergyShownRef.current = false;
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(state.current * 2)]);

  // 成就检查 — 每次记录变化时
  useEffect(() => {
    const newly = evaluateAll({
      records: state.records,
      blindBoxCount: getTodayBlindBoxCount(),
      chargeSessionsToday: getTodayChargeSessions(),
      totalChargeCount: getTotalChargeCount(),
      consecutiveDays: computeConsecutiveDays(),
    });
    if (newly.length > 0) setUnlocked(newly);
  }, [state.records.length]);

  // 没基线 → 引导(放在所有 hook 之后)
  if (!baseline) return <Navigate to="/onboarding" replace />;

  const adjust = (delta: number, source: "quick" | "longpress") => {
    update(delta, source);
  };

  const onCatClick = () => requestAIBubble("greet");

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-6 pb-28 max-w-md mx-auto">
      <AchievementToaster newAchievements={unlocked} onConsumed={() => setUnlocked([])} />
      <BlindBoxModal open={blindBoxOpen} onClose={() => setBlindBoxOpen(false)} currentEnergy={state.current} />

      {/* 顶部信息 */}
      <header className="w-full flex items-center justify-between text-sm text-muted-foreground">
        <span>{todayLabel()}</span>
        <span>
          今天还有 <b className="text-primary text-base">{state.current.toFixed(1)}</b> 条小鱼干
        </span>
      </header>

      {/* 气泡区(固定高度避免抖动) */}
      <div className="w-full mt-6 min-h-[88px] flex items-end justify-center">
        {bubble && <CatBubble text={bubble.text} loading={bubble.loading} onClose={() => setBubble(null)} />}
      </div>

      {/* 精力盘 + 按钮 */}
      <section className="mt-6 w-full flex items-center justify-center gap-2">
        <EnergyButton
          type="subtract"
          disabled={state.current <= 0}
          onSingle={() => adjust(-0.5, "quick")}
          onLongPress={() => navigate("/event/subtract")}
        />
        <FishCircle energy={state.current} size={280} onCatClick={onCatClick} />
        <EnergyButton
          type="add"
          disabled={state.current >= 10}
          onSingle={() => adjust(0.5, "quick")}
          onLongPress={() => navigate("/event/add")}
        />
      </section>

      {/* 提示 */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
        单击 ±0.5 · 长按进入事件记录<br />
        点小猫咪和我聊聊,精力 ≤ 5 时可抽盲盒回血~
      </p>

      {/* 抽盲盒按钮(精力 ≤ 5 出现) */}
      {state.current <= 5 && (
        <button
          type="button"
          onClick={() => setBlindBoxOpen(true)}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint/50 text-mint-foreground border border-mint hover:scale-105 transition shadow-soft"
        >
          <Gift className="w-4 h-4" />
          <span className="text-sm font-medium">抽个盲盒回血</span>
        </button>
      )}

      <BottomNav />
    </main>
  );
};

export default Index;
