import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  RadialBarChart,
  RadialBar,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Flame, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const COLORS = ["oklch(0.68 0.22 295)", "oklch(0.78 0.16 210)", "oklch(0.74 0.18 155)", "oklch(0.82 0.18 75)", "oklch(0.7 0.2 340)"];

function AnalyticsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [conv, cust, prof] = await Promise.all([
        supabase.from("conversations").select("intent, sentiment, lead_score, created_at"),
        supabase.from("customers").select("status, lead_score, created_at"),
        supabase.from("profiles").select("avg_deal_value").eq("id", user!.id).maybeSingle(),
      ]);
      return {
        conversations: conv.data ?? [],
        customers: cust.data ?? [],
        avgDeal: Number(prof.data?.avg_deal_value ?? 0),
      };
    },
  });

  const conversations = data?.conversations ?? [];
  const customers = data?.customers ?? [];
  const avgDeal = data?.avgDeal ?? 0;

  const intentCounts = aggregate(conversations, "intent");
  const sentimentCounts = aggregate(conversations, "sentiment");
  const hot = conversations.filter((c) => (c.lead_score ?? 0) >= 70).length;
  const warm = conversations.filter((c) => (c.lead_score ?? 0) >= 40 && (c.lead_score ?? 0) < 70).length;
  const cold = conversations.filter((c) => (c.lead_score ?? 0) < 40).length;
  const tempBuckets = [
    { name: "Cold", value: cold, fill: COLORS[3] },
    { name: "Warm", value: warm, fill: COLORS[1] },
    { name: "Hot", value: hot, fill: COLORS[0] },
  ];

  // Revenue prediction: sum (lead_score/100) * avgDeal across all conversations,
  // weighted by recency (last 30 days).
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const recent = conversations.filter((c) => new Date(c.created_at).getTime() >= cutoff);
  const predicted = avgDeal
    ? Math.round(recent.reduce((sum, c) => sum + ((c.lead_score ?? 0) / 100) * avgDeal, 0))
    : 0;
  const expectedConversions = Number(
    recent.reduce((sum, c) => sum + (c.lead_score ?? 0) / 100, 0).toFixed(1),
  );

  // 30-day projection chart: cumulative predicted revenue per day
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    return d;
  });
  let running = 0;
  const projection = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayConvs = conversations.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    });
    const dayRevenue = avgDeal
      ? dayConvs.reduce((s, c) => s + ((c.lead_score ?? 0) / 100) * avgDeal, 0)
      : 0;
    running += dayRevenue;
    return { day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), revenue: Math.round(running) };
  });

  const conversionRate = customers.length
    ? Math.round((customers.filter((c) => c.status === "won").length / customers.length) * 100)
    : 0;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live intelligence from {conversations.length} conversations and {customers.length} leads.
          {!avgDeal && (
            <>
              {" "}Set your avg deal value in <a href="/settings" className="text-primary hover:underline">Settings</a> to unlock revenue prediction.
            </>
          )}
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Users} label="Leads" value={customers.length.toString()} />
        <Stat icon={Flame} label="Hot leads (≥70)" value={hot.toString()} accent />
        <Stat icon={TrendingUp} label="Conversion rate" value={`${conversionRate}%`} />
        <Stat
          icon={DollarSign}
          label="Predicted 30d revenue"
          value={avgDeal ? `$${predicted.toLocaleString()}` : "—"}
          sub={avgDeal ? `${expectedConversions} expected wins` : "Set deal value"}
        />
      </div>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">30-day revenue projection</h3>
          <span className="text-xs text-muted-foreground">Cumulative · weighted by lead score</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.22 295)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.68 0.22 295)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} interval={4} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.78 0.16 210)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="Lead temperature">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="30%" outerRadius="100%" data={tempBuckets} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Intent distribution">
          {intentCounts.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={intentCounts} dataKey="value" nameKey="name" outerRadius={80} label>
                  {intentCounts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Sentiment">
          {sentimentCounts.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentCounts} dataKey="value" nameKey="name" outerRadius={80} label>
                  {sentimentCounts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {isLoading && <p className="mt-6 text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={"glass rounded-2xl p-5 " + (accent ? "ring-1 ring-primary/30" : "")}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={"h-4 w-4 " + (accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="h-full grid place-items-center text-xs text-muted-foreground">
      No data yet — start a chat.
    </div>
  );
}

function aggregate<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = (r[key] as string | null) ?? "unknown";
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

const tooltipStyle = {
  background: "rgba(20,18,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
};
