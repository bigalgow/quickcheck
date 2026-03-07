# CLAUDE.md — Lifestyle Financial Planner (retireplan-quickcheck)

This file provides guidance to Claude Code and Claude Skills when working with this repository.

---

## App Identity

**App Name**: Lifestyle Financial Planner
**Repo**: retireplan-quickcheck
**URL**: quickcheck.retireplan.co.uk
**PWA**: Can be installed to device home screen
**Part of**: RetirePlan platform (retireplan.co.uk)

This app is a **10-module retirement financial planning wizard**. Users work through modules covering lifestyle spending targets, pensions, savings, income, life events, and drawdown strategy — ending with a 25-year projection.

It is distinct from the **Lifestyle Designer** app (lifestyle-designer repo), which handles personality-based goal and lifestyle planning.

---

## Platform Context

**Two linked apps share the same Logto authentication instance:**

| App | Repo | URL | Purpose |
|-----|------|-----|---------|
| Lifestyle Financial Planner | retireplan-quickcheck | quickcheck.retireplan.co.uk | Financial planning wizard |
| Lifestyle Designer | lifestyle-designer | lifestyle.retireplan.co.uk | Personality-driven goal planning |

Both apps use the same Logto instance (`auth.retireplan.co.uk`) and share premium status via `customData.isPremium` in Logto user records.

---

## Development Commands

```bash
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

---

## Architecture

### Routes (`src/App.jsx`)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Welcome | Landing page |
| `/welcome` | Welcome | Alias for landing page |
| `/wizard` | WizardShell | 10-module wizard container |

**Note**: Legacy routes (`/calculator`, `/lifestyle`, `/projection`) have been removed. Legacy component files still exist in `src/components/` but are not routed.

### Frontend Structure

```
src/
├── auth/
│   ├── AuthProvider.jsx         # Logto auth context (useAuth hook)
│   └── logtoClient.js           # Legacy singleton (deprecated)
├── components/
│   ├── Welcome.jsx              # Landing page with premium CTA
│   ├── PremiumClaimModal.jsx    # Premium upgrade/claim modal
│   ├── wizard/
│   │   ├── WizardShell.jsx      # Wizard container, navigation, progress
│   │   ├── WizardSaveBar.jsx    # Auth UI, save/load, premium gating
│   │   ├── moduleRegistry.jsx   # Module list and routing
│   │   └── modules/
│   │       ├── Module1CoreAssumptions.jsx   # DOB, retirement age, inflation, tax region
│   │       ├── Module2Lifestyle.jsx         # PLSA tier, housing costs
│   │       ├── Module3DCPensions.jsx        # DC pots, contributions, career breaks
│   │       ├── Module4DBPensions.jsx        # Active and deferred DB schemes
│   │       ├── Module5Savings.jsx           # ISA, Taxable, Higher Yield savings
│   │       ├── Module6OtherIncome.jsx       # Property, dividend, other income
│   │       ├── Module7Results.jsx           # At Retirement Results (calculated)
│   │       ├── Module8LifeEvents.jsx        # One-off and recurring life events
│   │       ├── Module9DrawdownSequencing.jsx # ISA investments, DC drawdown rate
│   │       └── Module10Projection.jsx       # 25-Year Projection (calculated)
│   └── ui/
│       ├── FormInput.jsx
│       ├── HelpText.jsx
│       ├── SectionHeader.jsx
│       └── VideoButton.jsx
├── logic/
│   ├── atRetirement.js          # At-retirement calculation engine
│   └── projection.js            # 25-year projection engine
└── utils/
    ├── dataSchema.js            # Unified data schema + module definitions
    ├── tax.js                   # UK income tax (2026/27)
    ├── persist.js               # localStorage helpers, cloud save orchestration
    ├── lifestyleProfile.js      # PLSA benchmark values
    ├── retirementStatus.js      # Retirement status helpers
    ├── statePensionAge.js       # UK state pension age calculation
    └── money.js                 # Currency formatting (fmt, N helpers)
