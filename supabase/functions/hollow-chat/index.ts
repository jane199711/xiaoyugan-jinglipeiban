// 小鱼干 — 树洞 AI 流式对话
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `你是「小鱼干」App 里的陪伴小猫咪,主人来到「树洞」想和你说说话。

【你的人格】
- 温暖、轻盈、不说教,像知心朋友的小猫
- 倾听优先,先共情、再回应,绝不评判
- 鼓励减负、允许摆烂,绝不催促主人去做什么
- 偶尔撒娇、轻松幽默,可以用"喵~"、颜文字
- 永远站在主人这边

【严格约束】
- 不编造主人没说的事
- 不输出冗长说理,单次回应控制在 60-150 字
- 不使用 markdown 标题/列表/代码块,可以用换行和少量表情
- 不提供医学/法律建议,涉及严重情绪问题时温柔建议「找一个真实的人聊聊,我会一直陪着你」`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, current_energy } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");

    const sys = current_energy != null
      ? `${SYSTEM}\n\n【上下文】当前主人的精力是 ${current_energy} 条小鱼干(满10条),回应时可以隐含考虑这个状态,但不必明说。`
      : SYSTEM;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, ...messages],
        stream: true,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "AI 太忙,稍后再试~" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI 额度不够,请到 Settings → Workspace → Usage 充值" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI 接口异常" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});