# Implementation Plan: Unified 10-Module Wizard

## Overview

Transform the current fragmented calculator into a unified wizard with 10 logical modules, single data source, and dual entry points (guided wizard + quick navigation).

**Key Principles:**
- One source of truth for each data domain
- Reuse existing components where possible
- Incremental implementation with minimal disruption
- Preserve all current functionality
- Improve UX with logical flow
- **Clean break from old schema** (no migration - test users will start fresh)

---

## Architecture Changes

### Current Structure (to be replaced)
```
Dashboard (2 cards) → Lifestyle Calculator (separate) → At Retirement Calculator → Projection
- Lifestyle profile saved separately
- Life events duplicated between lifestyle and projection
- Classic view as separate interface
```

### New Structure
```
Welcome Page (2 cards: START HERE + QUICK NAVIGATION)
  ↓
Unified Wizard (10 modules, sequential or direct access)
  ↓
All data in single retirePlan structure
```

---

## Data Schema Changes

### New Unified Data Structure

```javascript
const retirePlanData = {
  // Module 1: Core Assumptions
  inputs: {
    dateOfBirth: "",
    retirementAge: "",
    lifeExpectancy: "",
    inflation: "",
    taxRegion: "englandWalesNI", // or "scotland"
  },

  // Module 2: Lifestyle Baseline
  lifestyle: {
    method: "plsa", // or "custom"
    householdType: "solo", // or "couple"
    ageRange: "65-74", // PLSA age bands
    plsaTier: "comfortable", // minimum/moderate/comfortable
    baselineAmount: 43100, // Annual spend target (from PLSA or custom)
  },

  // Module 3: DC Pensions
  dcPensions: [
    {
      id: "uuid",
      name: "",
      currentValue: 0,
      yourContribution: 0,
      employerContribution: 0,
      growthRate: 0,
      retirementOption: "drawdown", // or "annuity"
      annuityRate: 0,
    }
  ],

  // Module 4: DB Pensions
  dbPensions: [
    {
      id: "uuid",
      type: "active", // or "deferred"
      name: "",
      pensionableService: 0,
      accrualRate: 60, // 1/60th, 1/80th, etc
      currentSalary: 0, // active only
      salaryGrowth: 0, // active only
      preservedPension: 0, // deferred only
      revaluationRate: 0, // deferred only
      willCommutePCLS: false,
      commutationAmount: 0,
    }
  ],

  // Module 5: Savings & Investments
  savings: {
    cashISA: {
      currentValue: 0,
      growthRate: 0,
    },
    stocksSharesISA: {
      currentValue: 0,
      growthRate: 0,
    },
    taxableSavings: {
      currentValue: 0,
      growthRate: 0,
    },
  },

  // Module 6: Other Income
  otherIncome: [
    {
      id: "uuid",
      type: "property", // "dividend", "other"
      description: "",
      annualAmount: 0,
    }
  ],

  // Module 7: At Retirement Results (calculated)
  atRetirementResults: {
    // Output from atRetirement.js calculation
    // (same structure as current)
  },

  // Module 8: Savings During Retirement
  postRetirement: {
    isaInvestmentAnnual: 0, // Recurring ISA investment
    dcDrawdownPercent: 4, // % of DC pot to draw down
  },

  // Module 9: Lifestyle Events & Choices (ONE SOURCE OF TRUTH)
  lifeEvents: [
    {
      id: "uuid",
      name: "",
      age: 0,
      amount: 0, // Net amount (post-tax for income, gross for expenses)
      type: "expense", // or "income"
      isRecurring: false,
      recurringYears: 0,
      category: "travel", // "purchases", "family", "lifestyle", "income", "custom"
      source: "manual", // "suggestion" (from lifestyle), "manual" (user-created)
    }
  ],

  // Module 10: 25-Year Projection (calculated)
  projectionResults: {
    // Output from projection.js calculation
    // (same structure as current)
  },

  // Metadata
  metadata: {
    completedModules: [1, 2, 3], // Track which modules user has visited
    lastModified: "2026-01-08T12:34:56Z",
    version: "2.0", // Schema version
  }
}
```

