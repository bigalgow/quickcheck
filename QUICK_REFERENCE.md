# RetirePlan QuickCheck - Quick Reference

*Last updated: 2025-12-04*

## Project At a Glance

**Type**: React SPA with routing (React Router v6)
**Features**: 3 calculators + dashboard landing page
**Auth**: Logto (OAuth2/OIDC)
**Backend**: Vercel serverless functions
**Data**: LocalStorage (auto-save) + Cloud (Logto Management API)

## Quick Start

```bash
npm run dev      # http://localhost:5173
npm run build    # Production build
npm run preview  # Test production build
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Dashboard | Landing page - choose journey |
| `/calculator` | AtRetirement | Phase 1: Calculate retirement position |
| `/lifestyle` | LifestyleCalculator | Lifestyle discovery wizard (PLSA) |
| `/projection` | PostRetirementProjection | Phase 2: 25-year projection |

## Component Size Reference

| Component | Size | Lines | Purpose |
|-----------|------|-------|---------|
| AtRetirement.jsx | 68KB | ~1800 | Main calculator form & results |
| LifestyleCalculator.jsx | 35KB | ~950 | 3-step lifestyle wizard |
| PostRetirementProjection.jsx | 23KB | ~630 | 25-year projection UI |
| SaveBar.jsx | 11KB | ~290 | Auth UI, save/load, export/import |
| LifeEvents.jsx | 10KB | ~270 | Life events editor (projection) |
| ProjectionTable.jsx | 9KB | ~240 | Year-by-year data table |
| Dashboard.jsx | 5KB | ~150 | Landing page |
| ProjectionInputs.jsx | 3KB | ~90 | ISA investments, DC drawdown % |
| ProjectionCharts.jsx | 4KB | ~110 | Projection visualizations |

## Logic Files

| File | Size | Purpose |
|------|------|---------|
| atRetirement.js | 10KB | At-Retirement calculations (DC/DB/PCLS/tax) |
| projection.js | 9KB | 25-year projection (life events, drawdown, tax) |
| tax.js | 4KB | UK tax calculations (EWNI & Scotland 2025) |
| lifestyleProfile.js | 5KB | PLSA benchmarks, profile generation |
| persist.js | 4KB | LocalStorage & cloud save orchestration |
| statePensionAge.js | 2KB | UK state pension age lookup |
| money.js | 0.3KB | Currency formatting |

## API Endpoints

### `/api/me/retireplan` (Retirement Data)
- **GET**: Load saved retirement plan from `customData.retirePlan.latest`
- **POST**: Save retirement plan (At-Retirement + Projection inputs)

### `/api/me/lifestyle` (Lifestyle Profile)
- **GET**: Load lifestyle profile from `customData.lifestyleProfile`
- **POST**: Save/update lifestyle profile
- **DELETE**: Clear lifestyle profile

Both require:
- JWT bearer token (audience: `https://api.retireplan`)
- Backend authenticates via Logto Management API

## Data Storage

### LocalStorage Keys
- `retireplan-data` - At-Retirement calculator state
- `retireplan-projection` - Projection inputs & life events
- `retireplan-lifestyle` - Lifestyle wizard data

### Cloud Storage (Logto `customData`)
```javascript
{
  retirePlan: {
    latest: {
      // At-Retirement form state
      // + Projection inputs
    }
  },
  lifestyleProfile: {
    // Lifestyle wizard data
    // (PLSA tier, exceptional items, etc.)
  }
}
```

## Key Calculation Functions

### `atRetirement(form)`
**Location**: `src/logic/atRetirement.js`

**Inputs**: Current age, retirement age, DC/DB pensions, savings, income, expenditure
**Outputs**: Retirement position (nominal + real terms):
- DC/DB pot values after growth
- PCLS lump sum (capped at £268,275)
- Annual income streams (DB, DC drawdown/annuity, state pension, other)
- Annual expenditure
- Tax (income tax + PSA)
- Net position (surplus/deficit)

**Key Details**:
- Start-of-year contribution timing
- DB accrual for active schemes, revaluation for deferred
- Personal Allowance taper above £100k
- Separate tax configs for England/Wales/NI vs Scotland

### `calculateProjection(openingValues, projectionInputs)`
**Location**: `src/logic/projection.js`

**Inputs**: Opening position from At-Retirement + user inputs (ISA investments, DC drawdown %, life events)
**Outputs**: Array of 25 year objects with:
- Opening/closing balances (DC, ISA, taxable savings)
- Drawdowns, investments, growth
- Income streams (inflated)
- Tax
- Life events impact
- Net flow
- Warnings (depletion)

**Key Details**:
- 4% drawdown rule (cash amount inflated annually)
- ISA investments only if taxable savings sufficient
- ISA drawdown only if taxable savings depleted
- Life events: one-off or recurring over specified years

### `lifestyleProfile` functions
**Location**: `src/utils/lifestyleProfile.js`

**PLSA 2024 Benchmarks**:
- Minimum: £14,400 (solo) / £22,400 (couple)
- Moderate: £31,300 (solo) / £43,100 (couple)
- Comfortable: £43,100 (solo) / £59,000 (couple)

**Functions**:
- `getPLSAValue(tier, householdType)` - Get baseline spending
- `generateProfileName(tier, exceptionalItems)` - Generate profile name (e.g., "The Comfortable Explorer")
- `calculateTotalAnnual(baselineAmount, exceptionalItems)` - Total annual spending
- `calculateTotalOneOff(exceptionalItems)` - Total one-off costs
- `transformToProjectionEvents(profile, retirementAge)` - Convert to life events for projection

