import { openai } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { z } from "zod"

export const noaExtractionSchema = z.object({
  taxYear: z.number().describe("The tax year this NOA covers"),
  earnedIncome: z
    .number()
    .nullable()
    .describe("Total earned income (employment + self-employment). Null if not found."),
  rrspDeductionLimit: z.number().nullable().describe("RRSP deduction limit for next year. Null if not found."),
  unusedRrspContributions: z
    .number()
    .nullable()
    .describe("Unused RRSP contributions carried forward. Null if not found."),
  tfsaRoom: z.number().nullable().describe("TFSA contribution room. Null if not found."),
  confidence: z.number().min(0).max(100).describe("Confidence in extraction accuracy (0-100)"),
})

export type NoaExtractionResult = z.infer<typeof noaExtractionSchema>

export async function extractNoaData(pdfUrl: string): Promise<NoaExtractionResult> {
  const result = await generateText({
    model: openai("gpt-5-mini"),
    output: Output.object({ schema: noaExtractionSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an expert at reading Canadian CRA Notice of Assessment (NOA) documents.

Extract the following fields from this NOA PDF. Return null for any field you cannot find or are unsure about.

Key fields to look for:
- **Tax Year**: The taxation year this assessment covers
- **Earned Income**: Total income from employment, self-employment (line 15000 or similar)
- **RRSP Deduction Limit**: Your RRSP/PRPP deduction limit for the following year (often stated as "Your RRSP/PRPP deduction limit for [year] is $X")
- **Unused RRSP Contributions**: Previously unused RRSP contributions available
- **TFSA Room**: Available TFSA contribution room (if mentioned)

Set confidence based on how clearly these values appear in the document. If the document is unclear, set low confidence.`,
          },
          {
            type: "file",
            data: new URL(pdfUrl),
            mediaType: "application/pdf",
          },
        ],
      },
    ],
  })

  if (!result.output) throw new Error("Failed to extract structured data from NOA")
  return result.output
}
