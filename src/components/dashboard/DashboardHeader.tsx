"use client"

import { format } from "date-fns"
import { Sun, Moon, Sunset, CloudSun } from "lucide-react"

interface DashboardHeaderProps {
  userName?: string
}

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return {
      text: "Good morning",
      icon: <Sun className="h-6 w-6 text-amber-500" />,
    }
  } else if (hour >= 12 && hour < 17) {
    return {
      text: "Good afternoon",
      icon: <CloudSun className="h-6 w-6 text-orange-500" />,
    }
  } else if (hour >= 17 && hour < 21) {
    return {
      text: "Good evening",
      icon: <Sunset className="h-6 w-6 text-rose-500" />,
    }
  } else {
    return {
      text: "Good night",
      icon: <Moon className="h-6 w-6 text-indigo-400" />,
    }
  }
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const { text, icon } = getGreeting()
  const today = format(new Date(), "EEEE, MMMM d, yyyy")

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {text}
            {userName && <span className="text-muted-foreground font-normal">, {userName}</span>}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>
    </div>
  )
}