### Migration Notes
**NO MIGRATION NEEDED** - Clean break from old schema. Test users will be deleted and start fresh with new schema.

---

## Implementation Phases

### Phase 0: Preparation (1-2 hours)
**Goal:** Set up foundation without breaking existing functionality

**Tasks:**
1. ✅ Create this implementation plan
2. Create new unified data schema file: `src/utils/dataSchema.js`
3. Create wizard navigation component: `src/components/wizard/WizardShell.jsx`
4. Create module registry: `src/components/wizard/moduleRegistry.js`
5. Create new Welcome page: `src/components/Welcome.jsx`
6. Update routing in `App.jsx` to add `/wizard` route (keep existing routes working)

**Files to create:**
- `src/utils/dataSchema.js` - Schema definition and migration utilities
- `src/components/wizard/WizardShell.jsx` - Wizard container with progress/navigation
- `src/components/wizard/moduleRegistry.js` - Module definitions and routing
- `src/components/Welcome.jsx` - New landing page (replaces Dashboard.jsx)

**Files to modify:**
- `src/App.jsx` - Add `/wizard` route, keep existing routes temporarily

---

### Phase 1: Core Wizard Infrastructure (3-4 hours)
**Goal:** Build wizard shell that can host modules

#### Task 1.1: Data Schema & Utilities
**File:** `src/utils/dataSchema.js`

Create:
- `defaultRetirePlanData` - Empty schema template
- `validateModule(moduleId, data)` - Validation for each module
- `getModuleCompletionStatus(moduleId, data)` - Check if module has required data

#### Task 1.2: Wizard Shell Component
**File:** `src/components/wizard/WizardShell.jsx`

Features:
- Top progress bar (10 dots, filled for completed modules)
- Module title display
- Previous/Next navigation buttons
- "Quick Navigation" dropdown (module selector)
- Data persistence (autosave to localStorage + cloud sync)
- Module routing (render correct module component)

Props:
```javascript
{
  retirePlanData: object,
  onDataChange: function,
  currentModule: number (1-10),
  onModuleChange: function,
}
```

#### Task 1.3: Module Registry
**File:** `src/components/wizard/moduleRegistry.js`

Define module metadata:
```javascript
export const MODULES = [
  {
    id: 1,
    title: "Core Assumptions",
    component: CoreAssumptionsModule,
    requiredFields: ["inputs.dateOfBirth", "inputs.retirementAge"],
    helpText: "Set your basic retirement planning assumptions...",
  },
  // ... all 10 modules
];
```

#### Task 1.4: Welcome Page
**File:** `src/components/Welcome.jsx`

Two cards:
1. **START HERE** - "Begin Your Retirement Plan" → `/wizard?module=1`
2. **QUICK NAVIGATION** - Dropdown module selector → `/wizard?module=X`

Design similar to current Dashboard but with dropdown for module selection.

---

### Phase 2: Implement Modules 1-6 (Pre-Retirement) (8-10 hours)

Implement each module as a separate component, reusing existing UI components where possible.

#### Module 1: Core Assumptions
**File:** `src/components/wizard/modules/Module1CoreAssumptions.jsx`

**Reuse from:** `AtRetirement.jsx` (Core Assumptions section)

**Inputs:**
- Date of Birth (date picker)
- Retirement Age (number)
- Life Expectancy (number, default 90)
- Inflation Rate (%, default 2.5)
- Tax Region (dropdown: England/Wales/NI or Scotland)

**Validation:**
- Date of birth must be in past
- Retirement age > current age
- Life expectancy > retirement age

**Time estimate:** 1 hour

---

#### Module 2: Lifestyle Baseline Expenditure
**File:** `src/components/wizard/modules/Module2Lifestyle.jsx`

**Reuse from:** `LifestyleCalculator.jsx` (Step 1 + Step 2)

