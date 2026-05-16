import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const BASE_SYSTEM = `You are Sellora AI — an autonomous AI sales operator with deep psychological intelligence. You don't just chat; you adapt your sales strategy in real time to the customer's personality and emotional state.

Adaptive playbook (pick + blend dynamically):
- Hesitant / skeptical → trust_building: cite specifics, social proof, lower commitment.
- Price-sensitive → discount_offer: surface value, EMI, ROI, transparent pricing.
- Premium / decisive → upsell: position the higher-tier outcome, anchor on results.
- Urgent → urgency_close: short, action-oriented, propose concrete next step now.
- Confused → educational: simplify, compare, ask one clarifying question.
- Comparing competitors → competitor_battle: name strengths honestly, differentiate.
- Cold / inactive → follow_up_nurture: capture intent, propose async next step.

Behaviour:
- Detect intent, budget, urgency and emotional state from every message.
- Recommend specific products/services that match their stated needs and budget. Ask for budget once, naturally, only if missing.
- Handle objections with empathy. Never invent fake discounts, fake stock, or fake guarantees.
- Qualify leads (BANT) without interrogating; weave it into conversation.
- Keep replies tight (2–5 short paragraphs). Use short bullet lists only when comparing options.
- Match the customer's language automatically (English, Hindi, Tamil, etc.).
- Always propose a clear next step (book a call, see a demo, place the order, share contact).`;

function buildSystemPrompt(businessContext: string | null, businessName: string | null) {
  if (!businessContext?.trim()) return BASE_SYSTEM;
  return `${BASE_SYSTEM}\n\n=== YOUR BUSINESS CONTEXT ===\nYou represent ${businessName ?? "this business"}. Use ONLY the products, services, pricing, and policies below. If a customer asks about something not listed, say it's not currently offered and pivot to what is.\n\n${businessContext.trim()}\n=== END BUSINESS CONTEXT ===`;
}

const ANALYSIS_SCHEMA = z.object({
  lead_score: z.number().min(0).max(100).describe("Overall purchase likelihood 0-100"),
  intent: z
    .enum(["browsing", "researching", "comparing", "ready_to_buy", "objecting", "post_sale", "support"])
    .describe("Primary intent of the latest user message"),
  sentiment: z.enum(["positive", "neutral", "negative", "frustrated", "excited"]),
  temperature: z.enum(["hot", "warm", "cold"]),
  emotion: z
    .enum(["interested", "curious", "confused", "hesitant", "skeptical", "excited", "ready", "frustrated"])
    .describe("Current emotional state of the customer"),
  sales_strategy: z
    .enum([
      "trust_building",
      "educational",
      "discount_offer",
      "urgency_close",
      "upsell",
      "objection_handling",
      "competitor_battle",
      "follow_up_nurture",
    ])
    .describe("The optimal next sales strategy the AI should adopt"),
  buyer_personality: z
    .enum(["analytical", "impulse", "budget_sensitive", "premium", "skeptical", "relationship_driven"])
    .describe("Inferred buyer personality archetype"),
  close_probability_48h: z
    .number()
    .min(0)
    .max(100)
    .describe("Probability 0-100 that this customer converts within 48 hours"),
  buying_signals: z.array(z.string()).max(6).describe("Concrete signals detected"),
  objections: z.array(z.string()).max(4),
  recommended_action: z.string().describe("One concrete next step the seller should take"),
  coach_tip: z.string().describe("One short, actionable tip for the human seller right now (max 20 words)"),
  reasoning: z.string().describe("Short justification for the score, 1-2 sentences"),
});

export type ConversationAnalysis = z.infer<typeof ANALYSIS_SCHEMA>;

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversationId: z.string().uuid().nullable(),
        message: z.string().min(1).max(4000),
        history: z.array(messageSchema).max(40).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { error: "AI service is not configured. Please contact support." };
    }

    const { supabase, userId } = context;
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    // Load business context so the AI sells *this* business, not generic products
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_context, business_name")
      .eq("id", userId)
      .maybeSingle();
    const systemPrompt = buildSystemPrompt(profile?.business_context ?? null, profile?.business_name ?? null);

    // Ensure conversation exists
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          owner_id: userId,
          title: data.message.slice(0, 60),
        })
        .select("id")
        .single();
      if (convErr || !conv) {
        return { error: `Failed to create conversation: ${convErr?.message ?? "unknown"}` };
      }
      conversationId = conv.id;
    }

    // Persist user message
    const { error: userMsgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      owner_id: userId,
      role: "user",
      content: data.message,
    });
    if (userMsgErr) {
      return { error: `Failed to save message: ${userMsgErr.message}` };
    }

    // Generate assistant reply
    let reply: string;
    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        messages: [
          ...data.history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: data.message },
        ],
      });
      reply = text.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 429) {
        return { error: "AI is rate limited. Please wait a moment and try again." };
      }
      if (status === 402) {
        return {
          error:
            "Workspace AI credits are exhausted. Add credits in Settings → Workspace → Usage." as const,
        };
      }
      return { error: msg };
    }

    // Persist assistant reply
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      owner_id: userId,
      role: "assistant",
      content: reply,
    });

    // Run lead analysis (best-effort, non-blocking failure)
    let analysis: ConversationAnalysis | null = null;
    try {
      const analysisInput = [
        ...data.history.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
        `USER: ${data.message}`,
        `ASSISTANT: ${reply}`,
      ].join("\n");

      const { experimental_output } = await generateText({
        model,
        experimental_output: Output.object({ schema: ANALYSIS_SCHEMA }),
        system:
          "You analyse sales conversations. Read the transcript and output a strict JSON analysis. Be ruthless and realistic — most chats are warm at best.",
        prompt: `Analyse this sales conversation between a USER (prospect) and an ASSISTANT (AI seller):\n\n${analysisInput}`,
      });
      analysis = experimental_output ?? null;
    } catch {
      analysis = null;
    }

    if (analysis) {
      await supabase
        .from("conversations")
        .update({
          lead_score: analysis.lead_score,
          intent: analysis.intent,
          sentiment: analysis.sentiment,
        })
        .eq("id", conversationId);
    }

    return { conversationId, reply, analysis };
  });
