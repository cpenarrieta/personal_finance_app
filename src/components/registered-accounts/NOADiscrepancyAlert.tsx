"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface NOADiscrepancyAlertProps {
  person: "self" | "spouse"
  accountType: "RRSP" | "TFSA" | "RESP"
  taxYear: number
}

export function NOADiscrepancyAlert({ person, accountType, taxYear }: NOADiscrepancyAlertProps) {
  const discrepancy = useQuery(api.registeredAccounts.checkNOADiscrepancyQuery, {
    person,
    accountType,
    taxYear,
  })

  if (!discrepancy || !discrepancy.hasDiscrepancy) return null

  return (
    <Alert variant="destructive" className="mt-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>NOA Discrepancy</AlertTitle>
      <AlertDescription>
        Calculated room: {formatCurrency(discrepancy.calculatedRoom)} vs NOA: {formatCurrency(discrepancy.noaRoom)}.
        Difference: {formatCurrency(discrepancy.difference)}.
      </AlertDescription>
    </Alert>
  )
}
