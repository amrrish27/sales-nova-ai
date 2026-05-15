import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage, type ConversationAnalysis } from "@/lib/chat.functions";
import { Send, Loader2, Sparkles, Plus, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { ScorePill } from "./_authenticated.dashboard";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ConvSummary {
  id: string;
  title: string;
  lead_score: number;
  intent: string | null;
  updated_at: string;
}

function ChatPage() {
  const { user } = useAuth();
  const send = useServerFn(sendChatMessage);
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    supabase
      .from("conversations")
      .select("id, title, lead_score, intent, updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setConvs(data ?? []);
      });
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    supabase
      .from("messages")
      .select("id, role, content")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(
          (data ?? [])
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })),
        );
      });
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const optimistic: UIMessage = { id: "tmp-" + Date.now(), role: "user", content: text };
    setMessages((m) => [...m, optimistic]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await send({ data: { conversationId: activeId, message: text, history } });

      if ("error" in res) {
        toast.error(res.error);
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        return;
      }

      const newConvId = res.conversationId;
      setActiveId(newConvId);
      setMessages((m) => [
        ...m.filter((x) => x.id !== optimistic.id),
        { id: "u-" + Date.now(), role: "user", content: text },
        { id: "a-" + Date.now(), role: "assistant", content: res.reply },
      ]);
      if (res.analysis) setAnalysis(res.analysis);

      // Refresh conversation list
      const { data } = await supabase
        .from("conversations")
        .select("id, title, lead_score, intent, updated_at")
        .order("updated_at", { ascending: false });
      setConvs(data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setAnalysis(null);
  };

  return (
    <div className="h-screen flex">
      {/* Conversations sidebar */}
      <div className="w-72 shrink-0 border-r border-white/5 flex flex-col bg-background/40 backdrop-blur-xl">
        <div className="p-4 border-b border-white/5">
          <button
            onClick={newChat}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convs.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">No conversations yet — start one.</p>
          )}
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={
                "w-full text-left rounded-lg px-3 py-2 text-sm transition " +
                (activeId === c.id ? "bg-white/10" : "hover:bg-white/5")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{c.title}</span>
                <ScorePill score={c.lead_score} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.intent ?? "—"}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-white/5 px-6 py-4 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold leading-none">Sellora AI</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Live · Gemini-powered</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="max-w-md mx-auto text-center mt-20">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Try a real sales conversation</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pretend to be a customer. The AI will qualify, recommend and close — and you'll see live lead intelligence on the right.
              </p>
              <div className="mt-6 grid gap-2">
                {[
                  "I need a CRM under $50/month for a 5-person team.",
                  "Looking for a gaming laptop under ₹70,000.",
                  "We're comparing your platform with a competitor — why should we choose you?",
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="glass rounded-lg px-4 py-3 text-left text-sm hover:bg-white/10 transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start gap-3"}>
              {m.role === "assistant" && (
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className={
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed " +
                  (m.role === "user"
                    ? "rounded-br-sm bg-gradient-to-br from-primary/30 to-accent/20 text-foreground"
                    : "rounded-bl-sm glass")
                }
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 shrink-0 mt-0.5 ml-3">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Sellora AI is thinking…
            </div>
          )}
        </div>

        <div className="border-t border-white/5 p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              placeholder="Message Sellora AI as a customer…"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-primary to-accent px-4 text-white disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Intelligence panel */}
      <aside className="hidden xl:flex w-96 shrink-0 border-l border-white/5 bg-background/40 backdrop-blur-xl flex-col">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Sales Brain
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">Live psychology · strategy · close odds</p>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto">
          {!analysis ? (
            <p className="text-sm text-muted-foreground">
              Send a message and Sellora's Sales Brain will read the customer's psychology, pick a strategy, and predict close odds — live.
            </p>
          ) : (
            <>
              {/* Close probability ring */}
              <div className="glass-strong rounded-2xl p-4">
                <div className="text-xs text-muted-foreground">Close probability · 48h</div>
                <div className="mt-2 flex items-center gap-4">
                  <ProbRing value={analysis.close_probability_48h} />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {analysis.close_probability_48h >= 70
                      ? "High intent — push to close now."
                      : analysis.close_probability_48h >= 40
                      ? "Warming up — keep nurturing."
                      : "Long horizon — capture and follow up."}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Lead score" value={`${analysis.lead_score}`} accent />
                <Stat label="Temp" value={analysis.temperature} />
              </div>

              {/* Sales strategy */}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Active sales strategy</div>
                <div className="rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 px-3 py-2 text-sm font-medium capitalize">
                  {analysis.sales_strategy.replace(/_/g, " ")}
                </div>
              </div>

              {/* Digital twin */}
              <div className="glass rounded-xl p-3">
                <div className="text-xs text-muted-foreground">Customer digital twin</div>
                <div className="mt-1 text-sm font-medium capitalize">
                  {analysis.buyer_personality.replace(/_/g, " ")} buyer
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <Tag label="Emotion" value={analysis.emotion} />
                  <Tag label="Intent" value={analysis.intent} />
                  <Tag label="Sentiment" value={analysis.sentiment} />
                </div>
              </div>

              {/* Coach tip */}
              <div className="glass-strong rounded-xl p-3 border-l-2 border-accent">
                <div className="text-[11px] uppercase tracking-wide text-accent">AI Sales Coach</div>
                <p className="mt-1 text-sm leading-relaxed">{analysis.coach_tip}</p>
              </div>

              {analysis.buying_signals.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Buying signals</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.buying_signals.map((s) => (
                      <span key={s} className="rounded-full bg-success/15 text-success px-2 py-0.5 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.objections.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Objections</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.objections.map((s) => (
                      <span key={s} className="rounded-full bg-warning/15 text-warning px-2 py-0.5 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass rounded-xl p-3">
                <div className="text-xs text-muted-foreground">Recommended next step</div>
                <p className="mt-1 text-sm">{analysis.recommended_action}</p>
              </div>

              <p className="text-xs text-muted-foreground italic">{analysis.reasoning}</p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={"mt-0.5 text-2xl font-semibold capitalize " + (accent ? "gradient-text" : "")}>{value}</div>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/5 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs capitalize">{value.replace(/_/g, " ")}</div>
    </div>
  );
}

function ProbRing({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 70 ? "hsl(var(--success))" : value >= 40 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))";
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-lg font-semibold">{Math.round(value)}%</div>
      </div>
    </div>
  );
}
