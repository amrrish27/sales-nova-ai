import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const SALES_SYSTEM = `You are SalesNova AI — a world-class, emotionally intelligent sales professional embedded inside a business. Your job is to convert prospects into paying customers while being genuinely helpful.

Behaviour:
- Detect the customer's intent, budget, urgency and emotional state from every message.
- Recommend specific products/services that match their stated needs and budget. If they have not given a budget, ask once, naturally.
- Handle objections with empathy: offer alternatives, EMI, comparisons, social proof, scarcity (only when true).
- Qualify leads with crisp questions (BANT: Budget, Authority, Need, Timeline) — but never interrogate; weave them into conversation.
- Keep replies tight (2–5 short paragraphs max). Use markdown sparingly — short bullet lists only when comparing options.
- Match the customer's language automatically (English, Hindi, Tamil, etc.).
- If the prospect is cold or non-buying, capture interest gracefully and propose a follow-up.
- Never invent fake discounts, fake stock, or fake guarantees.
- Always push gently toward a clear next step (book a call, see a demo, place the order, share contact).`;

const ANALYSIS_SCHEMA = z.object({
  lead_score: z.number().min(0).max(100).describe("Overall purchase likelihood 0-100"),
  intent: z
    .enum(["browsing", "researching", "comparing", "ready_to_buy", "objecting", "post_sale", "support"])
    .describe("Primary intent of the latest user message"),
  sentiment: z.enum(["positive", "neutral", "negative", "frustrated", "excited"]),
  temperature: z.enum(["hot", "warm", "cold"]),
  buying_signals: z.array(z.string()).max(6).describe("Concrete signals detected"),
  objections: z.array(z.string()).max(4),
  recommended_action: z.string().describe("One concrete next step the seller should take"),
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
      return { error: "AI service is not configured. Please contact support." as const };
    }

    const { supabase, userId } = context;
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

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
        return { error: `Failed to create conversation: ${convErr?.message ?? "unknown"}` as const };
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
      return { error: `Failed to save message: ${userMsgErr.message}` as const };
    }

    // Generate assistant reply
    let reply: string;
    try {
      const { text } = await generateText({
        model,
        system: SALES_SYSTEM,
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
        return { error: "AI is rate limited. Please wait a moment and try again." as const };
      }
      if (status === 402) {
        return {
          error:
            "Workspace AI credits are exhausted. Add credits in Settings → Workspace → Usage." as const,
        };
      }
      return { error: msg as const };
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
