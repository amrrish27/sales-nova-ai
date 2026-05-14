import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus, Search, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScorePill } from "./_authenticated.dashboard";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CrmPage,
});

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;

function CrmPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNew, setShowNew] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("customers").update({ status: status as typeof STATUSES[number] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead removed");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const filtered = customers.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">{customers.length} leads in pipeline</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-white inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New lead
        </button>
      </header>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, company…"
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No leads match. Try clearing filters or adding a lead.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-white/5">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Contact</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Score</th>
                <th className="text-left p-4">Updated</th>
                <th className="p-4 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-4">
                    <div className="font-medium">{c.name}</div>
                    {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div className="text-xs">{c.phone}</div>}
                  </td>
                  <td className="p-4">
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus.mutate({ id: c.id, status: e.target.value })}
                      className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs capitalize"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4"><ScorePill score={c.lead_score} /></td>
                  <td className="p-4 text-muted-foreground text-xs">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${c.name}?`)) remove.mutate(c.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && <NewLeadModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewLeadModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      owner_id: user.id,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lead added");
    qc.invalidateQueries({ queryKey: ["customers"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="glass-strong rounded-2xl p-6 w-full max-w-md space-y-3"
      >
        <h2 className="text-lg font-semibold">New lead</h2>
        {(["name", "email", "phone", "company"] as const).map((k) => (
          <input
            key={k}
            required={k === "name"}
            type={k === "email" ? "email" : "text"}
            placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
            value={form[k]}
            onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        ))}
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