## User Journeys

### Journey 1: Direct to Calculator
1. Dashboard → "Start Calculating"
2. Fill At-Retirement form → Calculate
3. View results → "View 25-Year Projection"
4. Adjust projection inputs (ISA, life events)
5. View 25-year table & charts

### Journey 2: Lifestyle First
1. Dashboard → "Start Discovery"
2. Step 1: Age range + household type
3. Step 2: PLSA tier OR income-based estimate
4. Step 3: Add exceptional items (travel, purchases, family, upgrades)
5. Save profile → "Use in Calculator"
6. Calculator pre-filled with lifestyle data
7. Continue as Journey 1

## Environment Variables

### Frontend (`.env.local` in root)
```
VITE_LOGTO_ENDPOINT=https://auth.retireplan.co.uk
VITE_LOGTO_APP_ID=pu4bsk6f3m9mox3vtxh8z
VITE_API_AUDIENCE=https://api.retireplan
```

### Backend (Vercel dashboard)
```
LOGTO_ISSUER=https://auth.retireplan.co.uk
MGMT_CLIENT_ID=<m2m-app-client-id>
MGMT_CLIENT_SECRET=<m2m-app-client-secret>
API_AUDIENCE=https://api.retireplan
MGMT_RESOURCE=https://auth.retireplan.co.uk/api
```

## Common Code Patterns

### Using Auth
```javascript
import { useAuth } from '../auth/AuthProvider';

const { isAuthenticated, userInfo, signIn, signOut, getAccessToken } = useAuth();

// Get API token
const token = await getAccessToken('https://api.retireplan');
```

### Reading LocalStorage Data
```javascript
import { loadAtRetirement, loadProjectionInputs, loadLifestyleProfile } from '../utils/persist';

const atRetData = loadAtRetirement();
const projData = loadProjectionInputs();
const lifestyle = loadLifestyleProfile();
```

### Saving to Cloud
```javascript
import { saveToCloud } from '../utils/persist';

await saveToCloud(getAccessToken, data);
```

### Navigation with State
```javascript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/projection', { state: { openingValues: results } });
```

### Receiving Route State
```javascript
import { useLocation } from 'react-router-dom';

const location = useLocation();
const openingValues = location.state?.openingValues;
```

## Common Tasks

### Add New Input Field to At-Retirement
1. Add to `form` state in `AtRetirement.jsx`
2. Add input in JSX form section
3. Update `handleSave()` to include in autosave
4. Update calculation logic in `src/logic/atRetirement.js`
5. Display new output in results section

### Add New Life Event Type
1. Update `LifeEvents.jsx` UI for new type
2. Update `calculateLifeEventsForAge()` in `projection.js` to handle new type
3. Update `ProjectionTable.jsx` to display impact if needed

### Modify Tax Calculation
1. Update constants in `src/utils/tax.js` (e.g., `TAX_2025_EWNI`, `TAX_2025_SCOTLAND`)
2. Update `estimateIncomeTax()` logic if calculation changes
3. Test with various income levels (PA taper, PSA, higher rates)

### Add New PLSA Tier
1. Update `PLSA_VALUES` in `src/utils/lifestyleProfile.js`
2. Update UI options in `LifestyleCalculator.jsx` Step 2
3. Update `generateProfileName()` to handle new tier

## Troubleshooting

### Auth Working but API Failing
- Check `.env.local` in root (not in `src/`)
- Verify `VITE_API_AUDIENCE` matches backend `API_AUDIENCE`
- Check Logto dashboard: API resource exists & app has access
- Check browser console for token exchange errors
- Check Vercel logs for JWT verification errors

### Data Not Persisting
- Check localStorage keys exist in DevTools
- Verify `isAuthenticated` is true when saving to cloud
- Check network tab for API request/response
- Check backend logs for Management API errors

### Projection Not Loading
- Ensure At-Retirement calculator completed first
- Check `location.state.openingValues` exists
- If missing, navigate to `/calculator` first

### Numbers Look Wrong
- Check inflation assumptions (used for both salary growth and contribution escalation)
- Verify tax region (England vs Scotland has different bands)
- Check PCLS cap (£268,275 total across all sources)
- Verify state pension age matches user's birth year

## Key Files Quick Index

**Main Components**:
- `src/components/Dashboard.jsx` - Landing page
- `src/components/AtRetirement.jsx` - Phase 1 calculator
- `src/components/LifestyleCalculator.jsx` - Lifestyle wizard
- `src/components/PostRetirementProjection.jsx` - Phase 2 projection
- `src/components/SaveBar.jsx` - Auth & save/load UI

**Logic**:
- `src/logic/atRetirement.js` - At-Retirement calculations
- `src/logic/projection.js` - Projection calculations
- `src/utils/tax.js` - Tax calculations
- `src/utils/lifestyleProfile.js` - PLSA & profile logic
- `src/utils/persist.js` - Data persistence

**API**:
- `api/me/retireplan.js` - Retirement data endpoint
- `api/me/lifestyle.js` - Lifestyle profile endpoint

**Config**:
- `src/App.jsx` - Route definitions
- `src/auth/AuthProvider.jsx` - Auth context
- `.env.local` - Frontend environment variables
- `vercel.json` - Vercel deployment config (if exists)

---

For detailed documentation, see `CLAUDE.md`.
