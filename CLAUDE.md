# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RetirePlan QuickCheck is a React-based retirement planning calculator.

**Current Status:**
- **Phase 1 (Working)**: "At Retirement" calculator - gathers user input for current savings and pensions, projects to retirement age, produces summary of income, expenditure, and assets. Includes sliders to adjust key inputs.
- **Phase 2 (Planned)**: Post-retirement projection - will take "at retirement" data and create a 20-25 year projection forward.
- **Data Persistence**: All data can be saved to Logto custom field and restored. LocalStorage autosave also works.
- **Authentication**: Logto integration works - menu changes to show "Save data" button when authenticated.

**=4 PRIORITY ISSUE**: Token exchange for saving data is currently failing. Authentication succeeds but API calls fail during token exchange/verification when trying to save data to backend.

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

- **Entry Point**: `src/main.jsx` wraps the app with `AuthProvider` for authentication context
- **Main App**: `src/App.jsx` renders the main calculator component `AtRetirement`
- **Authentication**: `src/auth/` contains Logto integration
  - `AuthProvider.jsx`: React context providing auth state and methods (`useAuth` hook)
  - `logtoClient.js`: Singleton Logto client (deprecated, use AuthProvider instead)
- **Components**: `src/components/`
  - `AtRetirement.jsx`: Main retirement calculator form and results display (large file ~800 lines)
  - `SaveBar.jsx`: Authentication UI, save/load functionality, export/import
- **Business Logic**: `src/logic/`
  - `atRetirement.js`: Core calculation engine for retirement projections
- **Utilities**: `src/utils/`
  - `tax.js`: UK tax calculations (England/Wales/NI and Scotland)
  - `persist.js`: LocalStorage autosave functionality

### Backend Structure

- **API**: `api/me/retireplan.js` - Vercel serverless function
  - GET: Retrieve user's saved retirement plan data
  - POST: Save retirement plan data to user's Logto custom_data via Management API
  - Uses JWT verification with `jose` library
  - Requires Management API credentials (client_id/secret) via environment variables

### Data Flow

1. User inputs are managed in `AtRetirement.jsx` component state
2. The `atRetirement()` function in `src/logic/atRetirement.js` performs calculations
3. Results are displayed in the UI and can be:
   - Auto-saved to localStorage (via `persist.js`)  WORKS
   - Saved to user account (via `/api/me/retireplan` endpoint) L TOKEN ISSUE
   - Exported/imported as JSON files  WORKS

### Authentication Flow

1. User clicks "Login to save" ’ `AuthProvider` calls `LogtoClient.signIn()`
2. Logto redirects to auth page, then back with `?code=...&state=...`
3. `AuthProvider` detects callback params, calls `handleSignInCallback()`
4. Auth state is synced (`isAuthenticated`, `userInfo`)  WORKS
5. SaveBar displays user info and "Save data" button  WORKS
6. **When saving**, `getAccessToken(audience)` requests an API-scoped JWT L FAILS HERE
7. Backend verifies JWT and saves to Logto Management API

### Token Exchange Issue (Current Problem)

**Location**: `src/components/SaveBar.jsx` in `saveProfile()` function (lines 64-101)

**Issue**: The app can authenticate successfully, but when trying to save data, the token exchange fails.

**Current Implementation**:
```javascript
const audience = import.meta.env.VITE_API_AUDIENCE; // "https://api.retireplan"
const token = await getAccessToken(audience);
// Then sends token to /api/me/retireplan
```

**AuthProvider Setup** (`src/auth/AuthProvider.jsx`):
- LogtoClient initialized WITHOUT resources array (line 29 comment: "no resources here")
- Scopes: `['openid', 'profile', 'email', 'offline_access', 'custom_data']`
- `getAccessToken()` function accepts optional audience parameter (lines 75-79)

**Known Issues**:
1. `.env.local` file is in `src/components/` directory (wrong location - should be in project root)
2. LogtoClient may need `resources` configured during initialization to request audience tokens
3. Backend JWT verification may be expecting different audience/issuer format
4. Missing MGMT_RESOURCE definition in backend (line 8: `const MGMT_RESOURCE = process.env.MGMT_RESOURCE || ${MGMT_BASE}/api` but MGMT_BASE is undefined)

