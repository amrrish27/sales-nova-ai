import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const SAMPLE = `Company: Acme Cloud CRM
What we sell:
- Starter plan: $29/user/month — pipeline, email sync, mobile app
- Growth plan: $59/user/month — automation, reports, integrations
- Enterprise: custom — SSO, audit logs, dedicated CSM

Ideal customer: 5–200 person B2B sales teams in SaaS or services.

Differentiators: 5-minute setup, native AI assistant, 99.99% uptime SLA.
Refund: 30-day money-back guarantee. Free 14-day trial, no credit card.`;

function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    full_name: "",
    business_name: "",
    business_context: "",
    avg_deal_value: "" as string,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, business_name, business_context, avg_deal_value")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setProfile({
            full_name: data.full_name ?? "",
            business_name: data.business_name ?? "",
            business_context: data.business_context ?? "",
            avg_deal_value: data.avg_deal_value != null ? String(data.avg_deal_value) : "",
          });
        setLoading(false);
      });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        business_name: profile.business_name,
        business_context: profile.business_context || null,
        avg_deal_value: profile.avg_deal_value ? Number(profile.avg_deal_value) : null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved — Sellora AI will use this for every future chat.");
  };

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-6">Settings</h1>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-5 w-5 animate-spin inline text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Profile</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Labeled label="Full name">
                <input
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="Business name">
                <input
                  value={profile.business_name}
                  onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="Email">
                <input value={user?.email ?? ""} disabled className={inputCls + " opacity-60"} />
              </Labeled>
              <Labeled label="Avg deal value (USD)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={profile.avg_deal_value}
                  onChange={(e) => setProfile({ ...profile, avg_deal_value: e.target.value })}
                  placeholder="e.g. 1200"
                  className={inputCls}
                />
              </Labeled>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Sales Brain — Business Context
              </h2>
              <button
                type="button"
                onClick={() => setProfile({ ...profile, business_context: SAMPLE })}
                className="text-xs text-primary hover:underline"
              >
                Use sample
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Describe your products, pricing, policies, and ideal customer. Sellora AI uses this on every chat — it will only
              recommend what you list here, with your real prices.
            </p>
            <textarea
              value={profile.business_context}
              onChange={(e) => setProfile({ ...profile, business_context: e.target.value })}
              rows={14}
              placeholder="Paste your offer here — products, plans, prices, ICP, differentiators, refund policy…"
              className={inputCls + " font-mono text-xs leading-relaxed"}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
