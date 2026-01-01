# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RetirePlan QuickCheck is a React-based retirement planning application with routing, multiple calculators, and cloud data persistence.

**Current Status:**
- **Phase 1 (Complete)**: "At Retirement" calculator - gathers user input for current savings and pensions (including multiple DC pots), projects to retirement age, produces comprehensive summary of income, expenditure, and assets
- **Phase 2 (Complete)**: Post-retirement projection - 25-year projection forward with life events, ISA investments, tax calculations, and depletion warnings
- **Lifestyle Calculator (Complete)**: Multi-step wizard using PLSA benchmarks to help users discover retirement lifestyle needs, pre-fills calculator data. Users can continue without signing in.
- **Dashboard (Complete)**: Landing page with authentication (SaveBar) offering two user journeys - "Discover Lifestyle First" (recommended) or "Jump to Calculator"
- **Data Persistence**: All data saved to Logto custom_data via Management API. SessionStorage autosave provides offline backup (clears on tab close for security)
- **Authentication**: Logto integration with token-based API access for secure data operations. Available on Dashboard, Calculator, Lifestyle Planner, and Projection pages.

## Development Commands

```bash
# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint
```

## Architecture

### Frontend Structure

- **Entry Point**: `src/main.jsx` - wraps app with `AuthProvider` and `BrowserRouter`
- **Main App**: `src/App.jsx` - React Router setup with 4 routes:
  - `/` - Dashboard (landing page)
  - `/calculator` - At-Retirement Calculator
  - `/lifestyle` - Lifestyle Discovery Wizard
  - `/projection` - Post-Retirement Projection (25 years)

- **Authentication**: `src/auth/`
  - `AuthProvider.jsx`: React context providing auth state and methods (`useAuth` hook)
  - `logtoClient.js`: Legacy singleton (deprecated, use AuthProvider)

- **Main Components**: `src/components/`
  - `Dashboard.jsx` (5KB): Landing page with two user journey options
  - `AtRetirement.jsx` (68KB): Phase 1 calculator - inputs, calculations, results display
  - `LifestyleCalculator.jsx` (35KB): Multi-step wizard for lifestyle discovery using PLSA benchmarks
  - `PostRetirementProjection.jsx` (23KB): Phase 2 - 25-year projection with life events
  - `SaveBar.jsx` (11KB): Authentication UI, save/load, export/import
  - `LifeEvents.jsx` (10KB): Life events editor (income/expenses, one-off/recurring)
  - `ProjectionTable.jsx` (9KB): Year-by-year projection data table
  - `ProjectionInputs.jsx` (3KB): Projection-specific inputs (ISA investments, DC drawdown %)
  - `ProjectionCharts.jsx` (4KB): Visualization of projection data

- **UI Components**: `src/components/ui/`
  - `FormInput.jsx`: Standardized form input component
  - `HelpText.jsx`: Collapsible help text component
  - `SectionHeader.jsx`: Section header with optional help text
  - `VideoButton.jsx`: Button to launch video tutorials

- **Business Logic**: `src/logic/`
  - `atRetirement.js` (10KB): Core calculation engine for "At Retirement" position
  - `projection.js` (9KB): 25-year post-retirement projection calculator with life events

- **Utilities**: `src/utils/`
  - `tax.js` (4KB): UK income tax calculations (England/Wales/NI and Scotland 2025 bands)
  - `persist.js` (4KB): LocalStorage autosave, cloud save orchestration
  - `lifestyleProfile.js` (5KB): PLSA benchmark values, profile generation, event transformation
  - `statePensionAge.js` (2KB): UK state pension age calculations
  - `money.js` (0.3KB): Currency formatting utilities

### Backend Structure

- **API Endpoints** (Vercel serverless functions):

  - `api/me/retireplan.js` - Retirement calculator data
    - GET: Retrieve user's saved retirement plan data from `customData.retirePlan.latest`
    - POST: Save retirement plan data (At-Retirement + Projection inputs) to Logto Management API
    - JWT verification with `jose` library

  - `api/me/lifestyle.js` - Lifestyle profile data
    - GET: Retrieve user's lifestyle profile from `customData.lifestyleProfile`
    - POST: Save/update lifestyle profile (PLSA tier, exceptional items)
    - DELETE: Clear lifestyle profile
    - JWT verification with `jose` library

