// TFSA annual contribution limits by year
export const TFSA_ANNUAL_LIMITS: Record<number, number> = {
  2009: 5000,
  2010: 5000,
  2011: 5000,
  2012: 5000,
  2013: 5500,
  2014: 5500,
  2015: 10000,
  2016: 5500,
  2017: 5500,
  2018: 5500,
  2019: 6000,
  2020: 6000,
  2021: 6000,
  2022: 6000,
  2023: 6500,
  2024: 7000,
  2025: 7000,
  2026: 7000,
}

// RRSP annual deduction limits by year
export const RRSP_ANNUAL_LIMITS: Record<number, number> = {
  2009: 21000,
  2010: 22000,
  2011: 22450,
  2012: 22970,
  2013: 23820,
  2014: 24270,
  2015: 24930,
  2016: 25370,
  2017: 26010,
  2018: 26230,
  2019: 26500,
  2020: 27230,
  2021: 27830,
  2022: 29210,
  2023: 30780,
  2024: 31560,
  2025: 32490,
  2026: 33810,
}

// RRSP: $2,000 lifetime over-contribution buffer (no penalty within this)
export const RRSP_OVERCONTRIBUTION_BUFFER = 2000

// Over-contribution penalty: 1% per month on excess
export const OVERCONTRIBUTION_PENALTY_RATE = 0.01

// Spousal RRSP: withdrawals attributed to contributor if contribution
// was made in the withdrawal year or the 2 preceding calendar years
export const SPOUSAL_ATTRIBUTION_YEARS = 3

// RESP: $50,000 lifetime contribution limit per beneficiary
export const RESP_LIFETIME_LIMIT = 50000

// CESG: government matches 20% of first $2,500/year per beneficiary
export const CESG_MATCH_RATE = 0.2
export const CESG_ELIGIBLE_ANNUAL_CONTRIBUTION = 2500
export const CESG_ANNUAL_MAX = 500 // 20% * $2,500
export const CESG_LIFETIME_MAX = 7200

// CESG carry-forward: unused room accumulates (max $1,000 CESG per year
// when catching up, i.e. $5,000 in contributions eligible)
export const CESG_ANNUAL_MAX_WITH_CARRYFORWARD = 1000
export const CESG_ELIGIBLE_WITH_CARRYFORWARD = 5000

// CESG eligibility: beneficiary must be under 18 at end of year
// (special rules for ages 16-17 require contributions in prior years)
export const CESG_MAX_AGE = 17

// RESP plan must close by 35th anniversary of opening (or 40th for
// beneficiary eligible for DTC). We use 35 as default.
export const RESP_MAX_PLAN_YEARS = 35
