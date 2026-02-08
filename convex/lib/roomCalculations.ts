import {
  TFSA_ANNUAL_LIMITS,
  RRSP_ANNUAL_LIMITS,
  RRSP_OVERCONTRIBUTION_BUFFER,
  OVERCONTRIBUTION_PENALTY_RATE,
  SPOUSAL_ATTRIBUTION_YEARS,
  RESP_LIFETIME_LIMIT,
  CESG_MATCH_RATE,
  CESG_ELIGIBLE_ANNUAL_CONTRIBUTION,
  CESG_ANNUAL_MAX,
  CESG_LIFETIME_MAX,
  CESG_ANNUAL_MAX_WITH_CARRYFORWARD,
  CESG_ELIGIBLE_WITH_CARRYFORWARD,
  CESG_MAX_AGE,
} from "./registeredAccountConstants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Person = "self" | "spouse"
export type AccountType = "RRSP" | "TFSA" | "RESP"

export interface Transaction {
  type: "contribution" | "withdrawal" | "grant"
  amount: number // always positive
  date: string // YYYY-MM-DD
  taxYear: number
  registeredAccountId: string
}

export interface TaxYearSnapshot {
  person: Person
  accountType: AccountType
  taxYear: number
  earnedIncome?: number
  noaDeductionLimit?: number
  craRoomAsOfJan1?: number
}

// ---------------------------------------------------------------------------
// TFSA Room
// ---------------------------------------------------------------------------

export interface TFSARoomResult {
  totalRoom: number
  totalContributions: number
  restoredWithdrawals: number
  currentYearWithdrawals: number
  remainingRoom: number
  overContributionAmount: number
}

/**
 * Calculate TFSA room from scratch (no CRA sync point).
 * room = sum(limits[startYear..currentYear]) - contributions + restored withdrawals
 * Withdrawals are restored on Jan 1 of the following year.
 */
export function calculateTFSARoom(
  startYear: number,
  currentYear: number,
  transactions: Transaction[],
  snapshots: TaxYearSnapshot[],
): TFSARoomResult {
  // Check for CRA sync point — use the latest one
  const craSnapshot = snapshots
    .filter((s) => s.accountType === "TFSA" && s.craRoomAsOfJan1 != null)
    .sort((a, b) => b.taxYear - a.taxYear)[0]

  if (craSnapshot && craSnapshot.craRoomAsOfJan1 != null) {
    return calculateTFSARoomFromCRA(craSnapshot, currentYear, transactions)
  }

  // From scratch
  let totalRoom = 0
  for (let y = startYear; y <= currentYear; y++) {
    totalRoom += TFSA_ANNUAL_LIMITS[y] ?? 0
  }

  const totalContributions = transactions.filter((t) => t.type === "contribution").reduce((sum, t) => sum + t.amount, 0)

  // Withdrawals from prior years are restored Jan 1 next year
  const restoredWithdrawals = transactions
    .filter((t) => t.type === "withdrawal" && getYear(t.date) < currentYear)
    .reduce((sum, t) => sum + t.amount, 0)

  const currentYearWithdrawals = transactions
    .filter((t) => t.type === "withdrawal" && getYear(t.date) === currentYear)
    .reduce((sum, t) => sum + t.amount, 0)

  const remainingRoom = totalRoom - totalContributions + restoredWithdrawals
  const overContributionAmount = Math.max(0, -remainingRoom)

  return {
    totalRoom,
    totalContributions,
    restoredWithdrawals,
    currentYearWithdrawals,
    remainingRoom,
    overContributionAmount,
  }
}