**Structure:**
1. Radio button choice: "Use PLSA Benchmark" vs "Enter Custom Amount"
2. If PLSA:
   - Household type selector (solo/couple)
   - Age range selector (65-74, 75-84, 85+)
   - Tier cards (minimum/moderate/comfortable) with amounts and descriptions
3. If Custom:
   - Single input: Annual spend target (£)
4. Summary display: "Your lifestyle baseline: £43,100 per year"

**Data saved:**
- `lifestyle.method`
- `lifestyle.householdType`
- `lifestyle.ageRange`
- `lifestyle.plsaTier`
- `lifestyle.baselineAmount`

**Time estimate:** 2 hours

---

#### Module 3: DC Pensions
**File:** `src/components/wizard/modules/Module3DCPensions.jsx`

**Reuse from:** `AtRetirement.jsx` (DC Pensions section + DC Wizard modal)

**Structure:**
- List of added DC pensions (if any)
- "+ Add DC Pension" button → Opens wizard modal
- Each pension card shows: Name, Current Value, Contributions, Growth Rate
- Edit/Delete buttons on each card

**DC Wizard Modal (reuse existing):**
- Current pot value
- Your contribution
- Employer contribution
- Growth rate
- Retirement option (drawdown/annuity)
- Annuity rate (if annuity selected)

**Data saved:** `dcPensions[]` array

**Time estimate:** 1.5 hours (mostly reuse)

---

#### Module 4: DB Pensions
**File:** `src/components/wizard/modules/Module4DBPensions.jsx`

**Reuse from:** `AtRetirement.jsx` (DB Pensions section + DB Wizard modal)

**Structure:**
- List of added DB pensions (if any)
- "+ Add DB Pension" button → Opens wizard modal
- Each pension card shows: Name, Type (Active/Deferred), Key values
- Edit/Delete buttons on each card

**DB Wizard Modal (reuse existing):**
- Step 1: Active or Deferred
- Step 2: Scheme details (service, accrual, salary/preserved)
- Step 3: PCLS commutation

**Data saved:** `dbPensions[]` array

**Time estimate:** 1.5 hours (mostly reuse)

---

#### Module 5: Savings & Investments
**File:** `src/components/wizard/modules/Module5Savings.jsx`

**Reuse from:** `AtRetirement.jsx` (Savings section)

**Structure:**
- Cash ISA (current value, growth rate)
- Stocks & Shares ISA (current value, growth rate)
- Other Taxable Savings (current value, growth rate)

**Remove:** Property equity input (no longer included)

**Data saved:** `savings.cashISA`, `savings.stocksSharesISA`, `savings.taxableSavings`

**Time estimate:** 1 hour

---

#### Module 6: Other Income
**File:** `src/components/wizard/modules/Module6OtherIncome.jsx`

**Reuse from:** `AtRetirement.jsx` (Other Income section)

**Structure:**
- List of other income sources (if any)
- "+ Add Income Source" button
- Each item: Type dropdown (Property Rental/Dividend/Other), Description, Annual Amount
- Edit/Delete buttons

**Data saved:** `otherIncome[]` array

**Time estimate:** 1 hour

---

### Phase 3: Implement Module 7 (Results & Modelling) (4-5 hours)

#### Module 7: At Retirement Results
**File:** `src/components/wizard/modules/Module7Results.jsx`

**Reuse from:** `AtRetirement.jsx` (Results section + modelling sliders)

**Structure:**
1. Run calculation: `atRetirement(retirePlanData)` → results
2. Display summary card (total income, expenditure, surplus/shortfall)
3. Show detailed breakdown tables (same as current)
4. Interactive sliders for modelling (same as current)
5. "Continue to Post-Retirement Planning" button → Module 8

**Calculation:**
- Extract data from modules 1-6
- Call `src/logic/atRetirement.js` (no changes needed to calculation logic)
- Display results

**Data saved:** `atRetirementResults` (calculated values)

**Time estimate:** 3 hours (mostly reuse display components)

---

