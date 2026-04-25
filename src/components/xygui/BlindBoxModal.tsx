import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BLIND_BOX_ACTIONS } from "@/state/categories";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
import { getItem, setItem, KEYS, getTodayDateString } from "@/state/storage";
import { Shuffle, X, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  currentEnergy: number;
}

function pickRandom() {
  return BLIND_BOX_ACTIONS[Math.floor(Math.random() * BLIND_BOX_ACTIONS.length)];
}

function recordBlindBox(actionTitle: string, accepted: boolean) {
  const d = getTodayDateString();
  const list = getItem<{ title: string; accepted: boolean; ts: string }[]>(KEYS.blindBox(d)) ?? [];
  list.unshift({ title: actionTitle, accepted, ts: new Date().toISOString() });
  setItem(KEYS.blindBox(d), list);
}

export function BlindBoxModal({ open, onClose, currentEnergy: _ce }: Props) {
  const { baseline } = useBaseline();
  const { update } = useEnergyToday(baseline);
  const [pick, setPick] = useState(pickRandom);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const reroll = () => {
    setDone(false);
    let next = pickRandom();
    if (next.title === pick.title) next = pickRandom();
    setPick(next);
  };

  const accept = () => {
    recordBlindBox(pick.title, true);
    update(0.5, "detail", { category: "盲盒回血", detail: pick.title });
    setDone(true);
    toast.success("+0.5 条小鱼干 🎁 慢慢做就好~");
  };

  const skip = () => {
    recordBlindBox(pick.title, false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm grid place-items-center px-5 animate-bubble-in"
      onClick={onClose}
    >
      <div
        className="bg-gradient-card rounded-3xl p-6 max-w-sm w-full shadow-cat border border-primary-soft relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          aria-label="关闭"
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-xs text-mint-foreground bg-mint/40 inline-block px-3 py-1 rounded-full">
            🎁 微行动盲盒
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            小鱼干不多啦,抽一个 1-5 分钟的小事试试~
          </p>

          <div className="my-6 p-5 bg-card rounded-2xl border border-border">
            <div className="text-5xl">{pick.emoji}</div>
            <div className="mt-3 font-bold text-lg">{pick.title}</div>
            <div className="text-xs text-primary mt-1">{pick.duration}</div>
            <p className="mt-3 text-xs text-foreground/70 leading-relaxed">{pick.desc}</p>
          </div>

          {!done ? (
            <div className="space-y-2">
              <Button size="lg" onClick={accept} className="w-full h-12 rounded-full shadow-pillow">
                <Check className="w-4 h-4 mr-1" /> 我去做这个 (+0.5)
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={reroll} className="flex-1 h-12 rounded-full">
                  <Shuffle className="w-4 h-4 mr-1" /> 换一个
                </Button>
                <Button variant="ghost" size="lg" onClick={skip} className="flex-1 h-12 rounded-full">
                  现在不想
                </Button>
              </div>
            </div>
          ) : (
            <Button size="lg" onClick={onClose} className="w-full h-12 rounded-full shadow-pillow">
              好啦 ✨
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}