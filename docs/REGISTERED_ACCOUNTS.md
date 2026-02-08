# Registered Accounts

Track RRSP, TFSA, and RESP contribution room, detect over-contributions, estimate penalties, and manage CESG grants — all in real-time via Convex.

## Overview

Canadian registered accounts have strict contribution limits enforced by the CRA. Going over triggers a 1% monthly penalty on the excess. This module tracks every contribution/withdrawal, calculates remaining room, and warns before you cross the line.

**Supported account types:**

| Type | Room Source | Penalty Buffer | Shared Pool |
|------|-----------|---------------|-------------|
| TFSA | Annual limits (2009+) + restored withdrawals | None | Per person |
| RRSP | 18% of earned income or NOA deduction limit | $2,000 | Per contributor |
| RESP | $50,000 lifetime per beneficiary | None | Per beneficiary |

## Pages

### `/registered-accounts` — Summary

Groups all accounts by type (RRSP, TFSA, RESP). Each card shows:

- Account name, type badge, owner badge (Self/Spouse)
- Progress bar (green < 90%, amber 90-100%, red > 100%)
- Remaining room in large text
- Over-contribution badge if applicable
- CESG progress for RESP accounts
- Beneficiary name for RESP

**Empty state:** "Set Up Accounts" button seeds 5 defaults (My RRSP, Spousal RRSP, Spouse RRSP, My TFSA, Spouse TFSA).

**Add Account button:** Appears when beneficiaries exist. Creates new accounts of any type (RESP requires a linked beneficiary).

### `/registered-accounts/[accountId]` — Account Detail

Full detail view for a single account:

- **Room Breakdown** — type-specific stats (see below)
- **Over-Contribution Alert** — red banner when over limit, amber when within RRSP $2K buffer
- **CESG Summary** — RESP only: lifetime/annual grants, carry-forward room, eligibility status
- **Penalty Table** — collapsible month-by-month breakdown (excess amount + 1% penalty per month)
- **Transactions** — full list with add/edit/delete. Each transaction has type, amount, date, tax year, notes
- **Account Settings** — edit name, notes, room start year (TFSA), beneficiary (RESP)

### `/registered-accounts/tax-data` — Tax Data Snapshots

Tabbed by Self / Spouse. Each snapshot captures CRA data for a tax year:

- **RRSP snapshots:** earned income, NOA deduction limit
- **TFSA snapshots:** CRA room as of Jan 1

After saving an RRSP snapshot with an NOA deduction limit, a discrepancy alert shows if the calculated room differs from the CRA-reported amount.

### `/registered-accounts/beneficiaries` — Beneficiary Management

CRUD for RESP beneficiaries. Each card shows name, date of birth, calculated age, and notes. Deletion is blocked if a RESP account is linked.

## Room Calculations

### TFSA

```
room = sum(annual_limits[startYear..currentYear])
      - total_contributions
      + restored_withdrawals
```

- Annual limits: $5,000 (2009-2012), $5,500 (2013-2014), $10,000 (2015), $5,500 (2016-2018), $6,000 (2019-2022), $6,500 (2023), $7,000 (2024-2026)
- Withdrawals restore room on Jan 1 of the following year
- **CRA sync point:** If a TFSA snapshot has `craRoomAsOfJan1`, calculation starts from that point instead of from scratch
- No buffer — any over-contribution triggers 1% monthly penalty immediately

### RRSP

```
deductionLimit = sum(18% of earned_income per year, capped at annual max)
               + unused_room_carried_forward
remainingRoom = deductionLimit - total_contributions
```

- Annual deduction limits: $21,000 (2009) to $33,810 (2026)
- **$2,000 buffer:** Over-contributions up to $2,000 above the limit incur no penalty. Beyond that, 1% monthly penalty applies.
- **NOA priority:** If an NOA deduction limit snapshot exists, it overrides the earned-income calculation
- **Shared pool:** All RRSP accounts for the same contributor share a single room pool
- **Spousal RRSP:** The contributor's room is used (not the owner's). 3-year attribution rule on withdrawals.

