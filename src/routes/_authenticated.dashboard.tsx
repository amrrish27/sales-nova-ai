import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { TrendingUp, MessageSquare, Users, Flame } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [conv, cust, msgs] = await Promise.all([
        supabase.from("conversations").select("id, lead_score, intent, created_at"),
        supabase.from("customers").select("id, status, lead_score, created_at"),
        supabase.from("messages").select("id, role, created_at").order("created_at", { ascending: false }).limit(500),
      ]);
      return {
        conversations: conv.data ?? [],
        customers: cust.data ?? [],
        messages: msgs.data ?? [],
      };
    },
  });

  const conversations = stats?.conversations ?? [];
  const customers = stats?.customers ?? [];
  const messages = stats?.messages ?? [];

  const hotLeads = conversations.filter((c) => (c.lead_score ?? 0) >= 70).length;
  const avgScore = conversations.length
    ? Math.round(conversations.reduce((a, c) => a + (c.lead_score ?? 0), 0) / conversations.length)
    : 0;
  const conversionRate = customers.length
    ? Math.round((customers.filter((c) => c.status === "won").length / customers.length) * 100)
    : 0;

  // Build last-7-day chart from messages
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const chart = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const count = messages.filter((m) => {
      const t = new Date(m.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    return { day: d.toLocaleDateString(undefined, { weekday: "short" }), messages: count };
  });

  const funnel = [
    { stage: "New", value: customers.filter((c) => c.status === "new").length },
    { stage: "Contacted", value: customers.filter((c) => c.status === "contacted").length },
    { stage: "Qualified", value: customers.filter((c) => c.status === "qualified").length },
    { stage: "Proposal", value: customers.filter((c) => c.status === "proposal").length },
    { stage: "Won", value: customers.filter((c) => c.status === "won").length },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time intelligence from your AI sales floor.
          </p>
        </div>
        <Link
          to="/chat"
          className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-white"
        >
          Open AI Chat
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total leads" value={customers.length.toString()} />
        <Stat icon={MessageSquare} label="Conversations" value={conversations.length.toString()} />
        <Stat icon={Flame} label="Hot leads (≥70)" value={hotLeads.toString()} accent />
        <Stat icon={TrendingUp} label="Conversion rate" value={`${conversionRate}%`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Conversation activity (7d)</h3>
            <span className="text-xs text-muted-foreground">Avg lead score: {avgScore}</span>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.22 295)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.68 0.22 295)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,18,30,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="messages" stroke="oklch(0.78 0.16 210)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold">Sales funnel</h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="stage" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,18,30,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="oklch(0.68 0.22 295)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 mt-6">
        <h3 className="font-semibold mb-4">Recent conversations</h3>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No conversations yet. <Link to="/chat" className="text-primary hover:underline">Start one</Link>.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {conversations.slice(0, 6).map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                <span className="text-xs">{c.intent ?? "—"}</span>
                <ScorePill score={c.lead_score ?? 0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <div className={"glass rounded-2xl p-5 " + (accent ? "ring-1 ring-primary/30" : "")}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={"h-4 w-4 " + (accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 70 ? "bg-success/15 text-success" : score >= 40 ? "bg-warning/15 text-warning" : "bg-white/5 text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{score}</span>;
}
