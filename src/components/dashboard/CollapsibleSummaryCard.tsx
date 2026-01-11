"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sparkles, ChevronDown } from "lucide-react"

interface CollapsibleSummaryCardProps {
  summary: string
  timeAgo: string
}

export function CollapsibleSummaryCard({ summary, timeAgo }: CollapsibleSummaryCardProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Weekly Insights</CardTitle>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <CollapsibleTrigger asChild>
              <button className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
                />
              </button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{summary}</div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
