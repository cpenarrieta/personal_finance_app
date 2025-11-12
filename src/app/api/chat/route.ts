/**
 * AI Chat API Route for Transaction Insights
 * Uses AI SDK v5 with custom tools for querying transaction data
 */

import { openai } from "@ai-sdk/openai"
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, type InferUITools } from "ai"
import { transactionTools } from "@/lib/ai/transaction-tools"

export const maxDuration = 30

/**
 * Typed UI message that includes tool types from transactionTools
 */
export type MyUIMessage = UIMessage<never, never, InferUITools<typeof transactionTools>>

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    console.log("\n=== CHAT API REQUEST ===")
    console.log("📨 Incoming messages count:", messages.length)
    console.log("📝 Last message:", JSON.stringify(messages[messages.length - 1], null, 2))

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
      stopWhen: [stepCountIs(10)], // Allow up to 10 tool calls
      onStepFinish: async (result) => {
        console.log("\n=== STEP FINISHED ===")
        console.log("Finish reason:", result.finishReason)
        console.log("Text length:", result.text?.length || 0)

        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log("\n🔧 TOOL CALLS:")
          result.toolCalls.forEach((call, idx) => {
            console.log(`  ${idx + 1}. ${call.toolName}`)
            if ("input" in call) {
              console.log(`     Input:`, JSON.stringify(call.input, null, 2))
            }
          })
        }

        if (result.toolResults && result.toolResults.length > 0) {
          console.log("\n✅ TOOL RESULTS:")
          result.toolResults.forEach((toolResult, idx) => {
            console.log(`  ${idx + 1}. ${toolResult.toolName}`)
            console.log(`     Full toolResult object keys:`, Object.keys(toolResult))
            console.log(`     Full toolResult:`, JSON.stringify(toolResult, null, 2))
          })
        }
      },
      onFinish: async (result) => {
        console.log("\n\n🏁 === FINAL RESULT ===")
        console.log("Finish reason:", result.finishReason)
        console.log("Total steps:", result.steps?.length || 0)
        console.log("Response messages:", result.response?.messages?.length || 0)

        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log(
            "\n📋 All tool calls:",
            result.toolCalls.map((c) => c.toolName),
          )
        }

        if (result.toolResults && result.toolResults.length > 0) {
          console.log("\n📊 All tool results:")
          result.toolResults.forEach((tr) => {
            const hasOutput = "output" in tr
            console.log(`  - ${tr.toolName}: ${hasOutput ? "✓ has output" : "✗ no output"}`)
          })
        }
      },
    })

    console.log("📤 Streaming response started")
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
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