Both endpoints:
- Authenticate user via JWT bearer token (audience: `https://api.retireplan`)
- Obtain Management API token via client credentials flow
- Read/write user's Logto `customData` field via Management API
- Require environment variables: `LOGTO_ISSUER`, `MGMT_CLIENT_ID`, `MGMT_CLIENT_SECRET`, `API_AUDIENCE`, `MGMT_RESOURCE`

### Data Flow

#### User Journey 1: Lifestyle First (Recommended)
1. User lands on Dashboard (`/`) → can sign in via SaveBar or continue as guest
2. User clicks "Start Discovery" → navigates to `/lifestyle` (LifestyleCalculator wizard)
3. Step 1: Select age range and household type (solo/couple)
4. Step 2: Choose baseline tier (PLSA: minimum/moderate/comfortable) or estimate from current income
5. Step 3: Add exceptional items (travel, purchases, family support) - one-off or recurring
6. Profile generated with name (e.g., "The Comfortable Explorer"), total annual spend, one-off costs
7. User can either:
   - Sign in and save profile to cloud (`/api/me/lifestyle` endpoint)
   - Click "Continue to Calculator" without signing in
8. Navigates to `/calculator` - form pre-filled with lifestyle profile data (`desiredSpendAnnual`)
9. Continues through calculator workflow (Journey 2 below)

#### User Journey 2: Direct to Calculator
1. User lands on Dashboard (`/`) → clicks "Start Calculating"
2. Navigates to `/calculator` (AtRetirement component)
3. User enters financial data:
   - Multiple DC pension pots (can add multiple pots, each tracked separately)
   - DB pensions: Active schemes and Deferred schemes (simplified - uses ABS "projected income" directly)
   - Savings, income, expenditure
4. `atRetirement()` calculates retirement position (nominal + real terms)
5. Results displayed with summary, detailed breakdown, and adjustable sliders
6. User clicks "View 25-Year Projection" → navigates to `/projection` with `openingValues` in route state
7. `calculateProjection()` generates 25 years of projections with life events, ISA investments, tax
8. Results shown in table and charts

#### Data Persistence
- **SessionStorage** (via `persist.js`):
  - Auto-saves on every input change (debounced)
  - Unified key: `retireplan.unified.v1` containing both At-Retirement and Projection data
  - Provides instant restore on page reload within same browser tab
  - **Security feature**: Data clears when browser tab closes (prevents sensitive financial data from persisting)
  - **Form State Merging**: Saved data is merged with default form values (not replaced) to prevent missing fields

- **Cloud Save** (via Logto Management API):
  - Manual save via "Save All Data" button in SaveBar (when authenticated)
  - Two separate fields in Logto `customData`:
    - `customData.retirePlan.latest` - At-Retirement + Projection data
    - `customData.lifestyleProfile` - Lifestyle wizard data
  - Persists across devices and browsers
  - Auto-loads when user signs in

### Authentication Flow

1. User clicks "Login to save" → `AuthProvider` calls `LogtoClient.signIn()`
2. Logto redirects to auth page, then back with `?code=...&state=...`
3. `AuthProvider` detects callback params, calls `handleSignInCallback()`
4. Auth state is synced (`isAuthenticated`, `userInfo`)
5. SaveBar displays user info and "Save data" button
6. When saving, `getAccessToken(audience)` requests an API-scoped JWT
7. Backend verifies JWT and saves to Logto Management API

### Environment Variables

**Frontend** (Vite - should be in project root `.env.local`):
```
VITE_LOGTO_ENDPOINT=https://auth.retireplan.co.uk
VITE_LOGTO_APP_ID=pu4bsk6f3m9mox3vtxh8z
VITE_API_AUDIENCE=https://api.retireplan
```

**Backend** (Vercel - set in Vercel dashboard):
```
LOGTO_ISSUER=https://auth.retireplan.co.uk
MGMT_CLIENT_ID=<management-api-client-id>
MGMT_CLIENT_SECRET=<management-api-client-secret>
API_AUDIENCE=https://api.retireplan
MGMT_RESOURCE=https://auth.retireplan.co.uk/api
```

## Key Calculations

### At Retirement Calculator (`atRetirement.js`)

The `atRetirement()` function handles:

- **Years to retirement**: Calculated from date of birth (using precise decimal years via `yearsBetween()`)
- **DC projections**:
  - Multiple DC pots supported (user can add multiple pots, each tracked separately)
  - Pot growth + employer/personal contributions (start-of-year timing)
  - All pots combined for total DC value at retirement
- **DB projections**:
  - Active schemes: Accrual on final salary with service years calculation
  - Deferred schemes: **Simplified** - user enters "projected income" from Annual Benefit Statement (ABS) directly
  - No complex revaluation calculations needed - uses the figure providers quote on ABS
