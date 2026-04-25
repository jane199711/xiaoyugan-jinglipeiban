import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Type = "add" | "subtract";

interface Props {
  type: Type;
  disabled?: boolean;
  onSingle: () => void;
  onDouble?: () => void;
  onLongPressTick: () => void; // 每 500ms 触发一次
}

const DOUBLE_CLICK_DELAY = 300;
const LONGPRESS_DELAY = 500;
const LONGPRESS_INTERVAL = 500;
const MAX_LONGPRESS_FIRES = 10;

/** 三级交互按钮:单击/双击/长按。长按每 500ms ±0.5 一次,最多 10 次。 */
export function EnergyButton({ type, disabled, onSingle, onDouble, onLongPressTick }: Props) {
  const stateRef = useRef<"idle" | "pressing" | "longpress">("idle");
  const pressTimer = useRef<number | null>(null);
  const clickTimer = useRef<number | null>(null);
  const interval = useRef<number | null>(null);
  const clicks = useRef(0);
  const fires = useRef(0);

  const cleanup = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (interval.current) { clearInterval(interval.current); interval.current = null; }
  };

  useEffect(() => () => {
    cleanup();
    if (clickTimer.current) clearTimeout(clickTimer.current);
  }, []);

  const start = () => {
    if (disabled || stateRef.current !== "idle") return;
    stateRef.current = "pressing";
    pressTimer.current = window.setTimeout(() => {
      stateRef.current = "longpress";
      fires.current = 0;
      onLongPressTick(); fires.current++;
      interval.current = window.setInterval(() => {
        if (fires.current >= MAX_LONGPRESS_FIRES) {
          if (interval.current) clearInterval(interval.current);
          return;
        }
        onLongPressTick(); fires.current++;
      }, LONGPRESS_INTERVAL);
    }, LONGPRESS_DELAY);
  };

  const end = () => {
    if (stateRef.current === "longpress") {
      cleanup();
      stateRef.current = "idle";
      return;
    }
    if (stateRef.current === "pressing") {
      cleanup();
      stateRef.current = "idle";
      clicks.current++;
      if (clicks.current === 1) {
        clickTimer.current = window.setTimeout(() => {
          if (clicks.current === 1 && !disabled) onSingle();
          clicks.current = 0;
        }, DOUBLE_CLICK_DELAY);
      } else if (clicks.current === 2) {
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clicks.current = 0;
        if (!disabled) onDouble?.();
      }
    }
  };

  const cancel = () => {
    cleanup();
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clicks.current = 0;
    stateRef.current = "idle";
  };

  const isAdd = type === "add";

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={isAdd ? "增加 0.5 条小鱼干" : "减少 0.5 条小鱼干"}
      className={cn(
        "select-none touch-none w-16 h-16 rounded-full grid place-items-center transition-all active:scale-95",
        "bg-gradient-to-br shadow-pillow border-2 border-white/70",
        isAdd
          ? "from-primary to-fish text-primary-foreground"
          : "from-secondary to-accent text-secondary-foreground",
        disabled && "opacity-40 grayscale cursor-not-allowed active:scale-100"
      )}
    >
      {isAdd ? <Plus className="w-7 h-7" strokeWidth={3} /> : <Minus className="w-7 h-7" strokeWidth={3} />}
    </button>
  );
}