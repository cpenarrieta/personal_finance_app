"use client"

import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Sparkles } from "lucide-react"
import { useRef, useEffect, useState, type FormEvent } from "react"
import type { MyUIMessage } from "@/app/api/chat/route"
import { ChartRenderer } from "@/components/chat/ChartRenderer"

const RAMSEY_ADVISOR_PROMPT = `Analyze my financial situation using the Dave Ramsey Baby Steps framework.

Please use the getRamseyFinancialSnapshot tool to get my financial data, then provide me with:

1. **Current Baby Step Assessment**: Based on my income, expenses, savings patterns, and any detected debt payments, determine which of the 7 Baby Steps I'm currently on:
   - Baby Step 1: Save $1,000 starter emergency fund
   - Baby Step 2: Pay off all debt (except house) using debt snowball
   - Baby Step 3: Save 3-6 months of expenses for a fully funded emergency fund
   - Baby Step 4: Invest 15% of income in retirement
   - Baby Step 5: Save for children's college
   - Baby Step 6: Pay off home early
   - Baby Step 7: Build wealth and give generously

2. **Personalized Action Items**: Give me 3-5 specific, actionable steps I should take RIGHT NOW based on my actual spending patterns. Reference specific categories where I could cut back if needed.

3. **Progress Metrics**: Show me key numbers that matter for my current Baby Step - emergency fund progress, debt payoff progress, or savings rate depending on where I am.

4. **Encouragement & Next Milestone**: Tell me what I'm doing well and what my next financial milestone should be.

Be direct and specific like Dave Ramsey would be - use my actual numbers and give me real advice, not generic tips.`

export function ChatPageClient() {
  const { messages, sendMessage } = useChat<MyUIMessage>({})
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    sendMessage({ text: input })
    setInput("")
  }

  const handleSuggestionClick = (text: string) => {
    setInput(text)
  }

  const handleRamseyAdvisorClick = () => {
    sendMessage({ text: RAMSEY_ADVISOR_PROMPT })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold text-foreground">AI Transaction Insights</h1>
        <p className="text-sm text-muted-foreground">Ask me anything about your spending and transactions</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-6">
              {/* Ramsey Advisor - Main Feature */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl" />
                  <div className="relative bg-card border-2 border-primary/20 rounded-2xl p-6 space-y-4 max-w-md mx-auto">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">Ramsey Baby Steps Advisor</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get personalized financial advice based on Dave Ramsey&apos;s proven Baby Steps method.
                      We&apos;ll analyze your transactions and tell you exactly where you are and what to do next.
                    </p>
                    <Button
                      onClick={handleRamseyAdvisorClick}
                      size="lg"
                      className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      <Sparkles className="h-4 w-4" />
                      Get My Financial Game Plan
                    </Button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 max-w-md mx-auto">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or ask a question</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Other Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Bot className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Quick questions about your finances</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick("How much did I spend last month?")}
                    className="text-xs"
                  >
                    Total spending last month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick("Show me a chart of my top 5 spending categories")}
                    className="text-xs"
                  >
                    Top categories chart
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick("Show me my spending trend over the last 6 months")}
                    className="text-xs"
                  >
                    Spending trends
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              // Extract text content from message parts
              const textContent = message.parts
                .filter((part) => part.type === "text")
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")

              // Get tool calls for rendering
              const toolCalls = message.parts.filter((part) => part.type.startsWith("tool-"))

              // Find chart tool calls with output
              const chartCalls = message.parts.filter((part) => {
                const partType = part.type as string
                return partType.includes("renderChart") && "output" in part
              })

              return (
                <div key={message.id} className="flex flex-col gap-3">
                  <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap">{textContent}</div>
                      </div>

                      {/* Show tool invocations for debugging */}
                      {toolCalls.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-border pt-2">
                          {toolCalls.map((tool, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              🔧 {tool.type.replace("tool-", "").replace(/([A-Z])/g, " $1")}
                              {tool.type.includes("output-available") && " ✓"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="h-5 w-5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Render charts */}
                  {chartCalls.length > 0 &&
                    chartCalls.map((chartCall, idx) => {
                      const chartData = "output" in chartCall ? (chartCall.output as any) : null

                      if (!chartData) return null

                      return (
                        <div key={`chart-${idx}`} className="w-full">
                          <ChartRenderer
                            type={chartData.type}
                            title={chartData.title}
                            description={chartData.description}
                            data={chartData.data}
                            xAxisLabel={chartData.xAxisLabel}
                            yAxisLabel={chartData.yAxisLabel}
                            formatValue={chartData.formatValue}
                          />
                        </div>
                      )
                    })}
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <div className="space-y-2 shrink-0">
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRamseyAdvisorClick}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Get Ramsey Baby Steps Advice
          </Button>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your transactions..."
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
