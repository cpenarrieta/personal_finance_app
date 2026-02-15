"use client"

import { Bot, User } from "lucide-react"

const demoMessages = [
  {
    role: "user" as const,
    content: "What were my top 5 expenses last month?",
  },
  {
    role: "assistant" as const,
    content: `Here are your top 5 expenses from last month:

1. **Mortgage Payment** - $2,100.00 (Core Housing)
2. **Costco** - $287.45 (Groceries)
3. **Car Insurance** - $150.00 (Transportation)
4. **BC Hydro** - $198.32 (Utilities)
5. **Amazon.ca** - $142.87 (Personal & Giving)

Your total spending last month was $5,847.23, which is 3.2% lower than the previous month.`,
  },
  {
    role: "user" as const,
    content: "How much did I spend on groceries this year?",
  },
  {
    role: "assistant" as const,
    content: `Your grocery spending this year totals **$4,523.67** across 47 transactions.

**Monthly breakdown:**
- January: $412.30
- February: $389.45
- March: $425.18
- April: $398.72
- May: $445.60
- June: $410.33
- July: $438.90
- August: $402.15
- September: $425.80
- October: $375.24

**Top stores:**
- Costco: $1,845.20 (40.8%)
- Save-on-Foods: $1,312.45 (29.0%)
- No Frills: $892.34 (19.7%)
- Other: $473.68 (10.5%)`,
  },
]

export function DemoChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">AI Chat</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask questions about your transactions and finances
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {demoMessages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            disabled
            placeholder="Chat is disabled in demo mode"
            className="flex-1 rounded-lg border bg-muted px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
          />
          <button
            disabled
            className="rounded-lg bg-primary/50 px-4 py-2 text-sm text-primary-foreground cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
