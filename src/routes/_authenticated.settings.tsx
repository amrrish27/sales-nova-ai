import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name: "", business_name: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, business_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile({ full_name: data.full_name ?? "", business_name: data.business_name ?? "" });
        setLoading(false);
      });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-6">Settings</h1>
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <form onSubmit={save} className="space-y-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">Full name</span>
              <input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Business name</span>
              <input
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Email</span>
              <input
                value={user?.email ?? ""}
                disabled
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
