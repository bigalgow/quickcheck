# RetirePlan QuickCheck - User Flow Guide

This document describes the complete user journey through the RetirePlan QuickCheck application. Use this as a reference when writing user-facing documentation, help content, or playbook materials.

---

## Application Overview

RetirePlan QuickCheck is a **10-module wizard** that guides users step-by-step through retirement planning. Users can:

- Complete the entire journey without signing in (data saves locally)
- Sign in at any point to sync data to the cloud
- Jump between modules freely
- Return later and continue where they left off

**Routes:**
- `/` - Welcome page (landing + progress overview)
- `/wizard?module=N` - Wizard containing Modules 1-10

---

## The Welcome Page (`/`)

### What Users See

The Welcome page serves as the application's front door. It displays:

1. **Hero Section**
   - "Welcome to Your Retirement Journey"
   - "Plan your retirement in 10 simple steps"

2. **Primary Card: Start/Continue Planning**
   - Shows "START HERE" badge if this is a new user
   - Shows "Continue Your Plan" if user has prior progress
   - Displays progress indicator: "X of 10 modules completed (XX%)"
   - Button: "Start Planning →" or "Continue Planning →"

3. **Secondary Card: Quick Navigation**
   - Collapsible dropdown listing all 10 modules
   - Each module shows: icon, title, brief description
   - Completion status: green checkmark (done), gray dot (in progress), empty (not started)
   - Users can jump directly to any module

4. **WizardSaveBar** (top of page)
   - "Login to sync" button if not signed in
   - Account menu with sync options if signed in

### Guest vs Authenticated Users

| Capability | Guest | Signed In |
|------------|-------|-----------|
| Complete all 10 modules | ✓ | ✓ |
| Data saves locally | ✓ | ✓ |
| Data syncs to cloud | ✗ | ✓ |
| Access from multiple devices | ✗ | ✓ |
| Export/Import backup | ✓ | ✓ |

### Smart Sync (When User Signs In)

When a user signs in, the app intelligently handles data:

| Scenario | What Happens |
|----------|--------------|
| No cloud data, no local data | Fresh start |
| No cloud data, has local data | Shows "Ready to save" |
| Has cloud data, no local data | Auto-loads from cloud |
| Both exist, cloud is newer | Auto-loads from cloud |
| Both exist, local is newer | Shows "Ready to save" |
| Both timestamps match | Shows "Already synced" |

---

## Module 1: Core Assumptions

**Purpose:** Establish the foundational parameters for all calculations.

### Required Inputs

1. **Date of Birth** (date picker)
   - Shows calculated current age below the field
   - Essential for calculating years to retirement

2. **Planned Retirement Age** (number)
   - If equal to or below current age: Shows info message that calculator treats user as already retired
   - Used to calculate contribution years remaining

3. **Tax Region** (dropdown)
   - "England, Wales, or Northern Ireland"
   - "Scotland" (different tax bands)

### Optional Inputs with Defaults

4. **Expected State Pension** (annual amount)
   - Default: £11,973 (2025/26 full new state pension)
   - Tip shows weekly equivalent (£230.25/week)

5. **Assumed Inflation Rate** (percentage)
   - Default: 2.5%
   - Based on Bank of England's long-term target

### Validation

- Cannot proceed until all required fields are completed
- Shows amber warning: "Please complete all required fields (*) before continuing"
- Valid state enables blue "Continue" button

---

## Module 2: Lifestyle Baseline

**Purpose:** Help users determine how much annual income they'll need in retirement.

### Two Methods Available

#### Method 1: PLSA Benchmarks (Recommended)

The Pension and Lifetime Savings Association publishes research-backed spending benchmarks.

**Step 1: Household Type**
- Solo
- Couple

**Step 2: PLSA Tier**
| Tier | Solo | Couple |
|------|------|--------|
| Minimum | £14,400 | £22,400 |
| Moderate | £31,300 | £43,100 |
| Comfortable | £43,100 | £59,000 |

**Step 3: Housing Arrangement**
- None (no housing costs in retirement)
- Rent (enter annual rent amount)
- Mortgage (enter annual payment + age when paid off)

