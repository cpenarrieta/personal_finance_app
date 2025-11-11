"use client"

import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User } from "lucide-react"
import { useRef, useEffect, useState, type FormEvent } from "react"
import type { MyUIMessage } from "@/app/api/chat/route"

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

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">AI Transaction Insights</h1>
        <p className="text-sm text-muted-foreground">Ask me anything about your spending and transactions</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-4">
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
                  onClick={() => handleSuggestionClick("What are my top 5 spending categories?")}
                  className="text-xs"
                >
                  📊 Top categories
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick("Show me my spending trend over the last 3 months")}
                  className="text-xs"
                >
                  📈 Spending trends
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

              // Get tool calls for debugging
              const toolCalls = message.parts.filter((part) => part.type.startsWith("tool-"))

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
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
              )
            })}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
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
  )
}
