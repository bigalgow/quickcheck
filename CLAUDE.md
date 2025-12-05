# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RetirePlan QuickCheck is a React-based retirement planning application with routing, multiple calculators, and cloud data persistence.

**Current Status:**
- **Phase 1 (Complete)**: "At Retirement" calculator - gathers user input for current savings and pensions, projects to retirement age, produces comprehensive summary of income, expenditure, and assets
- **Phase 2 (Complete)**: Post-retirement projection - 25-year projection forward with life events, ISA investments, tax calculations, and depletion warnings
- **Lifestyle Calculator (Complete)**: Multi-step wizard using PLSA benchmarks to help users discover retirement lifestyle needs, pre-fills calculator data
- **Dashboard (Complete)**: Landing page offering two user journeys - "Jump to Calculator" or "Discover Lifestyle First"
- **Data Persistence**: All data saved to Logto custom_data via Management API. LocalStorage autosave provides offline backup
- **Authentication**: Logto integration with token-based API access for secure data operations

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

#### User Journey 1: Direct to Calculator
1. User lands on Dashboard (`/`) → clicks "Start Calculating"
2. Navigates to `/calculator` (AtRetirement component)
3. User enters financial data (DC/DB pensions, savings, income, expenditure)
4. `atRetirement()` calculates retirement position (nominal + real terms)
5. Results displayed with summary, detailed breakdown, and adjustable sliders
6. User clicks "View 25-Year Projection" → navigates to `/projection` with `openingValues` in route state
7. `calculateProjection()` generates 25 years of projections with life events, ISA investments, tax
8. Results shown in table and charts

#### User Journey 2: Lifestyle First
1. User lands on Dashboard → clicks "Start Discovery"
2. Navigates to `/lifestyle` (LifestyleCalculator wizard)
3. Step 1: Select age range and household type (solo/couple)
4. Step 2: Choose baseline tier (PLSA: minimum/moderate/comfortable) or estimate from current income
5. Step 3: Add exceptional items (travel, purchases, family support) - one-off or recurring
6. Profile generated with name (e.g., "The Comfortable Explorer"), total annual spend, one-off costs
7. Saved to `/api/me/lifestyle` endpoint (cloud) + localStorage
8. User navigates to `/calculator` - form pre-filled with lifestyle profile data
9. Continues through Journey 1 flow

#### Data Persistence
- **LocalStorage** (via `persist.js`):
  - Auto-saves on every input change (debounced)
  - Separate keys: `retireplan-data`, `retireplan-projection`, `retireplan-lifestyle`
  - Provides offline access and instant restore on page reload

- **Cloud Save** (via Logto Management API):
  - Manual save via "Save data" button in SaveBar (when authenticated)
  - Two separate fields in Logto `customData`:
    - `customData.retirePlan.latest` - At-Retirement + Projection data
    - `customData.lifestyleProfile` - Lifestyle wizard data
  - Persists across devices and browsers

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
- **DC projections**: Pot growth + employer/personal contributions (start-of-year timing)
- **DB projections**: Active schemes (accrual on final salary) and deferred schemes (preserved pension with revaluation)
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

1. Check `localStorage` keys exist: `retireplan-data`, `retireplan-projection`, `retireplan-lifestyle`
2. Verify authenticated: `isAuthenticated` should be `true` in SaveBar
3. Check browser console for API errors when clicking "Load from cloud"
4. Verify backend logs in Vercel for Management API errors

### Projection Not Working

1. Ensure At-Retirement calculator ran successfully first
2. Check browser console for `location.state.openingValues` - should contain retirement position
3. If missing, user must complete At-Retirement calculator before viewing projection
4. Check for calculation errors in `projection.js` (e.g., division by zero, NaN values)