```

### Backend (Vercel Serverless Functions)

```
api/me/
├── retireplan.js      # GET/POST retirement plan data (customData.retirePlan.latest)
├── premium.js         # GET premium status (customData.isPremium)
└── claim-premium.js   # POST claim premium (sets isPremium: true)
```

All API endpoints:
- Verify JWT bearer token (audience: `https://api.retireplan`)
- Use Logto Management API for user data read/write
- Require env vars: `LOGTO_ISSUER`, `MGMT_CLIENT_ID`, `MGMT_CLIENT_SECRET`, `API_AUDIENCE`, `MGMT_RESOURCE`

---

## The 10-Module Wizard

Data is stored in a single unified object (`defaultRetirePlanData` from `dataSchema.js`).

| Module | Title | Description |
|--------|-------|-------------|
| 1 | Core Assumptions | Date of birth, retirement age, inflation %, tax region |
| 2 | Lifestyle Baseline | PLSA tier or custom spend, housing type/costs |
| 3 | Workplace & Personal Pensions | DC pots, contributions, employer match, career breaks |
| 4 | Final Salary & DB Pensions | Active accrual schemes, deferred scheme (ABS income) |
| 5 | Savings & Investments | ISA, Taxable Savings, Higher Yield Investments |
| 6 | Other Income | Property rental, dividend income, other sources |
| 7 | At Retirement Results | Calculated summary (atRetirement.js output) |
| 8 | Life Events | One-off and recurring income/expense events |
| 9 | Drawdown Sequencing | Annual ISA investment amount, DC drawdown rate override |
| 10 | 25-Year Projection | Calculated 25-year post-retirement table (projection.js output) |

### Data Schema (`src/utils/dataSchema.js`)

```javascript
defaultRetirePlanData = {
  inputs: { dateOfBirth, retirementAge, statePensionAnnual, inflation, taxRegion },
  lifestyle: { method, householdType, plsaTier, baselineAmount, housingType, housingCostAnnual, ageMortgagePaidOff },
  dc: { potNow, takeTaxFree25, growthAssumption, drawdownRate, annuityRate, annuityPct,
        isContributing, contributionType, salaryNow, employeePct, employerPct,
        personalAnnualContrib, hasCareerBreak, breakStartAge, breakEndAge },
  db: { takeTaxFree25, schemes: [...] },
  savings: {
    isa: { currentValue, addPerYear, growthRate },
    taxableSavings: { currentValue, addPerYear, growthRate },
    higherYield: { currentValue, addPerYear, growthRate }  // default rate: 6%
  },
  otherIncome: [],  // [{ id, type: 'property'|'dividend'|'other', description, annualAmount }]
  atRetirementResults: null,
  lifeEvents: [],   // [{ id, name, age, amount, type, isRecurring, recurringYears, category, source }]
  postRetirement: { isaInvestmentAnnual, dcDrawdownRate },
  projectionResults: null,
  metadata: { completedModules: [], lastModified, version: "2.0" }
}
```

---

## Data Persistence

### localStorage (primary, automatic)
- **Key**: `retireplan-wizard-data`
- Auto-saves on every data change (debounced)
- Persists across page reloads within same browser (unlike sessionStorage)
- WizardSaveBar reads this synchronously on mount (via `useState` initializer — critical to avoid race conditions with auth)

### Cloud Save (authenticated users)
- **Endpoint**: `GET/POST /api/me/retireplan`
- **Logto field**: `customData.retirePlan.latest`
- Manual save via WizardSaveBar "Save to Cloud" button
- Auto-loads on sign-in (smart sync with localStorage timestamp comparison)
- **Smart Sync Pattern**: WizardSaveBar reads localStorage synchronously in `useState(() => {...})` so it has data before auth resolves

---

## Authentication & Premium

### AuthProvider (`src/auth/AuthProvider.jsx`)

```javascript
const { isAuthenticated, userInfo, isPremium, premiumLoading,
        signIn, signOut, getAccessToken, refreshPremium } = useAuth();
```

