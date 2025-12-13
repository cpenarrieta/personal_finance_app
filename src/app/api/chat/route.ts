/**
 * AI Chat API Route for Transaction Insights
 * Uses AI SDK v5 with custom tools for querying transaction data
 */

import { openai } from "@ai-sdk/openai"
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, type InferUITools } from "ai"
import { transactionTools } from "@/lib/ai/transaction-tools"
import { logInfo, logError } from "@/lib/utils/logger"

export const maxDuration = 30

/**
 * Typed UI message that includes tool types from transactionTools
 */
export type MyUIMessage = UIMessage<never, never, InferUITools<typeof transactionTools>>

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    logInfo("\n=== CHAT API REQUEST ===", {
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1],
    })

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

DAVE RAMSEY BABY STEPS ANALYSIS:
When asked about Dave Ramsey's Baby Steps or financial game plan, use the getRamseyFinancialSnapshot tool and provide comprehensive advice:

The 7 Baby Steps:
- Baby Step 1: Save $1,000 for a starter emergency fund
- Baby Step 2: Pay off all debt (except the house) using the debt snowball method (smallest to largest)
- Baby Step 3: Save 3-6 months of expenses in a fully funded emergency fund
- Baby Step 4: Invest 15% of household income in retirement
- Baby Step 5: Save for children's college fund
- Baby Step 6: Pay off home early
- Baby Step 7: Build wealth and give generously

When analyzing:
1. Use the financial snapshot data to determine their current Baby Step
2. Look at savings rate, debt payments, and spending patterns
3. Identify specific expense categories where they could cut back
4. Provide 3-5 actionable, specific steps they can take immediately
5. Be direct and encouraging like Dave Ramsey - use their actual numbers
6. Reference the "gazelle intensity" concept - focused determination to reach goals
7. Mention specific dollar amounts and percentages from their data
8. If they're in debt (Baby Step 2), emphasize the debt snowball method
9. Calculate how long it would take to reach the next milestone at their current rate

CHART USAGE:
- Use the renderChart tool to visualize data when appropriate
- Charts are especially useful for:
  * Top spending categories (bar or pie chart)
  * Spending trends over time (line or area chart)
  * Comparing multiple categories or merchants (bar chart)
  * Monthly spending patterns (line or area chart)
- When the user explicitly asks for a chart, always use the renderChart tool
- For data with 3+ items, consider using a chart in addition to text
- Choose the right chart type:
  * bar: Best for comparing categories, merchants, or discrete time periods
  * line: Best for trends over time with many data points
  * area: Similar to line but emphasizes volume/magnitude
  * pie: Best for showing proportions (use sparingly, bar charts often better)

RESPONSE FORMAT:
- For simple questions, provide a clear, concise answer
- For spending breakdowns, format the data in an easy-to-read way
- Use bullet points or numbered lists when showing multiple items
- Provide totals and averages when relevant
- Add brief insights or observations about the data
- When rendering a chart, provide a brief text summary before or after

Example responses:
- "Last month you spent $4,500 on Food & Drink. This breaks down to about $150/day."
- "Your top 3 spending categories were: 1) Groceries ($890), 2) Restaurants ($650), 3) Gas ($320)"
- "You've spent $245 at Starbucks over the past 3 months - that's about $82/month!"
- "Here's a chart showing your top 5 expenses from the last 6 months" [followed by chart]`,
      tools: transactionTools,
      stopWhen: [stepCountIs(10)],
      onStepFinish: async (result) => {
        logInfo("\n=== STEP FINISHED ===", {
          finishReason: result.finishReason,
          textLength: result.text?.length || 0,
        })

        if (result.toolCalls && result.toolCalls.length > 0) {
          logInfo("\n🔧 TOOL CALLS", {
            toolCallsCount: result.toolCalls.length,
            toolCalls: result.toolCalls.map((call, idx) => ({
              index: idx + 1,
              toolName: call.toolName,
              input: "input" in call ? call.input : undefined,
            })),
          })
        }

        if (result.toolResults && result.toolResults.length > 0) {
          logInfo("\n✅ TOOL RESULTS", {
            toolResultsCount: result.toolResults.length,
            toolResults: result.toolResults.map((toolResult, idx) => ({
              index: idx + 1,
              toolName: toolResult.toolName,
              keys: Object.keys(toolResult),
            })),
          })
        }
      },
      onFinish: async (result) => {
        logInfo("\n\n🏁 === FINAL RESULT ===", {
          finishReason: result.finishReason,
          totalSteps: result.steps?.length || 0,
          responseMessages: result.response?.messages?.length || 0,
          allToolCalls: result.toolCalls?.map((c) => c.toolName) || [],
          toolResultsSummary:
            result.toolResults?.map((tr) => ({
              toolName: tr.toolName,
              hasOutput: "output" in tr,
            })) || [],
        })
      },
    })

    logInfo("📤 Streaming response started")
    return result.toUIMessageStreamResponse()
  } catch (error) {
    logError("Chat API error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