### Phase 4: Implement Modules 8-9 (Post-Retirement Planning) (6-8 hours)

#### Module 8: Savings During Retirement
**File:** `src/components/wizard/modules/Module8PostRetirementSavings.jsx`

**Reuse from:** `PostRetirementProjection.jsx` (ProjectionInputs component)

**Structure:**
- ISA Investment (annual amount to invest from taxable savings)
- DC Drawdown Strategy (% of pot to draw down annually)
- Help text explaining each option

**Data saved:** `postRetirement.isaInvestmentAnnual`, `postRetirement.dcDrawdownPercent`

**Time estimate:** 1.5 hours

---

#### Module 9: Lifestyle Events & Choices
**File:** `src/components/wizard/modules/Module9LifeEvents.jsx`

**THIS IS THE KEY MODULE - Most complex**

**Reuse from:**
- `LifestyleCalculator.jsx` (Step 3: Exceptional Items)
- `LifeEvents.jsx` (Event editing UI)

**Structure:**

1. **Category-based suggestions** (similar to lifestyle calculator Step 3):
   - Travel
   - Major Purchases
   - Family Support
   - Lifestyle Upgrades
   - Income (NEW - for inheritances, part-time work, etc.)

2. **For each category, show suggestions:**
   ```
   Category: Travel
   [✓] Annual Holiday (£5,000/year for 10 years) [Edit] [Remove]
   [✓] Dream Vacation (£15,000 at age 70)       [Edit] [Remove]
   [+] Add custom event
   ```

3. **Event editor (inline or modal):**
   - Event name (text input, editable)
   - Type (Income/Expense toggle)
   - Age to occur (number)
   - Amount (£, with tooltip: "Enter net amount after tax for income items")
   - Recurring? (checkbox)
     - If yes: Number of years (input)

4. **Summary panel:**
   - Total one-off events: £X
   - Total annual recurring: £Y
   - Total cost over retirement: £Z
   - "Your Events Profile: The Comfortable Explorer" (generated name)

**Data flow:**
- On first visit: Load suggestions from `lifestyleProfile.js` (PLSA-based)
- User can edit/delete/add events
- All changes save to `lifeEvents[]` array (ONE SOURCE OF TRUTH)
- No separate "lifestyle profile" - this IS the profile

**Implementation approach:**

A. **Suggestions system:**
```javascript
// src/utils/lifestyleEventSuggestions.js
export const getSuggestionsForTier = (plsaTier, retirementAge, lifeExpectancy) => {
  return {
    travel: [
      { name: "Annual Holiday", amount: 5000, age: retirementAge, isRecurring: true, recurringYears: 10 },
      { name: "Dream Vacation", amount: 15000, age: retirementAge + 5, isRecurring: false },
    ],
    purchases: [
      { name: "New Car", amount: 20000, age: retirementAge + 3, isRecurring: false },
    ],
    // ... etc
  };
};
```

B. **Event editor component:**
Reuse `LifeEvents.jsx` but enhance:
- Add "Type" toggle (Income/Expense)
- Add category field
- Add source tracking ("suggestion" vs "manual")
- Show suggestions as pre-filled editable cards

C. **Profile name generator:**
```javascript
// Analyze dominant category + tier → generate name
// "The Comfortable Explorer" (travel-focused comfortable tier)
// "The Generous Provider" (family-focused)
// etc.
```

**Data saved:** `lifeEvents[]` array (THE authoritative source)

**Time estimate:** 5 hours (most complex module)

---

### Phase 5: Implement Module 10 (Projection Results) (3-4 hours)

#### Module 10: 25-Year Projection
**File:** `src/components/wizard/modules/Module10Projection.jsx`

**Reuse from:** `PostRetirementProjection.jsx` (ProjectionTable, ProjectionCharts)

**Structure:**
1. Run calculation: `calculateProjection(retirePlanData)` → 25-year projection
2. Display summary (depletion warnings, key metrics)
3. Show year-by-year table (same as current ProjectionTable)
4. Show charts (same as current ProjectionCharts)
5. Export/Print buttons