- `isPremium`: fetched from `GET /api/me/premium` after sign-in
- `refreshPremium()`: call after claiming premium to update state
- `getAccessToken('https://api.retireplan')`: gets JWT for API calls

### Premium Tier

- **Claim endpoint**: `POST /api/me/claim-premium` (sets `isPremium: true` in Logto)
- **Auto-approve**: `PREMIUM_AUTO_APPROVE=true` by default (beta — free for early users)
- **PremiumClaimModal**: shown from Welcome page CTA, calls claim-premium endpoint
- **Welcome page**: Shows premium CTA card to all non-premium users (authenticated → claim modal; unauthenticated → sign in)
- **WizardSaveBar**: Gates cloud save behind authentication; shows premium features to premium users

### Environment Variables

**Frontend** (`.env.local`):
```
VITE_LOGTO_ENDPOINT=https://auth.retireplan.co.uk
VITE_LOGTO_APP_ID=pu4bsk6f3m9mox3vtxh8z
VITE_API_AUDIENCE=https://api.retireplan
```

**Backend** (Vercel dashboard):
```
LOGTO_ISSUER=https://auth.retireplan.co.uk
MGMT_CLIENT_ID=<management-api-client-id>
MGMT_CLIENT_SECRET=<management-api-client-secret>
API_AUDIENCE=https://api.retireplan
MGMT_RESOURCE=https://auth.retireplan.co.uk/api
```

---

## Key Calculations

### At Retirement (`src/logic/atRetirement.js`)

The `atRetirement()` function takes the wizard's full data and produces a snapshot at retirement age:

- **DC pots**: Growth + contributions (start-of-year timing), career break support
- **DB pensions**:
  - Active: Accrual on final salary with service years
  - Deferred: User enters "projected income" from ABS directly (no revaluation)
- **PCLS**: 25% tax-free cash, capped at £268,275 across DC + DB
- **Savings at retirement**:
  - ISA, taxable savings, and Higher Yield Investments projected separately
  - Higher Yield merged into taxable savings total at retirement
  - **Blended rate**: Weighted average of taxable and higher-yield growth rates (used in projection)
