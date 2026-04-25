import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  onClose?: () => void;
  variant?: "default" | "insight";
  loading?: boolean;
}

export function CatBubble({ text, onClose, variant = "default", loading }: Props) {
  return (
    <div
      role="status"
      className={cn(
        "relative max-w-[320px] mx-auto bg-card/95 backdrop-blur",
        "rounded-3xl px-5 py-4 shadow-soft border border-primary-soft animate-bubble-in",
        variant === "insight" && "border-mint bg-mint/30"
      )}
    >
      {/* 尾巴小三角 */}
      <span
        aria-hidden
        className={cn(
          "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card/95 border-r border-b",
          variant === "insight" ? "border-mint bg-mint/30" : "border-primary-soft"
        )}
      />
      {variant === "insight" && (
        <span className="absolute -top-2 -left-2 text-lg">✨</span>
      )}
      <p className="text-sm leading-relaxed text-foreground/90 pr-5">
        {loading ? <span className="inline-flex gap-1"><Dot /><Dot delay=".15s" /><Dot delay=".3s" /></span> : text}
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭气泡"
          className="absolute top-2 right-2 text-muted-foreground/60 hover:text-foreground transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"
      style={{ animation: `float-y 900ms ease-in-out ${delay} infinite` }}
    />
  );
}