**Calculation:**
- Extract `atRetirementResults` (Module 7 outputs)
- Extract `postRetirement` inputs (Module 8)
- Extract `lifeEvents` (Module 9)
- Call `src/logic/projection.js` (no changes needed)
- Display results

**Data saved:** `projectionResults` (calculated values)

**Time estimate:** 2 hours (mostly reuse)

---

### Phase 6: Data Persistence & Cloud Sync (1-2 hours)

#### Task 6.1: Update Backend API
**Files:** `api/me/retireplan.js`

**Changes:**
- Accept new unified data schema
- Store entire `retirePlanData` object in `customData.retirePlan.latest`
- No backwards compatibility needed (clean break)

**Simplified - just save/load new schema:**
```javascript
// In API endpoint
async function handler(req) {
  // ... auth logic

  if (req.method === 'GET') {
    const user = await getUser(userId, mgmtToken);
    return res.json(user.customData?.retirePlan?.latest || null);
  }

  if (req.method === 'POST') {
    const data = req.body; // New unified schema
    await updateUser(userId, mgmtToken, {
      customData: {
        retirePlan: { latest: data }
      }
    });
    return res.json({ success: true });
  }
}
```

#### Task 6.2: Remove Lifestyle Profile Endpoint
**Files:** `api/me/lifestyle.js`

**Changes:**
- Delete this file entirely (no longer needed)
- Lifestyle data now in main retirePlan structure

#### Task 6.3: Update Persistence Logic
**Files:** `src/utils/persist.js`

**Changes:**
- Simplify to use new unified schema only
- Update localStorage keys: `retireplan-wizard-data` (single key)
- Remove old autosave logic (clean break)

**Time estimate:** 1.5 hours

---

### Phase 7: Navigation & UX Polish (2-3 hours)

#### Task 7.1: Wizard Navigation
**File:** `src/components/wizard/WizardShell.jsx`

**Features to implement:**
- Module validation before advancing (required fields filled)
- Progress saving (which modules completed)
- "Skip" option for optional modules
- Breadcrumb navigation (current module highlighted)
- Quick Navigation dropdown (jump to any module)
- Exit wizard (save and return to welcome)

#### Task 7.2: Welcome Page Integration
**File:** `src/components/Welcome.jsx`

**Features:**
- Detect if user has saved data → Show "Continue Your Plan" option
- Show last completed module → "Resume at Module X"
- Quick Navigation dropdown pre-populated with module titles

#### Task 7.3: Header/SaveBar Updates
**Files:** `src/components/HeaderLayout.jsx`, `src/components/SaveBar.jsx`

**Changes:**
- Update SaveBar to work with wizard (single data structure)
- Remove separate lifestyle profile save/load
- Show wizard progress in header (optional)

**Time estimate:** 2 hours

---

### Phase 8: Remove Legacy Code (2-3 hours)

#### Task 8.1: Remove Old Routes
**File:** `src/App.jsx`

**Remove:**
- `/calculator` route (replaced by `/wizard`)
- `/lifestyle` route (now Module 2 + Module 9)
- `/projection` route (now Module 10)

**Keep:**
- `/` (Welcome page)
- `/wizard` (unified wizard)

#### Task 8.2: Archive Old Components
**Move to `src/components/_archive/`:**
- `Dashboard.jsx` (replaced by Welcome.jsx)
- `AtRetirement.jsx` (functionality now in wizard modules)
- `LifestyleCalculator.jsx` (functionality in Module 2 + Module 9)
- `PostRetirementProjection.jsx` (functionality in Module 10)

**Keep (still used):**
- `LifeEvents.jsx` (reused in Module 9, may need minor updates)
- `ProjectionTable.jsx` (reused in Module 10)
- `ProjectionCharts.jsx` (reused in Module 10)
- `SaveBar.jsx` (updated for wizard)
- All UI components in `src/components/ui/`

#### Task 8.3: Update CLAUDE.md
**File:** `CLAUDE.md`

