# Lifestyle Calculator - React Component Requirements & Integration Spec

## ⚠️ CRITICAL: Target Codebase
**This component is for: `RetirePlan-quickcheck` (Vite + React)**
**NOT for: `retireplan-app` (older codebase)**

Make sure you're working in the correct repository/directory before starting.

---

## Purpose
An optional lifestyle discovery tool that helps users identify their baseline retirement expenditure and exceptional lifestyle additions. Saves to Logto custom field and integrates with existing calculator modules.

---

## Strategic Context

### Why This Exists
Users often struggle to estimate retirement spending needs. This tool provides:
1. **Guidance** via PLSA benchmarks or income-based estimates
2. **Structure** for thinking about exceptional items beyond baseline
3. **Template** that pre-populates calculator modules

### User Journey
```
Login (first time) → Calculator Home
  ├─→ Default: Lifestyle Calculator shown prominently
  │     • Positioned alongside main calculator
  │     • "Skip" button clearly visible
  │     • Optional but encouraged
  │     ↓
  │   [Completes] → Saves to Logto → Module 1 (pre-populated)
  │   
  └─→ [Skips] → Module 1 directly (manual entry)

Login (returning) → Calculator Home
  ├─→ If profile exists: Both options shown equally
  │   
  └─→ If no profile: Lifestyle calculator still available

Module 1: At-Retirement
  • Baseline expenditure field (required)
  • If lifestyle profile exists → auto-populate
  • User can override/edit

Module 2: Projection Planner
  • Lifestyle events (optional inputs)
  • If lifestyle profile exists → auto-populate as working events
  • User can edit, delete, or add more
```

**Key principles:**
- First-time users SEE lifestyle calculator (encouraged)
- But can SKIP if they prefer (not forced)
- Returning users have equal access to both paths
- Profile is helpful, not mandatory

---

## UI Placement & Entry Points

### Entry Point 1: Calculator Home/Dashboard (Primary)

Add card/section **ALONGSIDE** main calculator CTA (equal prominence):

```
┌─────────────────────────────────────────────┬─────────────────────────────────────────────┐
│ 📊 Jump to Calculator                       │ 💭 Discover Your Lifestyle First            │
│                                             │                                             │
│ Already know your numbers?                  │ Not sure what retirement will cost?         │
│ Start calculating immediately               │ Take 5 minutes to explore your ideal       │
│                                             │ retirement lifestyle.                       │
│ [Start Calculating]                         │                                             │
│                                             │ We'll use this to pre-fill your             │
│                                             │ calculations and suggest lifestyle events.  │
│                                             │                                             │
│                                             │ [Start Discovery] [Skip for now]            │
│                                             │                                             │
│                                             │ Optional • 5 minutes • Update anytime       │
└─────────────────────────────────────────────┴─────────────────────────────────────────────┘
```

**Layout:** 
- Two cards side-by-side on desktop
- Stacked on mobile (Lifestyle Discovery on top)
- Equal visual weight
- Both prominent, neither forced

### Entry Point 2: Module 1 - Contextual Help (Secondary)

In the baseline expenditure section:
```
Annual Baseline Expenditure (required)

┌─────────────────────────────────────────┐
│ Need help estimating this?              │
│ [Discover Your Lifestyle Profile]       │ ← 5 min guided tool
└─────────────────────────────────────────┘

£ [_____] per year

[If profile exists:]
✓ Auto-filled from your lifestyle profile
  [Edit Profile] [Clear and enter manually]
```

### Entry Point 3: Settings/Profile (Tertiary)

In user settings/account area:
```
Your Planning Data
├── Personal Information
├── Pension Details
└── 💭 Lifestyle Profile [Edit] [Create]
```

**Allows users to:**
- Update their profile anytime
- See what they previously entered
- Delete and start fresh

---

## Component Flow (4 Steps)

### Step 1: Household Composition

**Question:** "Who will this retirement plan cover?"