function calculateTFSARoomFromCRA(
  craSnapshot: TaxYearSnapshot,
  currentYear: number,
  transactions: Transaction[],
): TFSARoomResult {
  const syncYear = craSnapshot.taxYear
  let room = craSnapshot.craRoomAsOfJan1!

  // Add annual limits from syncYear onward (CRA room is as of Jan 1, so
  // the limit for syncYear is already accounted for in the CRA figure)
  for (let y = syncYear + 1; y <= currentYear; y++) {
    room += TFSA_ANNUAL_LIMITS[y] ?? 0
  }

  // Subtract contributions since Jan 1 of sync year
  const contributionsSinceSync = transactions
    .filter((t) => t.type === "contribution" && getYear(t.date) >= syncYear)
    .reduce((sum, t) => sum + t.amount, 0)

  // Add back restored withdrawals from years >= syncYear but < currentYear
  const restoredWithdrawals = transactions
    .filter((t) => t.type === "withdrawal" && getYear(t.date) >= syncYear && getYear(t.date) < currentYear)
    .reduce((sum, t) => sum + t.amount, 0)

  const currentYearWithdrawals = transactions
    .filter((t) => t.type === "withdrawal" && getYear(t.date) === currentYear)
    .reduce((sum, t) => sum + t.amount, 0)

  // Total contributions = all ever (for display)
  const totalContributions = transactions.filter((t) => t.type === "contribution").reduce((sum, t) => sum + t.amount, 0)

  const totalRestoredWithdrawals = transactions
    .filter((t) => t.type === "withdrawal" && getYear(t.date) < currentYear)
    .reduce((sum, t) => sum + t.amount, 0)

  const remainingRoom = room - contributionsSinceSync + restoredWithdrawals
  const overContributionAmount = Math.max(0, -remainingRoom)

  // For display: approximate totalRoom
  const totalRoom = remainingRoom + totalContributions - totalRestoredWithdrawals

  return {
    totalRoom,
    totalContributions,
    restoredWithdrawals: totalRestoredWithdrawals,
    currentYearWithdrawals,
    remainingRoom,
    overContributionAmount,
  }
}

// ---------------------------------------------------------------------------
// RRSP Room
// ---------------------------------------------------------------------------

export interface RRSPRoomResult {
  deductionLimit: number
  unusedRoom: number
  totalContributions: number
  remainingRoom: number
  overContributionAmount: number
  withinBuffer: boolean
}

/**
 * Calculate RRSP room. Contributions across ALL accounts sharing this
 * contributor's room pool must be passed in.
 *
 * NOA-based: noaDeductionLimit for taxYear X = deduction limit for year X+1.
 * Then add new room for subsequent years from earned income.
 *
 * No-NOA fallback: build year-by-year from earned income history.
 */
export function calculateRRSPRoom(
  currentYear: number,
  transactions: Transaction[], // all contributions sharing this room pool
  snapshots: TaxYearSnapshot[],
): RRSPRoomResult {
  const rrspSnapshots = snapshots.filter((s) => s.accountType === "RRSP").sort((a, b) => a.taxYear - b.taxYear)

  // Find latest NOA snapshot
  const noaSnapshot = [...rrspSnapshots]
    .filter((s) => s.noaDeductionLimit != null)
    .sort((a, b) => b.taxYear - a.taxYear)[0]

  let deductionLimit: number

  if (noaSnapshot && noaSnapshot.noaDeductionLimit != null) {
    // NOA for tax year X gives deduction limit for year X+1
    const baseYear = noaSnapshot.taxYear + 1
    deductionLimit = noaSnapshot.noaDeductionLimit

    // Add new room for subsequent years
    for (let y = baseYear; y <= currentYear; y++) {
      const priorYearSnapshot = rrspSnapshots.find((s) => s.taxYear === y - 1)
      const earnedIncome = priorYearSnapshot?.earnedIncome
      if (earnedIncome != null) {
        const newRoom = Math.min(earnedIncome * 0.18, RRSP_ANNUAL_LIMITS[y] ?? 0)
        deductionLimit += newRoom
      }
    }

    // Subtract contributions for taxYear >= baseYear
    const contributionsSince = transactions
      .filter((t) => t.type === "contribution" && t.taxYear >= baseYear)
      .reduce((sum, t) => sum + t.amount, 0)

    deductionLimit -= contributionsSince
  } else {
    // No NOA: build from scratch using earned income
    deductionLimit = 0
    for (const snap of rrspSnapshots) {
      if (snap.earnedIncome != null) {
        const roomYear = snap.taxYear + 1
        if (roomYear <= currentYear) {
          const newRoom = Math.min(snap.earnedIncome * 0.18, RRSP_ANNUAL_LIMITS[roomYear] ?? 0)
          deductionLimit += newRoom
        }
      }
    }

    // Subtract all contributions
    const totalContrib = transactions.filter((t) => t.type === "contribution").reduce((sum, t) => sum + t.amount, 0)
    deductionLimit -= totalContrib
  }

  const totalContributions = transactions.filter((t) => t.type === "contribution").reduce((sum, t) => sum + t.amount, 0)

  const remainingRoom = deductionLimit
  const rawExcess = Math.max(0, -remainingRoom)
  const overContributionAmount = Math.max(0, rawExcess - RRSP_OVERCONTRIBUTION_BUFFER)
  const withinBuffer = rawExcess > 0 && rawExcess <= RRSP_OVERCONTRIBUTION_BUFFER

  return {
    deductionLimit: deductionLimit + totalContributions, // original limit before contributions
    unusedRoom: Math.max(0, remainingRoom),
    totalContributions,
    remainingRoom,
    overContributionAmount,
    withinBuffer,
  }
}

