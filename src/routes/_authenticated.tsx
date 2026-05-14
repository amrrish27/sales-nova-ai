import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Sparkles, LayoutDashboard, MessageSquare, Users, BarChart3, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.navigate({ to: "/login", search: { redirect: window.location.pathname } });
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function Sidebar() {
  const location = useLocation();
  const items = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/chat", label: "AI Sales Chat", icon: MessageSquare },
    { to: "/crm", label: "CRM", icon: Users },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/5 bg-background/40 backdrop-blur-xl p-4">
      <Link to="/" className="flex items-center gap-2 px-2 py-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold">SalesNova</span>
      </Link>
      <nav className="mt-6 flex flex-col gap-1">
        {items.map((it) => {
          const active = location.pathname === it.to || location.pathname.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className={
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition " +
                (active
                  ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5")
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
