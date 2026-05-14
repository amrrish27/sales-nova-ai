import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, RadialBarChart, RadialBar, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const COLORS = ["oklch(0.68 0.22 295)", "oklch(0.78 0.16 210)", "oklch(0.74 0.18 155)", "oklch(0.82 0.18 75)", "oklch(0.7 0.2 340)"];

function AnalyticsPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [conv, cust] = await Promise.all([
        supabase.from("conversations").select("intent, sentiment, lead_score"),
        supabase.from("customers").select("status"),
      ]);
      return { conversations: conv.data ?? [], customers: cust.data ?? [] };
    },
  });

  const conversations = data?.conversations ?? [];
  const customers = data?.customers ?? [];

  const intentCounts = aggregate(conversations, "intent");
  const sentimentCounts = aggregate(conversations, "sentiment");
  const tempBuckets = [
    { name: "Cold", value: conversations.filter((c) => (c.lead_score ?? 0) < 40).length, fill: COLORS[3] },
    { name: "Warm", value: conversations.filter((c) => (c.lead_score ?? 0) >= 40 && (c.lead_score ?? 0) < 70).length, fill: COLORS[1] },
    { name: "Hot", value: conversations.filter((c) => (c.lead_score ?? 0) >= 70).length, fill: COLORS[0] },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Insights from {conversations.length} conversations and {customers.length} leads.
        </p>
      </header>

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
        </ChartCard>

        <ChartCard title="Sentiment">
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
        </ChartCard>
      </div>
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