Update documentation to reflect new architecture:
- New data schema
- Module structure
- Removed dual data sources (lifestyle profile merged into retirePlan)
- Updated file references

**Time estimate:** 2 hours

---

### Phase 9: Testing & Bug Fixes (4-6 hours)

#### Testing Checklist:

**Module Flow:**
- [ ] Can complete wizard start to finish
- [ ] Can skip optional modules
- [ ] Can jump to specific module via Quick Navigation
- [ ] Progress saved between sessions
- [ ] Required field validation works

**Data Persistence:**
- [ ] Autosave works (localStorage with new schema)
- [ ] Cloud save works (authenticated users)
- [ ] Cloud load works with new unified schema
- [ ] No data loss when navigating between modules

**Calculations:**
- [ ] Module 7 results are accurate
- [ ] Module 10 projection is accurate
- [ ] Life events from Module 9 appear correctly in projection
- [ ] Tax calculations correct

**UI/UX:**
- [ ] Mobile responsive (all modules)
- [ ] Help text displays correctly
- [ ] Validation messages clear
- [ ] No console errors/warnings
- [ ] Charts and tables render correctly

**Edge Cases:**
- [ ] Already retired users (retirement age < current age)
- [ ] No DC pensions
- [ ] No DB pensions
- [ ] No life events
- [ ] Very large numbers (£1M+ pots)

**Time estimate:** 5 hours

---

## Summary Timeline

| Phase | Description | Time Estimate |
|-------|-------------|---------------|
| 0 | Preparation | 1-2 hours |
| 1 | Wizard Infrastructure | 3-4 hours |
| 2 | Modules 1-6 (Pre-Retirement) | 8-10 hours |
| 3 | Module 7 (Results) | 4-5 hours |
| 4 | Modules 8-9 (Post-Retirement) | 6-8 hours |
| 5 | Module 10 (Projection) | 3-4 hours |
| 6 | Data Persistence (simplified) | 1-2 hours |
| 7 | Navigation & UX | 2-3 hours |
| 8 | Remove Legacy Code | 2-3 hours |
| 9 | Testing & Bug Fixes | 3-4 hours |
| **TOTAL** | **Full Implementation** | **33-45 hours** |

**Realistic estimate: 35-40 hours (1 week of full-time work)**

---

## Implementation Strategy

**Clean Break Approach** (no migration needed):
- Test users will be deleted and start fresh
- No backwards compatibility required
- Simpler, faster implementation

**Recommended approach:**
1. Build wizard (Phases 0-5) with `/wizard` route alongside existing app
2. Test thoroughly with fresh data
3. Implement new data persistence (Phase 6)
4. Test end-to-end with new schema
5. Deploy and delete test users
6. Remove legacy code (Phase 8) immediately after deploy

---

## Key Risks & Mitigations

### Risk 1: Calculation Errors
**Mitigation:**
- Reuse existing calculation functions (atRetirement.js, projection.js) unchanged
- Test with multiple scenarios (edge cases, extreme values)
- Compare results manually with known good examples

### Risk 2: User Confusion with New Flow
**Mitigation:**
- Clear welcome page explaining new flow
- Help text in each module
- Logical progression of modules
- Quick Navigation for power users

### Risk 3: Development Time Underestimated
**Mitigation:**
- Break into phases with clear deliverables
- Test each phase before moving to next
- Focus on core functionality first, polish later
- Incremental commits allow rollback if needed

### Risk 4: Data Loss Between Modules
**Mitigation:**
- Autosave after every input change
- Store entire wizard state in single object
- Test navigation extensively (forward, back, jump to module)

---

## Next Steps

1. **Review this plan** - Ensure all requirements captured
2. **Backup code** - User doing this now
3. **Create git branch** - `feature/unified-wizard`
4. **Start Phase 0** - Set up infrastructure
5. **Incremental commits** - Commit after each module
6. **Regular testing** - Test after each phase

**Ready to begin Phase 0?**