**Debugging Commands**:
- Check browser console for token exchange errors
- Click "Debug: GET account" button to test Account API token (uses no audience)
- Inspect Network tab for `/api/me/retireplan` request/response
- Check Vercel function logs for JWT verification errors

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
API_AUDIENCE=https://api.retireplan  # Optional, for JWT verification
MGMT_RESOURCE=<logto-management-api-resource>  # Currently undefined/broken
```

## Key Calculations

The `atRetirement()` function in `src/logic/atRetirement.js` handles:

- **Years to retirement**: Calculated from date of birth (using precise decimal years via `yearsBetween()`)
- **DC projections**: Pot growth + employer/personal contributions (start-of-year timing)
- **DB projections**: Active schemes (accrual on final salary) and deferred schemes (preserved pension with revaluation)
- **PCLS (Pension Commencement Lump Sum)**: 25% tax-free cash from DC/DB (capped at £268,275 total)
- **Income streams**: DC drawdown/annuity, DB pension, state pension, other income, savings interest
- **Tax**: UK income tax calculation (Personal Allowance taper, PSA) using `tax.js`
- **Real vs Nominal**: All outputs shown in both nominal (at retirement) and real (today's money) terms

### Calculation Specifics

- **Contribution Timing**: DC contributions use start-of-year timing (year 1 = first year of contributions)
- **Inflation Simplification**: Salary growth and personal contribution escalation both use the inflation assumption
- **Tax Bands**: Configured in `TAX_2025_EWNI` and `TAX_2025_SCOTLAND` constants
- **DB Commutation Factor**: Fixed at 20 (£20 lump sum per £1 annual pension surrendered)
- **State Pension Age Warning**: App warns if retirement age < state pension age

## Troubleshooting Token Exchange

### Step 1: Fix Environment Variables Location
```bash
# Move .env.local to project root
mv src/components/.env.local .env.local
```

### Step 2: Verify Logto Application Configuration
In Logto dashboard, check that:
- The application has the API resource `https://api.retireplan` configured
- The resource has the necessary permissions/scopes
- The application can request tokens for this resource

### Step 3: Update AuthProvider to Request Resource
The LogtoClient may need to know about the resource upfront:
```javascript
// In src/auth/AuthProvider.jsx
const client = useMemo(
  () =>
    new LogtoClient({
      endpoint,
      appId,
      scopes: ['openid', 'profile', 'email', 'offline_access', 'custom_data'],
      resources: ['https://api.retireplan'], // Add this
    }),
  [endpoint, appId]
);
```

### Step 4: Fix Backend MGMT_RESOURCE
In `api/me/retireplan.js`, line 8 references `MGMT_BASE` which doesn't exist:
```javascript
// Current (broken):
const MGMT_RESOURCE = process.env.MGMT_RESOURCE || `${MGMT_BASE}/api`;

// Should be:
const MGMT_RESOURCE = process.env.MGMT_RESOURCE || `${ISSUER}/api`;
```

### Step 5: Check JWT Verification
The backend verifies JWTs with:
```javascript
const { payload } = await jwtVerify(token, jwks, {
  issuer: `${ISSUER}/oidc`,
  ...(API_AUDIENCE ? { audience: API_AUDIENCE } : {}),
});
```

Ensure:
- `ISSUER` matches Logto endpoint exactly (no trailing slash)
- `API_AUDIENCE` matches what frontend requests
- JWKS URL is correct: `${ISSUER}/oidc/jwks`

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

### Modifying Calculations

When updating calculation logic in `src/logic/atRetirement.js`:
- Ensure both nominal and real-terms outputs are updated
- Test with edge cases (already retired, zero contributions, PCLS cap exceeded)
- Update corresponding tax calculations if income structure changes

### Adding New Input Fields

1. Add field to `form` state in `AtRetirement.jsx`
2. Update autosave payload in `handleSave()` function
3. Add corresponding calculation logic in `atRetirement()`
4. Update UI to display new input/output

## Important Implementation Notes

- **Logto Storage Cleanup**: `AuthProvider` clears stale `logto:*` localStorage keys on auth errors (line 9-16)
- **SaveBar Bug**: Lines 82-87 define a `body` variable that's never used (dead code after refactor)
- **Buffered Input Pattern**: `Txt` component in `AtRetirement.jsx` (lines 18-42) buffers input changes, only commits on blur/Enter
- **Number Formatting**: `fmt()` helper formats numbers with thousand separators, no decimals
- **String to Number Conversion**: `N()` helper safely converts form strings to numbers (treats empty/null as 0)