// ---------------------------------------------------------------------------
// Over-Contribution Penalties (monthly)
// ---------------------------------------------------------------------------

export interface MonthlyPenalty {
  year: number
  month: number // 1-12
  excessAmount: number
  penalty: number
}

/**
 * Calculate month-by-month over-contribution penalties for TFSA.
 * No buffer. Penalty = 1% of highest excess in that month.
 */
export function calculateTFSAPenalties(
  startYear: number,
  currentYear: number,
  transactions: Transaction[],
  _snapshots: TaxYearSnapshot[],
): MonthlyPenalty[] {
  const penalties: MonthlyPenalty[] = []
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return penalties

  const firstTxYear = getYear(sorted[0]!.date)
  const startCalcYear = Math.max(startYear, firstTxYear)

  for (let year = startCalcYear; year <= currentYear; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === currentYear && month > getCurrentMonth()) break

      // Room at end of this month
      const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`

      // Cumulative limits
      let totalRoom = 0
      for (let y = startYear; y <= year; y++) {
        totalRoom += TFSA_ANNUAL_LIMITS[y] ?? 0
      }

      // Contributions up to end of month
      const contribs = sorted
        .filter((t) => t.type === "contribution" && t.date <= endOfMonth)
        .reduce((sum, t) => sum + t.amount, 0)

      // Restored withdrawals (from years before this year)
      const restored = sorted
        .filter((t) => t.type === "withdrawal" && getYear(t.date) < year)
        .reduce((sum, t) => sum + t.amount, 0)

      const room = totalRoom - contribs + restored
      const excess = Math.max(0, -room)

      if (excess > 0) {
        penalties.push({
          year,
          month,
          excessAmount: excess,
          penalty: Math.round(excess * OVERCONTRIBUTION_PENALTY_RATE * 100) / 100,
        })
      }
    }
  }

  return penalties
}

/**
 * Calculate month-by-month over-contribution penalties for RRSP.
 * $2,000 buffer applies. Penalty = 1% of excess beyond buffer at end of each month.
 */
export function calculateRRSPPenalties(
  currentYear: number,
  transactions: Transaction[],
  snapshots: TaxYearSnapshot[],
): MonthlyPenalty[] {
  const penalties: MonthlyPenalty[] = []
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return penalties

  const rrspSnapshots = snapshots.filter((s) => s.accountType === "RRSP").sort((a, b) => a.taxYear - b.taxYear)

  const firstTxYear = getYear(sorted[0]!.date)

  for (let year = firstTxYear; year <= currentYear; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === currentYear && month > getCurrentMonth()) break

      const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`

      // Build room up to this point
      let deductionLimit = 0

      // Find latest NOA before or at this year
      const relevantNOA = [...rrspSnapshots]
        .filter((s) => s.noaDeductionLimit != null && s.taxYear + 1 <= year)
        .sort((a, b) => b.taxYear - a.taxYear)[0]

      if (relevantNOA && relevantNOA.noaDeductionLimit != null) {
        const baseYear = relevantNOA.taxYear + 1
        deductionLimit = relevantNOA.noaDeductionLimit
        for (let y = baseYear; y <= year; y++) {
          const priorSnap = rrspSnapshots.find((s) => s.taxYear === y - 1)
          if (priorSnap?.earnedIncome != null) {
            deductionLimit += Math.min(priorSnap.earnedIncome * 0.18, RRSP_ANNUAL_LIMITS[y] ?? 0)
          }
        }
      } else {
        for (const snap of rrspSnapshots) {
          if (snap.earnedIncome != null) {
            const roomYear = snap.taxYear + 1
            if (roomYear <= year) {
              deductionLimit += Math.min(snap.earnedIncome * 0.18, RRSP_ANNUAL_LIMITS[roomYear] ?? 0)
            }
          }
        }
      }

      // Contributions up to this month
      const contribs = sorted
        .filter((t) => t.type === "contribution" && t.date <= endOfMonth)
        .reduce((sum, t) => sum + t.amount, 0)

      const room = deductionLimit - contribs
      const rawExcess = Math.max(0, -room)
      const excess = Math.max(0, rawExcess - RRSP_OVERCONTRIBUTION_BUFFER)

      if (excess > 0) {
        penalties.push({
          year,
          month,
          excessAmount: excess,
          penalty: Math.round(excess * OVERCONTRIBUTION_PENALTY_RATE * 100) / 100,
        })
      }
    }
  }

  return penalties
}