- **Income streams**: DC drawdown, DB pension, state pension, property, dividends, other
- **Dividends**: Separated from other income, taxed at dividend rates
- **Tax**: `estimateIncomeTax()` with non-savings, savings interest, and dividend income
- **Outputs**: Both nominal (at retirement date) and real (today's money) terms
- **Returns**: `blendedSavingsRate` for use in post-retirement projection

### Post-Retirement Projection (`src/logic/projection.js`)

`calculateProjection()` generates a 25-year year-by-year table:

- **DC drawdown**: Year 1 calculated from % of pot; inflated each subsequent year (4% rule style)
- **ISA**: Optional annual investments from taxable savings; drawdown if taxable depleted
- **Taxable savings**: Buffer absorbing net cash flow (can go negative before ISA drawn)
- **Income inflation**: DB pension, state pension, other income all inflated each year
- **Annuity**: Fixed (no inflation)
- **Life events**: Per-age income/expense adjustments (one-off or recurring)
- **Annual spend**: Inflation-adjusted; age-based reductions at 75 (-15%) and 85 (-25%)
- **Mortgage payoff**: Spend automatically reduced when mortgage age is reached
- **Tax**: Full `estimateIncomeTax()` per year (non-savings + savings interest + dividends)
- **Depletion warnings**: `extractWarnings()` returns first occurrence per pot type only (deduped)
- **Real terms**: Deflated to today's money for comparison

### Tax (`src/utils/tax.js`) — 2026/27 UK Tax Year

**Constants**: `TAX_2026_EWNI` (England/Wales/NI), `TAX_2026_SCOTLAND`
- Backward-compat aliases: `TAX_2025_EWNI = TAX_2026_EWNI` (retain for any legacy callers)
- EWNI bands frozen until April 2028 — no change needed until then

**`estimateIncomeTax({ pensionableIncome, savingsInterest, dividendIncome, propertyIncome, cfg })`**

Income stacked in order:
1. **Non-savings** (pension, DB, state pension, property, other): Personal Allowance applied first, then income tax bands
2. **Savings interest**: Personal Savings Allowance (£1,000 basic / £500 higher / £0 additional), remainder taxed at income bands
3. **Dividends**: £500 dividend allowance, remainder at 8.75% / 33.75% / 39.35% (basic/higher/additional)

**Personal Allowance taper**: Starts at £100,000, zero at £125,140

**Property income**: Currently included in `pensionableIncome` by caller. `propertyIncome` parameter reserved for 2027/28 when separate property rules apply.

**Scottish bands**: 2026/27 rates — verify against Scottish Budget (comment in source flagging this)

---

## Module 5: Savings Categories

Three savings types, each with current value, annual addition, and growth rate:

| Category | Default Rate | Notes |
|----------|-------------|-------|
| ISA | 3% | Tax-free growth; not merged with taxable |
| Taxable Savings | 3% | Cash/bonds; interest taxed via PSA |
| Higher Yield Investments | 6% | Stocks, bonds, other; merged into taxable at retirement |

At retirement, Higher Yield balance is merged with Taxable Savings. The blended growth rate (weighted average) is passed to the projection for post-retirement DC drawdown and savings growth calculations.

---

## Module 6: Other Income Categories

| Type | Tax Treatment |
|------|--------------|
| Property rental | Included in `pensionableIncome` (income tax rates) |
| Dividend income | Separated, taxed at dividend rates (8.75%/33.75%/39.35%) |
| Other | Included in `pensionableIncome` |

---

## Common Patterns

### Accessing Auth State
```javascript
import { useAuth } from '../auth/AuthProvider';
const { isAuthenticated, isPremium, signIn, getAccessToken, refreshPremium } = useAuth();
const token = await getAccessToken('https://api.retireplan');
```

### Synchronous localStorage Read (Critical Pattern)
```javascript
// MUST use useState initializer to avoid race condition with auth resolution
const [savedData, setSavedData] = useState(() => {
  try {
    const stored = localStorage.getItem('retireplan-wizard-data');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
});
```

### Module Navigation
```javascript
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/wizard?module=3');  // Use navigate(), not window.location.href
```

### Number Helpers (`src/utils/money.js`)
- `fmt(n)`: formats with thousand separators, no decimals (e.g. `£42,500`)
- `N(str)`: safely converts form string to number (empty/null → 0)

---

## Important Implementation Notes

- **DB Deferred**: Uses "projected income" from Annual Benefit Statement directly — no revaluation needed
- **PCLS Cap**: £268,275 total across DC + DB (post-LTA abolition figure, unchanged)
- **DB Commutation Factor**: Fixed at 20 (£20 lump sum per £1 annual pension)
- **State Pension Age**: Calculated in `statePensionAge.js`; wizard warns if retirement age < SPA
- **Date Validation**: All date calculations use defensive `isNaN(date.getTime())` checks
- **Form Merging**: When loading saved data always merge: `setData(prev => ({ ...prev, ...saved }))` to preserve defaults for any new fields not in saved data
- **Depletion Warnings**: `extractWarnings()` in `projection.js` deduplicates — only first year a pot depletes is returned

---

## Troubleshooting

### Premium Status Wrong
1. Check `GET /api/me/premium` returns correct `isPremium` value
2. Call `refreshPremium()` after claiming
3. `PREMIUM_AUTO_APPROVE` in env should be `true` for beta users

### Cloud Data Spuriously Offered on Welcome Page
- Root cause: loading savedData in `useEffect` means WizardSaveBar gets empty data on first render; auth resolves first and triggers sync
- Fix: load localStorage synchronously in `useState(() => {...})` initializer

### Module Links Not Working in Preview
- Do not use `window.location.href` for in-app navigation — use React Router `navigate()`
- `window.location.href` breaks auth state in Vercel preview deployments

### Projection Not Calculating
1. Module 7 must run first (at-retirement calculation produces `openingValues`)
2. Check console for NaN or undefined in `openingValues`
3. Verify `blendedSavingsRate` is returned from `atRetirement.js`
