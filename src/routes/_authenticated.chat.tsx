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
            <h1 className="font-semibold leading-none">SalesNova AI</h1>
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
              <Loader2 className="h-4 w-4 animate-spin" /> SalesNova is thinking…
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
              placeholder="Message SalesNova as a customer…"
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
      <aside className="hidden xl:flex w-80 shrink-0 border-l border-white/5 bg-background/40 backdrop-blur-xl flex-col">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Live intelligence
          </h3>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto">
          {!analysis ? (
            <p className="text-sm text-muted-foreground">
              Send a message to see Gemini's live lead analysis appear here.
            </p>
          ) : (
            <>
              <div>
                <div className="text-xs text-muted-foreground">Lead score</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-5xl font-semibold gradient-text">{analysis.lead_score}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-0.5 text-xs uppercase tracking-wide">
                  {analysis.temperature} lead
                </div>
              </div>
              <Field label="Intent" value={analysis.intent} />
              <Field label="Sentiment" value={analysis.sentiment} />
              <div>
                <div className="text-xs text-muted-foreground mb-2">Buying signals</div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.buying_signals.length === 0 ? (
                    <span className="text-xs text-muted-foreground">none yet</span>
                  ) : (
                    analysis.buying_signals.map((s) => (
                      <span key={s} className="rounded-full bg-success/15 text-success px-2 py-0.5 text-[11px]">
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm capitalize">{value.replace(/_/g, " ")}</div>
    </div>
  );
}