**Final Calculation:** PLSA amount + housing costs = baseline annual spend

#### Method 2: Custom Amount

Users can bypass PLSA and enter their own annual spend figure directly.

### What This Sets

The baseline amount becomes the target annual spending used throughout all calculations and projections.

---

## Module 3: DC Pensions

**Purpose:** Capture Defined Contribution (money purchase) pension details.

### What Are DC Pensions?

Explain to users: "DC pensions are pots of money you've saved. The amount you receive depends on how much is in the pot and how you choose to draw it down."

### Inputs

1. **Current DC Pot Total** (£)
   - Can use helper wizard to add multiple smaller pots
   - Enter total value across all DC schemes

2. **Contributions** (if still working)
   - Current salary
   - Employee contribution %
   - Employer contribution %
   - Or: Personal annual contribution amount

3. **At-Retirement Choices**
   - Take 25% tax-free cash (PCLS)? Yes/No
   - DC Drawdown Rate: Default 4%
   - Annuitise any portion? (0-100%)
   - Annuity rate: Default 6%

### Key Concepts to Explain

- **PCLS:** Pension Commencement Lump Sum - 25% tax-free cash available from pension
- **Drawdown:** Taking income while pot remains invested
- **Annuity:** Converting pot to guaranteed income for life
- **4% Rule:** Sustainable withdrawal rate (guideline, not guarantee)

### Career Break Option

> **Planning a career break?** (collapsible section)
>
> If you're planning time away from work (childcare, travel, sabbatical), you can model this:
> - Enter the age when your break starts
> - Enter the age when you return to work
> - Contributions pause during the break; your pot continues to grow
> - Salary is assumed to continue as normal when you return

This feature is hidden by default - most users won't need it.

---

## Module 4: DB Pensions

**Purpose:** Capture Defined Benefit (final salary/career average) pension details.

### What Are DB Pensions?

Explain to users: "DB pensions promise a specific income based on your salary and years of service. Your employer bears the investment risk, not you."

### Two Scheme Types

#### Active Schemes (Still accruing)
- Accrual rate (e.g., 1/60th)
- Service years to date
- Maximum service years
- Current pensionable salary

> **Planning a career break?** (collapsible, per scheme)
>
> For active DB schemes, a career break reduces the service years you'll accrue:
> - Enter the age when your break starts
> - Enter the age when you return to work
> - Service years won't accrue during the break
> - Final salary is unaffected (based on salary at retirement)
>
> This is particularly relevant for teachers, NHS workers, and others in public sector DB schemes.

#### Deferred Schemes (Left employer, benefits frozen)
- Preserved pension amount (from Annual Benefit Statement)
- Revaluation rate assumption

> **Have a Career Average (CARE) Scheme?**
> If you have a Career Average scheme rather than Final Salary, check your Annual Benefit Statement for the "projected pension at retirement" figure. Enter this as a **Deferred scheme** rather than Active - the projection already includes your future accrual and revaluation.

### At-Retirement Choices

- Take 25% tax-free cash from DB? Yes/No
- Commutation factor: Fixed at 20:1 (£20 lump sum per £1 pension surrendered)

### Important Notes for Users

- Encourage users to reference their Annual Benefit Statement for accurate figures
- Deferred pension value should be the "projected income at retirement" figure from their statement

---

## Module 5: Savings & Investments

**Purpose:** Capture non-pension savings that will supplement retirement income.

### ISA (Individual Savings Account)

- Current value (£)
- Annual additions (£)
- Growth rate assumption: Default 3%

**Key benefit:** Tax-free growth and withdrawals

### Taxable Savings

- Current value (£)
- Annual additions (£)
- Growth rate assumption: Default 3%

**Note:** Interest on taxable savings may be subject to tax depending on total income.

---

## Module 6: Other Income

**Purpose:** Capture any additional income sources in retirement.

### Types of Other Income

- Property rental
- Dividends
- Part-time work
- Other sources

### For Each Item

- Type/category
- Description
- Annual amount (£)

---

## Module 7: At-Retirement Results

**Purpose:** Show users their projected position at the point of retirement.

### This is a Calculation Module