### RESP

```
remainingRoom = $50,000 - total_contributions (per beneficiary)
```

- Lifetime limit: $50,000 per beneficiary across all RESP accounts
- No annual limit, no penalty buffer
- Over-contributions incur penalties

### CESG (Canada Education Savings Grant)

The government matches 20% of RESP contributions up to $2,500/year = **$500/year max**.

- **Lifetime max:** $7,200 per beneficiary
- **Carry-forward:** Unused grant room accumulates. With carry-forward, up to $1,000/year (on $5,000 contributions)
- **Eligibility:** Beneficiary must be under 18 (age 17 at year-end)
- Grant transactions are tracked separately from contributions

## Data Model

### Tables

| Table | Purpose |
|-------|---------|
| `registeredAccounts` | Account records (name, type, owner, contributor, beneficiary link) |
| `registeredTransactions` | Contributions, withdrawals, grants (amount, date, tax year) |
| `taxYearSnapshots` | CRA/NOA data per person per year (earned income, deduction limits, room) |
| `respBeneficiaries` | Children linked to RESP accounts (name, DOB) |

### Key Relationships

- RRSP room is shared across all accounts with the same `contributor`
- RESP room is shared across all accounts with the same `beneficiaryId`
- TFSA room is per-account (based on `roomStartYear`)
- Tax snapshots are keyed by `(person, accountType, taxYear)`

## Backend API

### Queries

| Query | Args | Returns |
|-------|------|---------|
| `getSummary` | — | All accounts with calculated room |
| `getAccountWithRoom` | `accountId` | Single account + room + transactions |
| `getOverContributionPenalties` | `accountId` | Monthly penalty breakdown (RRSP/TFSA) |
| `getSnapshots` | `person` | Tax year snapshots for self or spouse |
| `getBeneficiaries` | — | All RESP beneficiaries |
| `checkNOADiscrepancyQuery` | `person, accountType, taxYear` | Calculated vs NOA room comparison |

### Mutations

| Mutation | Purpose |
|----------|---------|
| `seedAccounts` | Create 5 default RRSP/TFSA accounts |
| `addAccount` | Create new account (RESP requires beneficiary) |
| `deleteAccount` | Delete account + all its transactions |
| `updateAccount` | Edit name, notes, start year, beneficiary |
| `addTransaction` | Record contribution/withdrawal/grant |
| `updateTransaction` | Edit existing transaction |
| `deleteTransaction` | Remove transaction |
| `upsertSnapshot` | Add or update tax year data |
| `deleteSnapshot` | Remove tax year snapshot |
| `addBeneficiary` | Create RESP beneficiary |
| `updateBeneficiary` | Edit beneficiary details |
| `deleteBeneficiary` | Remove (blocked if linked to account) |

## Components

```
src/components/registered-accounts/
  RegisteredAccountsSummary.tsx   # Overview page content
  AccountSummaryCard.tsx          # Card per account with room bar
  RoomProgressBar.tsx             # Reusable progress bar (green/amber/red)
  EmptyState.tsx                  # Seed accounts onboarding
  AddAccountDialog.tsx            # Create new account form
  AccountDetail.tsx               # Detail page orchestrator
  RoomBreakdownCard.tsx           # Type-specific room stats
  CESGSummaryCard.tsx             # CESG grant details (RESP)
  OverContributionAlert.tsx       # Red/amber warning banners
  PenaltyTable.tsx                # Collapsible monthly penalties
  TransactionTable.tsx            # Transaction list with actions
  AddTransactionDialog.tsx        # Add transaction form
  EditTransactionDialog.tsx       # Edit transaction form
  AccountSettingsSheet.tsx        # Account settings side panel
  BeneficiaryManager.tsx          # Beneficiary CRUD
  BeneficiaryForm.tsx             # Add/edit beneficiary dialog
  TaxDataManager.tsx              # Tax snapshot CRUD with tabs
  SnapshotForm.tsx                # Add/edit snapshot dialog
  NOADiscrepancyAlert.tsx         # Calculated vs NOA mismatch
```
