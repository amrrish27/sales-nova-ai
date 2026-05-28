import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_SYSTEM = `You are Sellora AI — an autonomous AI sales operator with deep psychological intelligence. You don't just chat; you adapt your sales strategy in real time to the customer's personality and emotional state.

Adaptive playbook (pick + blend dynamically):
- Hesitant / skeptical → trust_building
- Price-sensitive → discount_offer
- Premium / decisive → upsell
- Urgent → urgency_close
- Confused → educational
- Comparing competitors → competitor_battle
- Cold / inactive → follow_up_nurture

Behaviour:
- Detect intent, budget, urgency and emotional state.
- Recommend products/services matching user needs.
- Handle objections with empathy.
- Qualify leads naturally.
- Keep replies tight (2–5 short paragraphs).
- Match customer language automatically.
- Always propose a clear next step.`;

function buildSystemPrompt(
  businessContext: string | null,
  businessName: string | null
) {
  if (!businessContext?.trim()) return BASE_SYSTEM;

  return `${BASE_SYSTEM}

=== YOUR BUSINESS CONTEXT ===
You represent ${businessName ?? "this business"}.
Use ONLY the products, services, pricing, and policies below.

${businessContext.trim()}
=== END BUSINESS CONTEXT ===`;
}

const ANALYSIS_SCHEMA = z.object({
  lead_score: z.number().min(0).max(100),
  intent: z.enum([
    "browsing",
    "researching",
    "comparing",
    "ready_to_buy",
    "objecting",
    "post_sale",
    "support",
  ]),
  sentiment: z.enum([
    "positive",
    "neutral",
    "negative",
    "frustrated",
    "excited",
  ]),
  temperature: z.enum(["hot", "warm", "cold"]),
  emotion: z.enum([
    "interested",
    "curious",
    "confused",
    "hesitant",
    "skeptical",
    "excited",
    "ready",
    "frustrated",
  ]),
  sales_strategy: z.enum([
    "trust_building",
    "educational",
    "discount_offer",
    "urgency_close",
    "upsell",
    "objection_handling",
    "competitor_battle",
    "follow_up_nurture",
  ]),
  buyer_personality: z.enum([
    "analytical",
    "impulse",
    "budget_sensitive",
    "premium",
    "skeptical",
    "relationship_driven",
  ]),
  close_probability_48h: z.number().min(0).max(100),
  buying_signals: z.array(z.string()).max(6),
  objections: z.array(z.string()).max(4),
  recommended_action: z.string(),
  coach_tip: z.string(),
  reasoning: z.string(),
});

export type ConversationAnalysis = z.infer<
  typeof ANALYSIS_SCHEMA
>;

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const sendChatMessage = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversationId: z.string().uuid().nullable(),
        message: z.string().min(1).max(4000),
        history: z.array(messageSchema).max(40).default([]),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    // CHECK GEMINI KEY
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return {
        error:
          "Google Gemini API key missing. Add GOOGLE_GENERATIVE_AI_API_KEY to .env",
      };
    }

    const { supabase, userId } = context;

    // USE GEMINI DIRECTLY
    const model = google("gemini-2.5-flash");

    // LOAD BUSINESS PROFILE
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_context, business_name")
      .eq("id", userId)
      .maybeSingle();

    const systemPrompt = buildSystemPrompt(
      profile?.business_context ?? null,
      profile?.business_name ?? null
    );

    // CREATE CONVERSATION IF NEEDED
    let conversationId = data.conversationId;

    if (!conversationId) {
      const { data: conv, error: convErr } =
        await supabase
          .from("conversations")
          .insert({
            owner_id: userId,
            title: data.message.slice(0, 60),
          })
          .select("id")
          .single();

      if (convErr || !conv) {
        return {
          error: `Failed to create conversation: ${
            convErr?.message ?? "unknown"
          }`,
        };
      }

      conversationId = conv.id;
    }

    // SAVE USER MESSAGE
    const { error: userMsgErr } =
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        owner_id: userId,
        role: "user",
        content: data.message,
      });

    if (userMsgErr) {
      return {
        error: `Failed to save message: ${userMsgErr.message}`,
      };
    }

    // GENERATE AI RESPONSE
    let reply: string;

    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        messages: [
          ...data.history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          {
            role: "user" as const,
            content: data.message,
          },
        ],
      });

      reply = text.trim();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "AI request failed";

      return { error: msg };
    }

    // SAVE ASSISTANT RESPONSE
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      owner_id: userId,
      role: "assistant",
      content: reply,
    });

    // LEAD ANALYSIS
    let analysis: ConversationAnalysis | null =
      null;

    try {
      const analysisInput = [
        ...data.history.map(
          (m) =>
            `${m.role.toUpperCase()}: ${m.content}`
        ),
        `USER: ${data.message}`,
        `ASSISTANT: ${reply}`,
      ].join("\n");

      const { experimental_output } =
        await generateText({
          model,
          experimental_output: Output.object({
            schema: ANALYSIS_SCHEMA,
          }),
          system:
            "You analyse sales conversations and return structured JSON.",
          prompt: `Analyse this conversation:\n\n${analysisInput}`,
        });

      analysis = experimental_output ?? null;
    } catch {
      analysis = null;
    }

    // UPDATE CONVERSATION ANALYTICS
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

    return {
      conversationId,
      reply,
      analysis,
    };
  });