**Options (single select):**
- ○ Just me (solo)
- ○ Me and my partner (couple)
- ○ Me plus dependents

**Data:** `householdType: "solo" | "couple" | "dependents"`

---

### Step 2: Baseline Expenditure

**Two paths offered:**

#### Path A: PLSA Guidelines (Recommended for most)

"Select the lifestyle level that resonates with you:"

**Three cards (single select):**

**1. Essential Comfort** - £14,400/year (solo) | £22,400/year (couple)
- All bills covered, basic comfort
- UK holiday once a year
- Occasional meals out
- Basic transport

**2. Moderate Comfort** - £31,300/year (solo) | £43,100/year (couple)
- Everything above, PLUS:
- Short overseas holiday annually
- Weekly dining out
- Regular hobbies
- Reliable car

**3. Comfortable Living** - £43,100/year (solo) | £59,000/year (couple)
- Everything above, PLUS:
- TWO overseas holidays per year
- Frequent entertainment
- New(er) car every few years
- More flexibility

Each card has expandable "What's included" details.

#### Path B: Custom Baseline (For higher earners or specific needs)

"I'll enter my own baseline"

**Helper (optional toggle):**
```
Quick Estimate Helper

Current household income range:
○ £25,000 - £40,000
○ £40,000 - £60,000
○ £60,000 - £80,000
○ £80,000 - £100,000
○ £100,000 - £150,000
○ £150,000+

Suggested baseline: £[min] - £[max]
(Most people need 70-80% of pre-retirement income)

[Use £[midpoint]] [I'll enter my own]
```

**Then:** `£ [_____] per year`

**What to include/exclude guidance shown**

