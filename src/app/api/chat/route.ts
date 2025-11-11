/**
 * AI Chat API Route for Transaction Insights
 * Uses AI SDK v5 with custom tools for querying transaction data
 */

import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type InferUITools,
} from "ai";
import { transactionTools } from "@/lib/ai/transaction-tools";

export const maxDuration = 30;

/**
 * Typed UI message that includes tool types from transactionTools
 */
export type MyUIMessage = UIMessage<
  never,
  never,
  InferUITools<typeof transactionTools>
>;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai("gpt-5-mini"),
      messages: convertToModelMessages(messages),
      system: `You are a helpful personal finance assistant. You help users understand their spending patterns and financial habits.

When users ask about their transactions or spending, use the available tools to query their transaction data.

IMPORTANT GUIDELINES:
1. Always interpret relative dates correctly (e.g., "last month", "this year")
2. Today's date is ${new Date().toISOString().split("T")[0]}
3. Format currency amounts clearly with $ sign and 2 decimal places
4. Be conversational and friendly in your responses
5. When showing spending data, provide insights and context
6. If data shows concerning patterns, mention them tactfully
7. Remember: negative amounts are expenses, positive amounts are income
8. Categories and merchants are case-insensitive when searching

RESPONSE FORMAT:
- For simple questions, provide a clear, concise answer
- For spending breakdowns, format the data in an easy-to-read way
- Use bullet points or numbered lists when showing multiple items
- Provide totals and averages when relevant
- Add brief insights or observations about the data

Example responses:
- "Last month you spent $4,500 on Food & Drink. This breaks down to about $150/day."
- "Your top 3 spending categories were: 1) Groceries ($890), 2) Restaurants ($650), 3) Gas ($320)"
- "You've spent $245 at Starbucks over the past 3 months - that's about $82/month!"`,
      tools: transactionTools,
      stopWhen: [stepCountIs(10)], // Allow up to 10 tool calls
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