- **PCLS (Pension Commencement Lump Sum)**: 25% tax-free cash from DC/DB (capped at £268,275 total)
- **Income streams**: DC drawdown/annuity, DB pension, state pension, other income, savings interest
- **Tax**: UK income tax calculation (Personal Allowance taper, PSA) using `tax.js`
- **Real vs Nominal**: All outputs shown in both nominal (at retirement) and real (today's money) terms

**Calculation Specifics:**
- **Contribution Timing**: DC contributions use start-of-year timing (year 1 = first year of contributions)
- **Inflation Simplification**: Salary growth and personal contribution escalation both use the inflation assumption
- **Tax Bands**: Configured in `TAX_2025_EWNI` and `TAX_2025_SCOTLAND` constants
- **DB Commutation Factor**: Fixed at 20 (£20 lump sum per £1 annual pension surrendered)
- **State Pension Age Warning**: App warns if retirement age < state pension age

### Post-Retirement Projection (`projection.js`)

The `calculateProjection()` function generates a 25-year projection:

- **Opening Position**: Takes outputs from At-Retirement calculator as starting values
- **Drawdown Strategy**: 4% rule style - cash amount calculated in year 1, inflated each subsequent year
- **Asset Management**:
  - DC pot: Drawn down each year with remaining balance growing
  - ISA: Optional recurring investments (from taxable savings), tax-free growth
  - Taxable savings: Buffer absorbing net cash flow (can go negative)
- **Life Events**: User-defined income/expense events (one-off or recurring over years)
- **Income Tax**: Full calculation each year on pension income + taxable savings interest
- **Depletion Detection**: Warns when DC/ISA/Taxable pots go negative
- **Real Terms**: All values deflated to today's money for comparison

**Calculation Specifics:**
- **ISA Investments**: Only occur if taxable savings sufficient (prevents negative balance)
- **ISA Drawdown**: Only triggered if taxable savings depleted (pulls from ISA to cover deficit)
- **Tax Calculation**: Uses same `estimateIncomeTax()` function as At-Retirement
- **Growth Timing**: Growth applied to balance AFTER drawdown (simplified start-of-year assumption)

### Lifestyle Calculator (`lifestyleProfile.js`)

Uses PLSA (Pension and Lifetime Savings Association) 2024 benchmarks:

- **Minimum**: £14,400 (solo) / £22,400 (couple)
- **Moderate**: £31,300 (solo) / £43,100 (couple)
- **Comfortable**: £43,100 (solo) / £59,000 (couple)

User can:
- Select a PLSA tier as baseline
- OR estimate from current pre-retirement income (rule of thumb: 70-80% of current)
- Add exceptional items in 4 categories: Travel, Purchases, Family Support, Lifestyle Upgrades
- Each item: one-off (specific year) or recurring (over multiple years)

Profile generates:
- Named profile (e.g., "The Comfortable Explorer" based on tier + dominant category)
- Total annual spending (baseline + recurring items)
- Total one-off costs
- Life events exported to Projection calculator

## Common Patterns

### Accessing Authentication State

```javascript
import { useAuth } from '../auth/AuthProvider';

function MyComponent() {
  const { isAuthenticated, userInfo, signIn, signOut, getAccessToken } = useAuth();

  // Use getAccessToken() for Account API (opaque token)
  const accountToken = await getAccessToken();

  // Use getAccessToken(audience) for custom API (JWT with audience)
  const apiToken = await getAccessToken('https://api.retireplan');
}
```

### Modifying At-Retirement Calculations

When updating calculation logic in `src/logic/atRetirement.js`:
- Ensure both nominal and real-terms outputs are updated
- Test with edge cases (already retired, zero contributions, PCLS cap exceeded)
- Update corresponding tax calculations if income structure changes
- Update `AtRetirement.jsx` to display new outputs

### Modifying Projection Calculations

When updating calculation logic in `src/logic/projection.js`:
- Test year-by-year progression (check year 1, year 10, year 25)
- Ensure asset balances never go invalid (e.g., negative growth on zero balance)
- Test edge cases (DC depletion, ISA drawdown triggers, taxable going negative)
- Update `ProjectionTable.jsx` and `ProjectionCharts.jsx` if adding new data fields

### Adding New Input Fields

1. Add field to component state (e.g., `AtRetirement.jsx` or `PostRetirementProjection.jsx`)
2. Update autosave payload in persist function
3. Add corresponding calculation logic in `atRetirement.js` or `projection.js`
4. Update UI to display new input/output
5. Update cloud save structure if needed (backend expects specific fields)

## File References

### Key Component Locations

- **Dashboard**: `src/components/Dashboard.jsx:1`
- **At-Retirement Calculator**: `src/components/AtRetirement.jsx:1`
- **Lifestyle Wizard**: `src/components/LifestyleCalculator.jsx:1`
- **Post-Retirement Projection**: `src/components/PostRetirementProjection.jsx:1`
- **SaveBar**: `src/components/SaveBar.jsx:1`
- **Life Events Editor**: `src/components/LifeEvents.jsx:1`

### Key Logic Locations

- **At-Retirement Calculations**: `src/logic/atRetirement.js:1`
- **Projection Calculations**: `src/logic/projection.js:1`
- **Tax Calculations**: `src/utils/tax.js:1`
- **PLSA Values & Profile Logic**: `src/utils/lifestyleProfile.js:1`

### API Endpoints

- **Retirement Data API**: `api/me/retireplan.js:1`
- **Lifestyle Profile API**: `api/me/lifestyle.js:1`

## Important Implementation Notes

- **Logto Storage Cleanup**: `AuthProvider` clears stale `logto:*` localStorage keys on auth errors
- **Buffered Input Pattern**: `Txt` component in `AtRetirement.jsx` buffers input changes, only commits on blur/Enter
- **Number Formatting**: `fmt()` helper formats numbers with thousand separators, no decimals
- **String to Number Conversion**: `N()` helper safely converts form strings to numbers (treats empty/null as 0)
- **Route State**: At-Retirement passes `openingValues` to Projection via React Router `location.state`
- **Smart Event Merging**: Projection smart-merges lifestyle profile events with user-edited projection events (preserves user edits)
- **Unsaved Changes Tracking**: Both calculators track unsaved changes and warn before cloud load would overwrite local edits
- **Form State Merging** (Critical): When loading saved data, `setForm(prevForm => ({ ...prevForm, ...savedForm }))` merges saved values with defaults rather than replacing entire state. This prevents undefined values (like missing `dateOfBirth`) from causing crashes.
- **Date Validation**: All date calculations use defensive checks (`isNaN(date.getTime())`) before calling `.getTime()` to prevent crashes with invalid dates
- **Multiple DC Pots**: DC pension section supports multiple pots via array state, each pot tracked independently and summed for total value
- **Simplified DB Deferred**: Deferred DB pensions use "projected income" field from ABS directly - no revaluation rate calculations needed
- **Dashboard Authentication**: Dashboard includes SaveBar for users who bookmark the web app directly (bypass main website login)
- **Guest User Flow**: Lifestyle calculator allows users to continue without signing in - saves `desiredSpendAnnual` to sessionStorage only

## Troubleshooting

### Token Exchange Issues

If authentication succeeds but API calls fail:

1. **Check Environment Variables**:
   - Frontend: `.env.local` should be in project root with `VITE_API_AUDIENCE=https://api.retireplan`
   - Backend: Vercel env vars must include `API_AUDIENCE`, `MGMT_RESOURCE`

2. **Verify Logto Configuration**:
   - In Logto dashboard, ensure API resource `https://api.retireplan` exists
   - Application must have permission to request tokens for this resource
   - Check that `resources` array in `AuthProvider.jsx` includes the API resource

3. **Check Backend JWT Verification**:
   - `LOGTO_ISSUER` must match exactly (no trailing slash)
   - JWKS URL correct: `${ISSUER}/oidc/jwks`
   - Backend logs (Vercel) show JWT verification errors

4. **Browser Console**:
   - Check for token exchange errors from Logto SDK
   - Inspect Network tab for `/api/me/*` request/response details

### Data Not Loading from Cloud

1. Check `sessionStorage` key exists: `retireplan.unified.v1` (contains both At-Retirement and Projection data)
2. Verify authenticated: `isAuthenticated` should be `true` in SaveBar
3. Check browser console for API errors - cloud data auto-loads on sign-in
4. Verify backend logs in Vercel for Management API errors
5. Note: If you close the browser tab, sessionStorage is cleared (by design for security)

### Projection Not Working

1. Ensure At-Retirement calculator ran successfully first
2. Check browser console for `location.state.openingValues` - should contain retirement position
3. If missing, user must complete At-Retirement calculator before viewing projection
4. Check for calculation errors in `projection.js` (e.g., division by zero, NaN values)
