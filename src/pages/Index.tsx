import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Sparkles, MessageCircle, FileText, Zap } from "lucide-react";
import { FishCircle } from "@/components/xygui/FishCircle";
import { EnergyButton } from "@/components/xygui/EnergyButton";
import { CatBubble } from "@/components/xygui/CatBubble";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
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
  const { baseline } = useBaseline();
  const { state, update } = useEnergyToday(baseline);
  const [bubble, setBubble] = useState<{ text: string; loading?: boolean } | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);

  // 没基线 → 引导
  if (!baseline) return <Navigate to="/onboarding" replace />;

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
      if (state.current <= 3 && state.records.length > 0) requestAIBubble("low");
      else if (state.current >= 9 && state.records.length > 0) requestAIBubble("high");
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(state.current * 2)]);

  const adjust = (delta: number, source: "quick" | "longpress") => {
    update(delta, source);
  };

  const onCatClick = () => requestAIBubble("greet");

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-6 pb-24 max-w-md mx-auto">
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
          onLongPressTick={() => adjust(-0.5, "longpress")}
          onDouble={() => toast("双击事件记录:即将上线~", { description: "可以告诉小猫是什么消耗了你的精力" })}
        />
        <FishCircle energy={state.current} size={280} onCatClick={onCatClick} />
        <EnergyButton
          type="add"
          disabled={state.current >= 10}
          onSingle={() => adjust(0.5, "quick")}
          onLongPressTick={() => adjust(0.5, "longpress")}
          onDouble={() => toast("双击充能记录:即将上线~", { description: "可以告诉小猫是什么补充了你" })}
        />
      </section>

      {/* 提示 */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
        单击 ±0.5 · 长按连续调整 · 双击进入事件记录<br />
        点小猫咪和我聊聊~
      </p>

      {/* 底部导航 */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] bg-card/90 backdrop-blur border border-border rounded-full shadow-soft flex items-center justify-around px-2 py-2">
        <NavBtn icon={<Sparkles className="w-5 h-5" />} label="首页" active />
        <NavBtn icon={<Zap className="w-5 h-5" />} label="充能" />
        <NavBtn icon={<MessageCircle className="w-5 h-5" />} label="树洞" />
        <NavBtn icon={<FileText className="w-5 h-5" />} label="日报" />
      </nav>
    </main>
  );
};

function NavBtn({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={
        "flex flex-col items-center gap-0.5 px-4 py-1 rounded-full transition " +
        (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
      }
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default Index;