// ---------------------------------------------------------------------------
// Spousal Attribution (3-Year Rule)
// ---------------------------------------------------------------------------

export interface SpousalAttributionResult {
  attributedToContributor: number
  attributedToOwner: number
  totalWithdrawal: number
  contributionsInWindow: number
}

/**
 * For a withdrawal from a spousal RRSP, determine how much is attributed
 * to the contributor's income vs the owner's.
 *
 * If the contributor made ANY contribution to the spousal RRSP in the
 * withdrawal year or 2 preceding calendar years, withdrawal is attributed
 * to contributor up to the amount contributed in that window.
 */
export function calculateSpousalAttribution(
  withdrawalDate: string,
  withdrawalAmount: number,
  spousalContributions: Transaction[], // contributions to THIS spousal RRSP account
): SpousalAttributionResult {
  const withdrawalYear = getYear(withdrawalDate)
  const windowStart = withdrawalYear - (SPOUSAL_ATTRIBUTION_YEARS - 1)

  const contributionsInWindow = spousalContributions
    .filter((t) => t.type === "contribution" && getYear(t.date) >= windowStart && getYear(t.date) <= withdrawalYear)
    .reduce((sum, t) => sum + t.amount, 0)

  const attributedToContributor = Math.min(withdrawalAmount, contributionsInWindow)
  const attributedToOwner = withdrawalAmount - attributedToContributor

  return {
    attributedToContributor,
    attributedToOwner,
    totalWithdrawal: withdrawalAmount,
    contributionsInWindow,
  }
}

// ---------------------------------------------------------------------------
// NOA Discrepancy Detection
// ---------------------------------------------------------------------------

export interface NOADiscrepancy {
  calculatedRoom: number
  noaRoom: number
  difference: number
  hasDiscrepancy: boolean
}

/**
 * Compare calculated RRSP room vs NOA-reported deduction limit.
 * Flag if difference > $1.
 */
export function checkNOADiscrepancy(noaDeductionLimit: number, calculatedDeductionLimit: number): NOADiscrepancy {
  const difference = Math.abs(calculatedDeductionLimit - noaDeductionLimit)
  return {
    calculatedRoom: calculatedDeductionLimit,
    noaRoom: noaDeductionLimit,
    difference,
    hasDiscrepancy: difference > 1,
  }
}

// ---------------------------------------------------------------------------
// RESP Room & CESG
// ---------------------------------------------------------------------------

export interface RESPRoomResult {
  lifetimeLimit: number
  totalContributions: number
  remainingRoom: number
  overContributionAmount: number
  totalGrants: number
  cesgSummary: CESGSummary
}

export interface CESGSummary {
  totalCESGReceived: number
  lifetimeMax: number
  remainingLifetimeCESG: number
  currentYearCESG: number
  currentYearMax: number
  carryForwardRoom: number
  eligibleForCESG: boolean // false if beneficiary >= 18
}

/**
 * Calculate RESP room for a single beneficiary.
 *
 * All RESP accounts linked to this beneficiary contribute to the same
 * $50,000 lifetime limit. CESG is per beneficiary.
 *
 * @param beneficiaryDOB - "YYYY-MM-DD" date of birth
 * @param currentYear - current calendar year
 * @param transactions - ALL transactions across all RESP accounts for this beneficiary
 */
export function calculateRESPRoom(
  beneficiaryDOB: string,
  currentYear: number,
  transactions: Transaction[],
): RESPRoomResult {
  const totalContributions = transactions.filter((t) => t.type === "contribution").reduce((sum, t) => sum + t.amount, 0)

  const totalGrants = transactions.filter((t) => t.type === "grant").reduce((sum, t) => sum + t.amount, 0)

  const remainingRoom = RESP_LIFETIME_LIMIT - totalContributions
  const overContributionAmount = Math.max(0, -remainingRoom)

  const cesgSummary = calculateCESGSummary(beneficiaryDOB, currentYear, transactions)

  return {
    lifetimeLimit: RESP_LIFETIME_LIMIT,
    totalContributions,
    remainingRoom: Math.max(0, remainingRoom),
    overContributionAmount,
    totalGrants,
    cesgSummary,
  }
}

