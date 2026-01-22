"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Loader2 } from "lucide-react"
import { useRef, useEffect, useState, useMemo, type FormEvent } from "react"
import type { MyUIMessage } from "@/app/api/chat/route"
import { ChartRenderer } from "@/components/chat/ChartRenderer"

export function ChatPageClient() {
  // AI SDK v6: Use transport pattern for chat configuration
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  )

  const { messages, sendMessage, status } = useChat<MyUIMessage>({ transport })
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
    sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold text-foreground">AI Transaction Insights</h1>
        <p className="text-sm text-muted-foreground">Ask me anything about your spending and transactions</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Start a conversation</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Try asking: &ldquo;How much did I spend on food last month?&rdquo; or &ldquo;What are my top spending
                  categories?&rdquo;
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick("How much did I spend last month?")}
                  className="text-xs"
                >
                  💰 Total spending last month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick("Show me a chart of my top 5 spending categories")}
                  className="text-xs"
                >
                  📊 Top categories chart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick("Show me my spending trend over the last 6 months")}
                  className="text-xs"
                >
                  📈 Spending trends
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick("Where do I spend the most money?")}
                  className="text-xs"
                >
                  🏪 Top merchants
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick("What's my income vs expenses this month?")}
                  className="text-xs"
                >
                  💵 Income vs expenses
                </Button>
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
      <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your transactions..."
          className="flex-1"
          disabled={status === "streaming" || status === "submitted"}
        />
        <Button type="submit" disabled={!input.trim() || status === "streaming" || status === "submitted"}>
          {status === "streaming" || status === "submitted" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