**Data:** 
- `baselineTier: "minimum" | "moderate" | "comfortable" | "custom"`
- `baselineAmount: number` (in today's money)
- `baselineSource: "plsa" | "custom" | "income-range"`

---

### Step 3: Exceptional Items (Optional)

**Age-appropriate preamble:**
- **Under 45:** "Envision your future - what would you LOVE to do?"
- **45-55:** "What are you planning beyond day-to-day living?"
- **55+:** "What specific plans and commitments do you have?"

**Note:** "All amounts in today's money - we'll adjust for inflation later"

**Four categories (multi-select checkboxes):**

#### Category 1: Exceptional Travel
Beyond your baseline holidays:

- ☐ Bucket List Trip (£8k-£15k one-off)
  - When? Year ___ [or "Not sure yet"]
  
- ☐ Extended Travel - 3+ months (£15k-£25k one-off)
  - When? Year ___ [or "Not sure yet"]
  
- ☐ Regular Extra Long-Haul (+£5k/year)
  - Duration? ___ years [or "Throughout retirement"]

#### Category 2: Major Purchases

- ☐ New Car (£15k-£30k one-off)
  - When? Year ___
  
- ☐ Home Improvements (£10k-£50k one-off)
  - Amount? £___
  - When? Year ___
  
- ☐ Caravan/Motorhome (£20k-£60k one-off)
  - When? Year ___

#### Category 3: Family Support

- ☐ House Deposit Help (£20k-£50k one-off)
  - Amount? £___
  - When? Year ___
  
- ☐ Education Support (£2k-£10k/year)
  - Amount? £___ per year
  - Duration? ___ years
  
- ☐ Regular Financial Support
  - Amount? £___ per year
  - Duration? ___ years [or "Ongoing"]

#### Category 4: Lifestyle Upgrades

- ☐ Second Property/Holiday Home
  - Purchase: £___
  - Annual costs: £___
  
- ☐ Boat or Classic Car
  - Purchase: £___
  - Annual costs: £___
  
- ☐ Expensive Hobby (annual cost)
  - Amount? £___ per year

**Each category allows:** "None" or "I'll decide later" (especially for younger users)

**Data:** Array of items with:
```javascript
{
  category: "travel" | "purchase" | "family" | "upgrade",
  name: string,
  type: string,
  cost: number, // today's money
  timing: "oneOff" | "recurring" | "tbd",
  year: number | null,
  duration: number | null,
  isAspirational: boolean // true if user age < 45
}
```

---

### Step 4: Profile Results & Save

**Display:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your Retirement Lifestyle Profile

"The Comfortable Explorer"

BASELINE LIVING
Day-to-day comfort: Comfortable (PLSA)
Annual cost: £59,000/year (in today's money)

Includes: Two holidays/year, regular dining out,
cultural activities, reliable car, etc.

───────────────────────────────────

EXCEPTIONAL ADDITIONS
Beyond your baseline:

One-off expenses:
• Bucket list trip: £12,000 (Year 1)
• New car: £25,000 (Year 4)

Recurring additions:
• Education support: £3,000/year (5 years)

───────────────────────────────────

TOTAL ANNUAL NEED
£62,000/year (in today's money)

Plus one-off costs: £37,000 (Years 1-5)

💡 These amounts are in today's prices.
   The calculator will adjust for inflation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Save Profile & Start Planning]
[Edit] [Start Over]
```

**Profile name generation:**
- Tier + dominant category
- Examples: "The Comfortable Explorer", "The Premium Traveler", "The Moderate Supporter"

**On save:** Store to Logto custom field, navigate to Module 1

---

## Data Storage: Logto Custom Field

### Field Name
`lifestyleProfile`

### Data Structure
```javascript
{
  // Core profile
  householdType: "solo" | "couple" | "dependents",
  baselineTier: "minimum" | "moderate" | "comfortable" | "custom",
  baselineAmount: 59000, // Annual baseline in today's money
  baselineSource: "plsa" | "custom" | "income-range",
  profileName: "The Comfortable Explorer",
  
  // Inflation assumption
  inflationAssumption: "today", // Always today's money
  
  // User context
  userAge: 48, // At time of creation
  yearsToRetirement: 17, // Estimated
  
  // Exceptional items
  exceptionalItems: [
    {
      category: "travel",
      name: "Bucket list cruise",
      type: "bucketListTrip",
      cost: 12000, // Today's money
      timing: "oneOff",
      year: 1, // Year of retirement
      duration: null,
      isAspirational: false
    },
    {
      category: "family",
      name: "Grandchildren education support",
      type: "educationSupport",
      cost: 3000, // Annual, today's money
      timing: "recurring",
      year: 1,
      duration: 5,
      isAspirational: false
    }
  ],
  
  // Calculated totals (today's money)
  totalAnnualIncome: 62000, // Baseline + recurring
  totalOneOffCosts: 37000, // Sum of one-offs
  
  // Metadata
  createdAt: "2024-11-05T10:30:00Z",
  updatedAt: "2024-11-05T10:30:00Z",
  version: "1.0"
}
```

### CRUD Operations

**Create/Update:**
```javascript
// Save profile to Logto custom field
await updateUserCustomField('lifestyleProfile', profileData);
```

**Read:**
```javascript
// Retrieve profile from Logto
const profile = await getUserCustomField('lifestyleProfile');
```

**Delete:**
```javascript
// Clear profile
await updateUserCustomField('lifestyleProfile', null);
```

---

## Integration with Existing Modules

### Integration Point 1: Module 1 - At-Retirement Calculator

**Baseline Expenditure Field:**

**If NO lifestyle profile exists:**
```
Annual Baseline Expenditure (required)

Need help estimating this?
[Discover Your Lifestyle Profile] ← Opens lifestyle calculator

£ [_____] per year
```

**If lifestyle profile EXISTS:**
```
Annual Baseline Expenditure (required)

✓ Auto-filled from your lifestyle profile

£ [59,000] per year ← Pre-populated from profile.baselineAmount

[Edit Profile] [Clear and enter manually]
```

**Behavior:**
- On load, check if `lifestyleProfile` exists in Logto
- If exists, auto-populate field with `baselineAmount`
- Show indicator that it's from profile
- User can override manually
- If user edits manually, don't update profile (calculator value separate from saved profile)

---

### Integration Point 2: Module 2 - Projection Planner (Lifestyle Events)

**Current event input template:**
- Event name
- Age applied
- Amount £
- Expense or Income
- Recurring?
- Number of years

**Enhancement with lifestyle profile:**

**If NO lifestyle profile exists:**
```
Lifestyle Events (optional)

[Add Event] ← Existing functionality
```

**If lifestyle profile EXISTS:**

**If lifestyle profile EXISTS:**

**Auto-Populate Events (CONFIRMED APPROACH):**

```
Lifestyle Events (optional)

📋 Events from your lifestyle profile have been added below.
   You can edit, delete, or add more events.

Events List:
┌──────────────────────────────────────────┐
│ 1. Bucket list cruise                    │
│    Age 66 • £12,000 • Expense • One-off  │
│    [Edit] [Delete]                       │
├──────────────────────────────────────────┤
│ 2. New car                               │
│    Age 69 • £25,000 • Expense • One-off  │
│    [Edit] [Delete]                       │
├──────────────────────────────────────────┤
│ 3. Education support                     │
│    Age 66-70 • £3,000/year • Expense •   │
│    Recurring (5 years)                   │
│    [Edit] [Delete]                       │
└──────────────────────────────────────────┘

[Add Another Event]
```

**Behavior:**
1. On Module 2 load, check for `lifestyleProfile` in Logto
2. If exists, automatically transform `exceptionalItems` to event format  
3. Add them directly to the events list (pre-populated as working events)
4. User sees them immediately
5. User can edit, delete, or add more
6. All events treated equally in calculations

**Transformation Logic:**
```javascript
// From lifestyle profile
{
  name: "Bucket list cruise",
  cost: 12000,
  year: 1, // Year of retirement
  timing: "oneOff"
}

// Transformed to match your existing event structure
{
  name: "Bucket list cruise",
  age: userRetirementAge + 1, // Convert year to age
  amount: 12000,
  type: "expense", // All profile items are expenses
  recurring: false,
  years: 1
}
```

**Important:**
- Events from profile are fully editable/deletable
- Profile and working events remain separate
- Editing/deleting events doesn't modify saved profile
- Profile is template source, events are working data

---


### Progress Indicators
- Show "Step X of 4" throughout
- Allow back navigation to edit previous steps
- Auto-save progress to Logto custom field as user advances

### Mobile Responsiveness
- Stack cards vertically on mobile
- Touch-friendly controls
- Readable text sizes

### Age-Appropriate Messaging
Component receives user age from auth/Logto profile:
- **<45 years:** Aspirational language, emphasize flexibility, prominent "decide later" options
- **45-55 years:** Planning language, balanced approach
- **55+ years:** Commitment language, encourage precision

### Editing Saved Profile
Users can edit their profile anytime via:
1. Settings/Profile section
2. "Edit Profile" link in Module 1
3. Re-running lifestyle calculator (overwrites previous)

**On edit:**
- Load existing data into form
- Allow modification
- Save updates to Logto
- Update timestamp
- Don't affect already-created events in Module 2 (they're independent)

### Skip/Delete Profile
- "Skip for now" on entry points
- "Delete Profile" in settings
- Clearing profile doesn't affect manually-entered baseline or events

---

## Implementation Notes for Claude Code

### What Claude Code Should Do:

1. **Create React component(s)** matching existing app patterns
   - Use existing state management approach
   - Match existing styling and UI components
   - Follow existing routing conventions

2. **Add entry points** in:
   - Calculator home/dashboard
   - Module 1 baseline field section
   - User settings/profile area

3. **Implement Logto integration:**
   - Save profile to custom field `lifestyleProfile`
   - Retrieve profile on load
   - Update/delete as needed
   - Use existing Logto SDK/patterns in codebase

4. **Module 1 integration:**
   - Check for profile on load
   - Auto-populate baseline field if exists
   - Show profile indicator/edit link
   - Allow manual override

5. **Module 2 integration:**
   - Load `exceptionalItems` from profile
   - Transform to event template format
   - Display as selectable suggestions
   - Allow adding to working events list
   - Keep profile and events separate

6. **Age-appropriate messaging:**
   - Get user age from Logto profile
   - Adjust language throughout component
   - Show/hide "decide later" options based on age

### What You Already Know:
- ✅ React patterns and components used in this app
- ✅ State management approach
- ✅ Styling system and theme
- ✅ Logto authentication and custom fields
- ✅ Routing structure
- ✅ Existing Module 1 and Module 2 structure
- ✅ Event data structure in projection module

### PLSA Values (2024)
Hardcode these for now (easy to update annually):
```javascript
const PLSA_VALUES = {
  minimum: { solo: 14400, couple: 22400 },
  moderate: { solo: 31300, couple: 43100 },
  comfortable: { solo: 43100, couple: 59000 }
};
```

---

## Testing Checklist

### Functional Testing
- [ ] All four steps navigate correctly
- [ ] Back button preserves entered data
- [ ] PLSA values calculate correctly for solo vs couple
- [ ] Custom baseline helper calculates ranges correctly
- [ ] Exceptional items capture all fields
- [ ] Profile saves to Logto successfully
- [ ] Module 1 auto-populates from profile
- [ ] Module 2 shows profile items as templates
- [ ] Profile can be edited and updates save
- [ ] Profile can be deleted
- [ ] Skip functionality works at all entry points

### Integration Testing
- [ ] Works with existing Module 1 structure
- [ ] Works with existing Module 2 event system
- [ ] Logto custom field read/write works
- [ ] Age from Logto profile is used correctly
- [ ] Manual baseline entry doesn't break auto-population
- [ ] Events from profile don't interfere with custom events

### User Experience Testing
- [ ] Age-appropriate messaging displays correctly
- [ ] Mobile responsive on all screen sizes
- [ ] Navigation flows naturally
- [ ] Entry points are discoverable
- [ ] "Optional" nature is clear (not forced)
- [ ] Edit experience is smooth
- [ ] Clear what's from profile vs manual entry

---

## Success Metrics

### Adoption
- % of users who complete lifestyle profile
- % who skip vs complete
- % who edit profile later

### Impact
- Do users with profiles complete Module 1 faster?
- Do users with profiles add more events in Module 2?
- Do users with profiles have more realistic baselines?

### Technical
- Profile save success rate
- Integration errors with Module 1/2
- Mobile completion rate vs desktop

---

## Future Enhancements (Not MVP)

### Phase 2:
- AI suggestions based on demographics
- Comparison with similar profiles
- More granular customization
- Regional cost adjustments (London vs elsewhere)

### Phase 3:
- Interactive visualizations (spending over time)
- Scenario comparison (multiple profiles)
- Integration with open banking (current spending analysis)
- Inflation rate customization per item

---

## Summary for Claude Code

**You're building:**
A multi-step React component that helps users define their retirement lifestyle, saves to Logto custom field, and integrates with existing calculator modules.

**Key requirements:**
1. 4-step flow: Household → Baseline → Exceptional Items → Results
2. Save to Logto custom field `lifestyleProfile` (JSON)
3. Optional/skippable at all entry points
4. Module 1: Auto-populate baseline field from profile
5. Module 2: Show profile items as event templates
6. Age-appropriate messaging throughout
7. All amounts in today's money (inflation handled by calculator)
8. Mobile responsive, matches existing UI

**You already know how to:**
- Structure React components in this app
- Use Logto custom fields
- Style to match existing UI
- Route and navigate
- Integrate with existing modules

**Start with:**
- Reading existing Module 1 and Module 2 code
- Understanding current Logto custom field usage
- Identifying best place to inject lifestyle calculator entry points
- Building component structure to match app patterns

Good luck! 🚀
