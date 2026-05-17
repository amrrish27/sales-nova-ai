import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  MessageSquare,
  Zap,
  Target,
  BarChart3,
  Sparkles,
  ArrowRight,
  Check,
  Bot,
  Users,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Sellora AI — AI Sales Assistant That Closes Deals" },
      {
        name: "description",
        content:
          "An AI sales employee that qualifies leads, handles objections, recommends products, and closes deals 24/7. Built for modern SaaS, e-commerce and services.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <LogoStrip />
      <Features />
      <HowItWorks />
      <Capabilities />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Sellora AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 hover:opacity-90 transition"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Floating decorative orbs */}
      <div className="orb h-72 w-72 bg-primary/40 top-20 -left-20" style={{ animationDelay: "0s" }} />
      <div className="orb h-96 w-96 bg-accent/30 top-40 -right-32" style={{ animationDelay: "-4s" }} />
      <div className="orb h-64 w-64 bg-chart-5/30 bottom-10 left-1/3" style={{ animationDelay: "-8s" }} />
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Powered by Gemini · GA today
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mx-auto mt-6 max-w-4xl text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]"
        >
          The AI sales employee that
          <br />
          <span className="gradient-text">never sleeps, never misses</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          Sellora AI qualifies leads, handles objections, recommends products and closes deals — autonomously.
          Plug it into your site, WhatsApp or app and watch conversion rates climb.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/signup"
            className="btn-shimmer group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-medium text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-[1.03]"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/login"
            className="hover-glow inline-flex items-center gap-2 rounded-xl glass px-6 py-3 text-sm font-medium hover:bg-white/10 transition"
          >
            Sign in
          </Link>
        </motion.div>

        {/* Mock dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="absolute -inset-x-20 -top-10 h-40 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl" />
          <div className="relative glass-strong rounded-2xl p-2 shadow-2xl">
            <div className="rounded-xl bg-card/60 p-6">
              <div className="grid grid-cols-3 gap-4 text-left">
                <PreviewMetric label="Leads converted" value="2,847" delta="+34%" />
                <PreviewMetric label="Conversations" value="18.2k" delta="+12%" />
                <PreviewMetric label="Revenue impact" value="$412k" delta="+58%" />
              </div>
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-background/40 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" /> Live conversation
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <ChatBubble side="user">I need a CRM under $50/mo for a 5-person team.</ChatBubble>
                    <ChatBubble side="ai">
                      Got it — for 5 seats, the Growth plan at $39/mo gives you everything plus AI scoring. Want me to start the trial?
                    </ChatBubble>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Lead intelligence</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-4xl font-semibold gradient-text">92</div>
                    <div className="text-xs text-muted-foreground">/ 100 likely to purchase</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["Budget confirmed", "Team size 5", "EOQ urgency"].map((t) => (
                      <span key={t} className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PreviewMetric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-success">{delta}</div>
    </div>
  );
}

function ChatBubble({ side, children }: { side: "user" | "ai"; children: React.ReactNode }) {
  return (
    <div className={side === "user" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          side === "user"
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary/20 px-3 py-2 text-foreground"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-white/5 px-3 py-2 text-foreground"
        }
      >
        {children}
      </div>
    </div>
  );
}

function LogoStrip() {
  return (
    <section className="border-y border-white/5 py-8">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Trusted by ambitious sales teams worldwide
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-muted-foreground/60">
          {["Lumen", "Northwind", "Acme", "Vertex", "Helios", "Quanta"].map((b) => (
            <span key={b} className="text-lg font-semibold tracking-wider">{b}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: Brain,
    title: "Intent intelligence",
    desc: "Real-time scoring of buying signals, urgency, budget and sentiment for every conversation.",
  },
  {
    icon: MessageSquare,
    title: "Conversational closing",
    desc: "Handles objections, recommends products, upsells and books meetings — like a senior AE.",
  },
  {
    icon: Target,
    title: "Auto-qualified leads",
    desc: "Hot, warm and cold lead segmentation with reasoning you can act on instantly.",
  },
  {
    icon: BarChart3,
    title: "Live revenue analytics",
    desc: "Funnel, conversion and AI performance dashboards backed by your real conversations.",
  },
  {
    icon: Zap,
    title: "Instant follow-ups",
    desc: "Automated nurture for leads who aren't ready, escalation for ones who are.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade security",
    desc: "Row-level data isolation, encrypted at rest, compliant by default.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
          A complete <span className="gradient-text">AI sales operating system</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Six interlocking systems that replace spreadsheets, scripts and the late-night follow-up shift.
        </p>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/30">
              <f.icon className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  {
    n: "01",
    title: "Connect your business",
    desc: "Plug Sellora AI into your website, WhatsApp or app in under 2 minutes.",
  },
  {
    n: "02",
    title: "AI learns your offer",
    desc: "Tell it what you sell, and it builds a personalised sales playbook automatically.",
  },
  {
    n: "03",
    title: "Convert at scale",
    desc: "Every visitor gets a 1:1 sales conversation, every lead gets scored, every deal moves forward.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
            From visitor to customer in <span className="gradient-text">three steps</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            No engineering work. No prompt tuning. Sellora AI is opinionated about how great selling looks.
          </p>
        </div>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6 flex gap-5">
              <div className="text-2xl font-semibold gradient-text">{s.n}</div>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="glass-strong rounded-3xl p-10 md:p-16 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Users className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-2xl font-semibold">What it actually does</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Real capabilities, not slideware. Every item below ships in v1.
            </p>
          </div>
          <ul className="md:col-span-2 grid sm:grid-cols-2 gap-3 text-sm">
            {[
              "Detects buying intent in real time",
              "Multilingual conversations (EN / HI / TA / +)",
              "Lead scoring 0–100 with reasoning",
              "Objection handling playbooks",
              "Smart product recommendations",
              "Customer profile auto-enrichment",
              "Pipeline & funnel analytics",
              "Conversation history & search",
            ].map((c) => (
              <li key={c} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const tiers = [
  {
    name: "Starter",
    price: "$0",
    desc: "For founders testing the waters.",
    features: ["1 agent", "200 conversations / mo", "Lead scoring", "CRM (500 contacts)"],
    cta: "Start free",
  },
  {
    name: "Growth",
    price: "$39",
    desc: "For teams ready to scale revenue.",
    features: ["3 agents", "10k conversations / mo", "Advanced analytics", "Unlimited CRM", "Email + WhatsApp"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Custom volume, custom controls.",
    features: ["Unlimited agents", "Custom integrations", "SAML SSO", "Dedicated support", "SLA"],
    cta: "Contact sales",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Pricing that scales with you
        </h2>
        <p className="mt-4 text-muted-foreground">
          Start free. Pay only when Sellora AI is closing deals for you.
        </p>
      </div>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={
              t.featured
                ? "glass-strong gradient-border rounded-2xl p-8 ring-1 ring-primary/30 relative"
                : "glass rounded-2xl p-8"
            }
          >
            {t.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-[11px] font-medium text-white">
                Most popular
              </div>
            )}
            <h3 className="text-lg font-semibold">{t.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold">{t.price}</span>
              {t.price.startsWith("$") && t.price !== "$0" && (
                <span className="text-sm text-muted-foreground">/ mo</span>
              )}
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className={
                t.featured
                  ? "mt-8 block w-full rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-center text-sm font-medium text-white"
                  : "mt-8 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium hover:bg-white/10"
              }
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Is Sellora AI a real product or a chatbot wrapper?",
    a: "Real product. Sellora AI is an end-to-end AI sales platform: live conversations, intent scoring, CRM, analytics and automation — all powered by Google Gemini and your own data.",
  },
  {
    q: "Which AI model do you use?",
    a: "Google Gemini 2.5 Flash for real-time conversations, with structured output for lead scoring. Routed via Lovable's secure AI gateway.",
  },
  {
    q: "How is my data protected?",
    a: "Every business is fully isolated by row-level security. Only you can read your conversations, leads and analytics.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no minimums. Cancel from settings in two clicks.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-24">
      <h2 className="text-4xl md:text-5xl font-semibold text-center tracking-tight">Questions, answered</h2>
      <div className="mt-10 space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="glass rounded-xl px-5 py-4 group [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="cursor-pointer flex items-center justify-between text-sm font-medium">
              {f.q}
              <span className="text-muted-foreground transition group-open:rotate-45 text-lg">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-16 text-center">
        <h3 className="text-3xl md:text-4xl font-semibold">
          Ready to <span className="gradient-text">10× your conversion rate?</span>
        </h3>
        <Link
          to="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-medium text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 transition"
        >
          Start your free trial <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-medium">Sellora AI</span>
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()}</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" /> Built for revenue teams
        </div>
      </div>
    </footer>
  );
}