Users don't enter data here. The system takes all inputs from Modules 1-6 and calculates:

### What Users See

1. **Assets at Retirement**
   - Total DC pension (after PCLS if taken)
   - Total DB pension value
   - ISA balance
   - Taxable savings balance
   - **Grand total**

2. **Annual Income at Retirement**
   - DC drawdown amount
   - DC annuity income (if annuitised)
   - DB pension income
   - State pension
   - Other income
   - **Total gross income**

3. **Annual Expenses & Net Position**
   - Target annual spend (from Module 2)
   - Estimated income tax
   - **Net income after tax**
   - **Surplus or shortfall**

### Interactive Adjustments

Users can adjust sliders to see real-time impact of changing:
- Retirement age
- DC pot value
- Drawdown rate
- Inflation assumption
- Lifestyle spending

### Warnings Displayed

- If retirement age < state pension age
- If annual shortfall detected
- If PCLS exceeds £268,275 cap

### Values Shown Two Ways

- **Nominal:** Future value at retirement date
- **Real:** Today's money (inflation-adjusted)

---

## Module 8: Life Events

**Purpose:** Add significant one-off or recurring expenses/income expected during retirement.

### Suggested Events (Examples)

**Travel & Experiences**
- Bucket list trip: £15,000 one-off
- Extended travel (6+ weeks): £8,000 one-off
- Regular long-haul holidays: £5,000/year for 10 years

**Major Purchases**
- New car: £25,000 one-off
- Home improvements: £20,000 one-off

**Family Support**
- House deposit for child: £50,000 one-off
- Regular family support: £3,000/year for 10 years

**Lifestyle Upgrades**
- Club memberships
- Holiday home costs

### For Each Event

- **Age:** When it occurs
- **Name:** Description
- **Amount:** £
- **Type:** Expense or Income
- **Recurring?** Yes/No
- **If recurring:** How many years

### Why This Matters

Life events create "lumps" in the projection - years with unusually high spending that could deplete savings faster than expected.

---

## Module 9: Drawdown Sequencing

**Purpose:** Configure how assets will be drawn upon during retirement.

### Automatic Drawdown Order

The system applies this sequence each year:

1. **DC Pension Drawdown** - at the chosen percentage rate
2. **Fixed Income Streams** - DB pension, state pension, annuity income
3. **Taxable Savings** - bridge any gap between income and spending
4. **ISA Drawdown** - only if taxable savings depleted (preserves tax efficiency)
5. **ISA Building** - if surplus, can optionally invest into ISA

### User Options

1. **DC Drawdown Rate Override**
   - Can adjust from the Module 3 setting
   - May want different rate during retirement vs at retirement

2. **Annual ISA Investment**
   - Amount to invest if there's surplus income
   - Builds tax-free pot for later years

---

## Module 10: 25-Year Projection

**Purpose:** Show year-by-year view of retirement finances for 25 years.

### This is a Calculation Module

Users don't enter data here. The system projects forward using all inputs from Modules 1-9.

### What Users See

1. **Warnings Section**
   - Red alerts if any asset depletes before year 25
   - Specific year of depletion shown
   - Example: "DC pot depleted by age 78"

2. **Interactive Charts**
   - Visual representation of asset trajectories
   - Income vs spending over time

3. **Detailed Table**
   - 25 rows (year 1 to year 25 of retirement)
   - Columns include:
     - Age
     - Opening balances (DC, ISA, Taxable)
     - Income streams
     - Asset growth
     - Life events
     - Spending
     - Tax
     - Closing balances
     - Total assets

4. **Export Options**
   - Download as CSV for spreadsheet analysis
   - Print-friendly view

### Values Shown Two Ways

- **Nominal:** Future values (includes inflation)
- **Real:** Today's money (constant purchasing power)

---

## Navigation & Progress

### How Users Move Between Modules

1. **Next/Previous Buttons**
   - Standard sequential navigation
   - "Next" marks current module as complete

2. **Progress Dots**
   - 10 dots in header showing all modules
   - Click any dot to jump to that module
   - Colour indicates: complete / has data / empty

