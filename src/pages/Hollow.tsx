import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send } from "lucide-react";
import { BottomNav } from "@/components/xygui/BottomNav";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
import { getItem, setItem, KEYS } from "@/state/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import catHero from "@/assets/cat-hero.png";

type Msg = { role: "user" | "assistant"; content: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const GREETING: Msg = {
  role: "assistant",
  content: "嗨~欢迎来到树洞 🐱\n这里只有我和你,什么都可以说,我会一直认真听。",
};

export default function Hollow() {
  const { baseline } = useBaseline();
  const { state } = useEnergyToday(baseline);
  const [messages, setMessages] = useState<Msg[]>(() => {
    const stored = getItem<Msg[]>(KEYS.hollowChat);
    return stored && stored.length > 0 ? stored : [GREETING];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItem(KEYS.hollowChat, messages.slice(-30));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    const user: Msg = { role: "user", content: txt };
    const next = [...messages, user];
    setMessages(next);
    setInput("");
    setLoading(true);

    let acc = "";
    const append = (chunk: string) => {
      acc += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content && last.content !== "...") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m);
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/hollow-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.slice(-12).map(m => ({ role: m.role, content: m.content })),
          current_energy: state.current,
        }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("AI 太忙啦,稍后再试~");
        else if (resp.status === 402) toast.error("AI 额度不够,可在 Settings → Workspace → Usage 充值");
        else toast.error("小猫一时没听清,稍后再试");
        setLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) append(delta);
          } catch {
            buf = line + "\n" + buf; break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("网络小卡了一下,再试一次?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col max-w-md mx-auto pb-28">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3 border-b border-border/50">
        <img src={catHero} alt="" width={40} height={40} className="w-10 h-10 rounded-full" />
        <div>
          <div className="font-bold">小猫的树洞</div>
          <div className="text-[11px] text-muted-foreground">温柔倾听,不会评判 · 当前精力 {state.current.toFixed(1)} 条</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-strong:text-foreground">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
              <span className="inline-flex gap-1">
                <Dot /><Dot delay=".15s" /><Dot delay=".3s" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] px-3">
        <div className="flex items-end gap-2 bg-card/95 backdrop-blur border border-border rounded-3xl p-2 shadow-soft">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="说说你最近怎么样…"
            rows={1}
            className="flex-1 border-0 bg-transparent resize-none focus-visible:ring-0 min-h-[44px] max-h-32 px-3"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={!input.trim() || loading}
            className="h-11 w-11 rounded-full shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70" style={{ animation: `float-y 900ms ease-in-out ${delay} infinite` }} />;
}