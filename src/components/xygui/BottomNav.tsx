import { NavLink } from "react-router-dom";
import { Sparkles, MessageCircle, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Sparkles, label: "首页" },
  { to: "/charge", icon: Zap, label: "充能" },
  { to: "/hollow", icon: MessageCircle, label: "树洞" },
  { to: "/report", icon: FileText, label: "日报" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] bg-card/90 backdrop-blur border border-border rounded-full shadow-soft flex items-center justify-around px-2 py-2 z-30">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 px-4 py-1 rounded-full transition",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}