3. **Quick Navigation**
   - Dropdown on Welcome page
   - Jump directly to any module

4. **Mark Complete Button**
   - Manually mark current module done without advancing
   - Useful when reviewing earlier modules

### Completion Tracking

- Each module tracks its own completion status
- Progress shown as "X of 10 modules completed"
- Modules 7 and 10 (calculations) auto-complete when viewed

---

## Data Persistence

### Automatic Local Save

- **Every input change saves immediately** to browser storage
- User never loses work within a browser session
- Data persists across page refreshes and browser restarts

### Cloud Sync (Signed-In Users)

- **Manual save:** Click "Save to cloud" button
- **Manual load:** Use "Load from cloud" from account menu
- **Smart sync:** Automatic comparison when signing in

### Export/Import

- **Backup (to device):** Downloads JSON file
- **Restore (from device):** Uploads JSON file
- Useful for: sharing between devices, keeping offline backup, resetting and starting over

### Clear Data

- "Clear all data" option in account menu
- Resets local storage to fresh start
- Does not affect cloud-saved data

---

## Key Terms Glossary

| Term | Meaning |
|------|---------|
| DC Pension | Defined Contribution - money purchase pension pot |
| DB Pension | Defined Benefit - promised income based on salary/service |
| PCLS | Pension Commencement Lump Sum - 25% tax-free cash |
| Drawdown | Taking income while pension remains invested |
| Annuity | Converting pension pot to guaranteed lifetime income |
| ISA | Individual Savings Account - tax-free wrapper |
| PLSA | Pension and Lifetime Savings Association |
| Nominal | Future money value (includes inflation) |
| Real | Today's money (constant purchasing power) |
| Commutation | Exchanging pension income for lump sum |

---

## Common User Questions

### "Do I need to sign in?"

No. You can complete the entire 10-module journey as a guest. Your data saves locally and persists. Sign in only if you want to access your plan from multiple devices or ensure cloud backup.

### "Can I skip modules?"

Yes. Use the progress dots or Quick Navigation to jump to any module. However, Modules 7 and 10 (calculation results) need data from earlier modules to produce meaningful results.

### "What if I don't know exact figures?"

Estimates are fine. Use the interactive sliders in Module 7 to see how changes affect your results. You can always return and update figures as you get better information.

### "Is my data secure?"

Local data is stored only in your browser. Cloud data (for signed-in users) is stored securely in your account. We never share your financial information.

### "Can I have multiple plans?"

Currently, one plan per account. Use Export to save your current plan, then Clear Data to start fresh. Import previous plans to restore them.

---

## Workflow Nuances

### Already Retired Users

If retirement age ≤ current age:
- Module 1 shows informational message
- Calculator treats user as already retired
- Skips future contribution calculations
- Still provides full 25-year projection from current position

### PCLS Cap

Total tax-free cash limited to £268,275 across all pensions:
- If DC PCLS + DB PCLS exceeds cap, Module 7 warns user
- Calculator respects the cap in calculations

### Shortfall Handling

If projected income < target spending:
- Module 7 shows prominent warning
- Suggestions: adjust retirement age, reduce spending target, increase savings
- Projection shows how assets deplete over time

### State Pension Age

If retirement age < state pension age:
- Module 7 shows warning
- Income projections show zero state pension until SPA reached
- Projection table shows state pension starting at correct age

---

## Technical Notes for Documentation Writers

### Calculation Engines

- **At-Retirement:** `src/logic/atRetirement.js`
- **25-Year Projection:** `src/logic/projection.js`
- **Tax Calculations:** `src/utils/tax.js`

### Data Storage Keys

- Local: `retireplan-wizard-data`
- Cloud: User's Logto `customData.retirePlan.latest`

### API Endpoints

- Save/Load: `POST/GET /api/me/retireplan`

### Default Values

| Parameter | Default |
|-----------|---------|
| Inflation | 2.5% |
| DC Growth | 4% |
| ISA Growth | 3% |
| Taxable Growth | 3% |
| DC Drawdown Rate | 4% |
| Annuity Rate | 6% |
| DB Commutation Factor | 20:1 |
| State Pension (2025/26) | £11,973 |