/**
 * Calculate CESG details for a beneficiary.
 *
 * Basic CESG: 20% on first $2,500/year = $500/year max.
 * Unused CESG room carries forward. When catching up, max $1,000 CESG/year
 * (on $5,000 contributions).
 * Lifetime max: $7,200 per beneficiary.
 * Eligible until end of year beneficiary turns 17.
 */
function calculateCESGSummary(beneficiaryDOB: string, currentYear: number, transactions: Transaction[]): CESGSummary {
  const birthYear = getYear(beneficiaryDOB)
  const ageEndOfYear = currentYear - birthYear
  const eligibleForCESG = ageEndOfYear <= CESG_MAX_AGE

  const totalCESGReceived = transactions.filter((t) => t.type === "grant").reduce((sum, t) => sum + t.amount, 0)

  const remainingLifetimeCESG = Math.max(0, CESG_LIFETIME_MAX - totalCESGReceived)

  // CESG eligibility starts the year the child is born (or the year after
  // the SIN is obtained, but we simplify to birth year)
  const cesgStartYear = birthYear

  // Calculate carry-forward: unused CESG room from prior years
  // Each year from cesgStartYear, the beneficiary gets $500 of CESG room
  let accumulatedCESGRoom = 0
  for (let y = cesgStartYear; y <= currentYear; y++) {
    const ageAtEndOfYear = y - birthYear
    if (ageAtEndOfYear > CESG_MAX_AGE) break

    // Add this year's CESG room ($500)
    accumulatedCESGRoom += CESG_ANNUAL_MAX

    // Subtract CESG actually received this year
    const cesgThisYear = transactions
      .filter((t) => t.type === "grant" && getYear(t.date) === y)
      .reduce((sum, t) => sum + t.amount, 0)
    accumulatedCESGRoom -= cesgThisYear
  }
  // Can't exceed lifetime max
  accumulatedCESGRoom = Math.min(accumulatedCESGRoom, remainingLifetimeCESG)

  // Current year CESG received
  const currentYearCESG = transactions
    .filter((t) => t.type === "grant" && getYear(t.date) === currentYear)
    .reduce((sum, t) => sum + t.amount, 0)

  // Current year max: normally $500 but $1,000 if there's carry-forward room
  const hasCarryForward = accumulatedCESGRoom > CESG_ANNUAL_MAX
  const currentYearMax = eligibleForCESG
    ? Math.min(hasCarryForward ? CESG_ANNUAL_MAX_WITH_CARRYFORWARD : CESG_ANNUAL_MAX, remainingLifetimeCESG)
    : 0

  // Carry-forward room is the accumulated room minus current year's allocation
  const carryForwardRoom = Math.max(0, accumulatedCESGRoom - CESG_ANNUAL_MAX)

  return {
    totalCESGReceived,
    lifetimeMax: CESG_LIFETIME_MAX,
    remainingLifetimeCESG,
    currentYearCESG,
    currentYearMax,
    carryForwardRoom,
    eligibleForCESG,
  }
}

/**
 * Estimate CESG for a given contribution amount in the current year.
 * Useful for "if I contribute $X, how much CESG will I get?"
 */
export function estimateCESG(contributionAmount: number, cesgSummary: CESGSummary): number {
  if (!cesgSummary.eligibleForCESG) return 0

  const remainingThisYear = cesgSummary.currentYearMax - cesgSummary.currentYearCESG
  if (remainingThisYear <= 0) return 0

  // With carry-forward, up to $5,000 is eligible; otherwise $2,500
  const hasCarryForward = cesgSummary.carryForwardRoom > 0
  const eligibleContrib = hasCarryForward ? CESG_ELIGIBLE_WITH_CARRYFORWARD : CESG_ELIGIBLE_ANNUAL_CONTRIBUTION

  // How much of this contribution is CESG-eligible?
  // We need to know how much was already contributed this year for CESG purposes,
  // but we approximate from the currentYearCESG received
  const alreadyEligible = cesgSummary.currentYearCESG / CESG_MATCH_RATE
  const remainingEligible = Math.max(0, eligibleContrib - alreadyEligible)
  const eligible = Math.min(contributionAmount, remainingEligible)

  const cesg = eligible * CESG_MATCH_RATE
  return Math.min(cesg, remainingThisYear, cesgSummary.remainingLifetimeCESG)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getYear(dateStr: string): number {
  return parseInt(dateStr.substring(0, 4), 10)
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}
