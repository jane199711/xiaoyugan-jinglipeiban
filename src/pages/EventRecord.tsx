import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { ADD_CATEGORIES, SUBTRACT_CATEGORIES } from "@/state/categories";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** /event/add 或 /event/subtract — 双击 +/- 后进入 */
export default function EventRecord() {
  const { type } = useParams<{ type: "add" | "subtract" }>();
  const navigate = useNavigate();
  const isAdd = type === "add";
  const cats = isAdd ? ADD_CATEGORIES : SUBTRACT_CATEGORIES;
  const { baseline } = useBaseline();
  const { update } = useEnergyToday(baseline);

  const [picked, setPicked] = useState<string | null>(null);
  const [detail, setDetail] = useState("");

  const submit = () => {
    if (!picked) return;
    update(isAdd ? 0.5 : -0.5, "detail", { category: picked, detail: detail.trim() || undefined });
    toast.success(isAdd ? "记录 +0.5 条 🐟" : "记录 -0.5 条 🌧️");
    navigate("/");
  };

  return (
    <main className="min-h-screen px-5 pt-6 pb-32 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <h1 className="text-2xl font-bold">
        {isAdd ? "是什么让你充电了?" : "是什么消耗了你?"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        选一个最贴近的大类,告诉小猫一下~ {isAdd ? "可以是任何让你回血的小事。" : "不是为了责怪自己,只是看看自己流向哪里。"}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {cats.map(c => {
          const sel = picked === c.label;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => setPicked(c.label)}
              className={cn(
                "aspect-square rounded-3xl border-2 transition-all bg-gradient-card flex flex-col items-center justify-center gap-1.5 p-2",
                sel ? "border-primary shadow-pillow scale-[1.04]" : "border-transparent hover:border-primary-soft"
              )}
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-[11px] font-medium text-center leading-tight">{c.label}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-6 animate-bubble-in">
          <label className="text-sm font-medium">具体是什么?(可选)</label>
          <Textarea
            value={detail}
            onChange={e => setDetail(e.target.value.slice(0, 80))}
            placeholder={isAdd ? "说说是什么让你有能量的~" : "说说是什么让你累了~"}
            className="mt-2 rounded-2xl resize-none"
            rows={2}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">{detail.length}/80</div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] px-5">
        <Button
          size="lg"
          disabled={!picked}
          onClick={submit}
          className="w-full h-14 rounded-full text-base shadow-pillow"
        >
          {isAdd ? "记录 +0.5 条" : "记录 -0.5 条"}
        </Button>
      </div>
    </main>
  );
}