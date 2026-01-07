# Race Condition Diagrams - RetirePlan QuickCheck

## Race Condition #1: AtRetirement Lifestyle Profile Baseline

### Current Behavior (Broken)

```
User Signs In
     │
     ├────────────────────────────────────────────────┐
     │                                                │
     ▼                                                ▼
┌─────────────────────┐                    ┌──────────────────────┐
│ AtRetirement.jsx    │                    │ SaveBar.jsx          │
│ useEffect (line 503)│                    │ useEffect (line 139) │
└─────────────────────┘                    └──────────────────────┘
     │                                                │
     │ isAuthenticated = true                         │ isAuthenticated &&
     │                                                │ userInfo present
     ▼                                                ▼
┌─────────────────────────────────────┐    ┌───────────────────────────────┐
│ fetch('/api/me/lifestyle')          │    │ fetch('/api/me/retireplan')   │
│                                     │    │                               │
│ ASYNC REQUEST                       │    │ ASYNC REQUEST                 │
└─────────────────────────────────────┘    └───────────────────────────────┘
     │                                                │
     │ T=200ms                                        │ T=500ms
     ▼                                                ▼
┌─────────────────────────────────────┐    ┌───────────────────────────────┐
│ Response:                           │    │ Response:                     │
│ { baselineAmount: 45000,            │    │ { inputs: {                   │
│   exceptionalItems: [...] }         │    │     desiredSpendAnnual: ""    │
│                                     │    │   }                           │
└─────────────────────────────────────┘    │ }                             │
     │                                      └───────────────────────────────┘
     ▼                                                │
┌─────────────────────────────────────┐              │
│ setLifestyleProfile(profile)        │              │
└─────────────────────────────────────┘              │
     │                                                │
     ▼                                                │
┌─────────────────────────────────────┐              │
│ Check: form.desiredSpendAnnual      │              │
│ empty?                              │              │
│ YES (empty string from              │              │
│ sessionStorage)                     │              │
└─────────────────────────────────────┘              │
     │                                                │
     ▼                                                │
┌─────────────────────────────────────┐              │
│ setForm({                           │              │
│   desiredSpendAnnual: "45000"       │ ← VALUE SET  │
│ })                                  │              │
└─────────────────────────────────────┘              │
     │                                                │
     │                                                │
     │ T=501ms                                        │
     │                                                ▼
     │                                     ┌───────────────────────┐
     │                                     │ onImportJson(data)    │
     │                                     └───────────────────────┘
     │                                                │
     │                                                ▼
     │                                     ┌───────────────────────┐
     │                                     │ setForm({             │
     │                                     │   ...data.inputs      │
     │ VALUE OVERWRITTEN ──────────────────┤ }) // includes        │
     │ (back to empty string)              │ // desiredSpend: ""   │
     │                                     └───────────────────────┘
     │                                                │
     ▼                                                ▼
┌─────────────────────┐                    ┌───────────────────────┐
│ RESULT:             │                    │ RESULT:               │
│ Lifestyle baseline  │                    │ Cloud data wins,      │
│ loaded but lost     │                    │ overwrites lifestyle  │
└─────────────────────┘                    └───────────────────────┘
```

### Timeline View

```
T=0ms     Component Mount
          ├─ sessionStorage loads (form.desiredSpendAnnual = "")
          │
T=50ms    SaveBar triggers /api/me/retireplan
          │
T=100ms   AtRetirement triggers /api/me/lifestyle
          │
T=200ms   ✓ /api/me/lifestyle responds
          ├─ setLifestyleProfile({ baselineAmount: 45000 })
          ├─ Check: form.desiredSpendAnnual empty? YES
          └─ setForm({ desiredSpendAnnual: "45000" }) ✓
          │
T=500ms   ✓ /api/me/retireplan responds
          ├─ data.inputs.desiredSpendAnnual = ""
          └─ onImportJson() calls setForm({ ...data.inputs })
          │
T=501ms   ✗ form.desiredSpendAnnual = "" (OVERWRITTEN!)
```

---

## Race Condition #2: PostRetirementProjection Lifecycle Events

### Current Behavior (Broken)

```
User Navigates to /projection
     │
     ├────────────────────────────────────────────────┐
     │                                                │
     ▼                                                ▼
┌──────────────────────────┐              ┌──────────────────────┐
│ PostRetirementProjection │              │ SaveBar.jsx          │
│ Component Mount          │              │ useEffect (line 139) │
└──────────────────────────┘              └──────────────────────┘
     │                                                │
     ▼                                                ▼
┌──────────────────────────────────────┐  ┌───────────────────────────┐
│ useState initialization (line 41-50) │  │ loadProfile()             │
│ loadProjectionInputs()               │  │                           │
│ ├─ isaRecurringAmount                │  │ Calls:                    │
│ ├─ isaRecurringYears                 │  │ • onCloudLoadStart()      │
│ ├─ dcDrawdownPercent                 │  │ • fetch('/api/me/...)     │
│ └─ lifeEvents = []                   │  │                           │
└──────────────────────────────────────┘  └───────────────────────────┘
     │                                                │
     ▼                                                ▼
┌──────────────────────────────────────┐  ┌───────────────────────────┐
│ useEffect (line 59-102)              │  │ ASYNC fetch in progress   │
│ Initial load timer                   │  │                           │
│ setTimeout(500ms)                    │  │                           │
└──────────────────────────────────────┘  └───────────────────────────┘
     │                                                │
T=500ms                                               │
     ▼                                                │
┌──────────────────────────────────────┐              │
│ Timeout expires                      │              │
│ Check: isAuthenticated? YES          │              │
│ Check: cloudLoadPendingRef? NO       │              │
│ (SaveBar hasn't set it!)             │              │
│                                      │              │
│ Action: SKIP triggerProfileLoad     │              │
│ (only for !isAuthenticated)          │              │
└──────────────────────────────────────┘              │
     │                                                │
     │                                          T=700ms
     │                                                ▼
     │                                     ┌────────────────────────┐
     │                                     │ /api/me/retireplan     │
     │                                     │ responds               │
     │                                     └────────────────────────┘
     │                                                │
     │                                                ▼
     │                                     ┌────────────────────────┐
     │                                     │ onCloudLoadComplete()  │
     │                                     │ Called FIRST           │
     │                                     └────────────────────────┘
     │                                                │
     │                                                ▼
     │    ┌───────────────────────────────────────────┘
     │    │
     ▼    ▼
┌──────────────────────────────────────┐
│ setTriggerProfileLoad(prev => +1)    │ ← NOW triggered!
│ triggerProfileLoad: 0 → 1            │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ useEffect (line 105-213) triggers    │
│ Lifecycle profile load               │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ fetch('/api/me/lifestyle')           │
│ ASYNC REQUEST                        │
└──────────────────────────────────────┘
     │
T=800ms
     ▼
┌──────────────────────────────────────┐
│ Response:                            │
│ { exceptionalItems: [                │
│     { name: 'Holiday', cost: 5000 }  │
│   ]                                  │
│ }                                    │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ transformToProjectionEvents()        │
│ Creates:                             │
│ [{ id: '123', name: 'Holiday',       │
│    amount: 5000, type: 'expense',    │
│    source: 'lifestyleProfile' }]     │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ Smart merge:                         │
│ const manual = lifeEvents.filter(    │
│   e => e.source !== 'lifestyleProfile'│
│ );                                   │
│ const merged = [                     │
│   ...manual, ...profileEvents        │ ← LIFECYCLE EVENTS SET
│ ];                                   │
│ setLifeEvents(merged);               │
└──────────────────────────────────────┘
     │
T=801ms
     │
     │  ┌──────────────────────────────────────┐
     │  │ Meanwhile, SaveBar continues...      │
     │  │ (loadProfile hasn't finished yet!)   │
     │  └──────────────────────────────────────┘
     │                 │
     │          T=850ms (after onCloudLoadComplete)
     │                 ▼
     │  ┌──────────────────────────────────────┐
     │  │ SaveBar.loadProfile() line 58-67:    │
     │  │                                      │
     │  │ const data = await res.json();       │
     │  │ if (data && data.inputs) {           │
     │  │   onImportJson?.(data);              │ ← Called AFTER complete!
     │  │ }                                    │
     │  │ onCloudLoadComplete?.();             │ (already called)
     │  └──────────────────────────────────────┘
     │                 │
     │                 ▼
     │  ┌──────────────────────────────────────┐
     │  │ onImportJson(data) (line 344-363)    │
     │  └──────────────────────────────────────┘
     │                 │
     │                 ▼
     └─────────────────▶ setLifeEvents(data.projection.lifeEvents || [])
                        ││
                        ││ OVERWRITES LIFECYCLE EVENTS!
                        ││ Back to empty array []
                        ▼▼
                 ┌──────────────────┐
                 │ RESULT:          │
                 │ lifeEvents = []  │
                 │ (lost lifecycle  │
                 │  profile data)   │
                 └──────────────────┘
```

### Timeline View

```
T=0ms     Component Mount
          ├─ sessionStorage loads (lifeEvents = [])
          │
T=100ms   Initial load useEffect waits 500ms
          │
T=150ms   SaveBar triggers /api/me/retireplan
          │
T=500ms   Initial load timeout expires
          ├─ Check: isAuthenticated? YES
          ├─ Check: cloudLoadPendingRef? NO
          └─ SKIP setTriggerProfileLoad (BUG!)
          │
T=700ms   ✓ /api/me/retireplan responds
          └─ onCloudLoadComplete() called
          │
T=701ms   setTriggerProfileLoad(1) ← NOW triggered
          │
T=703ms   Lifestyle profile useEffect runs
          └─ fetch('/api/me/lifestyle')
          │
T=800ms   ✓ /api/me/lifestyle responds
          ├─ Transform exceptional items to events
          └─ setLifeEvents([...manual, ...profile]) ✓
          │
T=850ms   SaveBar continues after onCloudLoadComplete
          └─ onImportJson(data) called
          │
T=851ms   ✗ setLifeEvents(data.projection.lifeEvents || [])
          │   OVERWRITES lifecycle events!
          │
RESULT:   lifeEvents = [] (LOST!)
```

---

## Race Condition #3: Multiple Timer Conflicts

### Current Behavior (Confusing State Transitions)

```
Component Mount (AtRetirement or Projection)
│
├─ T=0ms: sessionStorage auto-restore
│  └─ Data loaded into component state
│
├─ T=50ms: SaveBar auto-load triggered
│  └─ isAuthenticated = true, userInfo present
│  └─ onCloudLoadStart() → cloudLoadPendingRef = true
│  └─ fetch('/api/me/retireplan') sent
│
├─ T=500ms: Component initial load timeout (Projection)
│  └─ Check: cloudLoadPendingRef? Should be true, but often false!
│  └─ isInitialLoadRef = false
│
├─ T=800ms: Auto-save debounce timeout
│  └─ saveAutosave() writes to sessionStorage
│  └─ Check: isInitialLoadRef? false
│  └─ setHasUnsavedChanges(true) ← WRONG! Cloud not loaded yet
│
├─ T=1000ms: Component initial load timeout (AtRetirement)
│  └─ Check: cloudLoadPendingRef? Variable
│  └─ isInitialLoadRef = false
│  └─ Check last cloud save timestamp
│
├─ T=1200ms: Cloud API responds
│  └─ onImportJson(data)
│  └─ isInitialLoadRef = true (to prevent unsaved flag)
│  └─ setForm(data.inputs)
│  └─ setTimeout(1000ms) to reset isInitialLoadRef
│
├─ T=1201ms: onCloudLoadComplete()
│  └─ cloudLoadPendingRef = false
│  └─ isInitialLoadRef = false
│  └─ setHasUnsavedChanges(false)
│
├─ T=2000ms: Auto-save debounce (from setForm at T=1200)
│  └─ saveAutosave() writes merged state
│  └─ Check: isInitialLoadRef? false (completed at T=1201)
│  └─ setHasUnsavedChanges(true) ← WRONG! Just loaded from cloud
│
└─ T=2200ms: onImportJson's setTimeout expires
   └─ isInitialLoadRef = false (already false)
   └─ setHasUnsavedChanges(false) ← Corrects the mistake

RESULT: Multiple state flips, confusing UX, "unsaved changes" flashing
```

### Timeline Diagram

```
Time    │ isInitialLoadRef │ cloudLoadPending │ hasUnsavedChanges │ Action
────────┼──────────────────┼──────────────────┼───────────────────┼─────────────────
0ms     │ true             │ false            │ false             │ Mount
50ms    │ true             │ true ✓           │ false             │ Cloud fetch start
500ms   │ false ✗          │ true             │ false             │ Initial timeout
800ms   │ false            │ true             │ true ✗            │ Auto-save (WRONG)
1000ms  │ false            │ true             │ true              │ (timeout)
1200ms  │ true ✓           │ true             │ true              │ Cloud responds
1201ms  │ false ✗          │ false ✗          │ false ✓           │ Load complete
2000ms  │ false            │ false            │ true ✗            │ Auto-save (WRONG)
2200ms  │ false            │ false            │ false ✓           │ Timeout corrects

Legend:
  ✓ = Correct state
  ✗ = Incorrect state or bad timing
```

---

## Proposed Solution: Centralized Loading

### How DataManager Fixes This

```
User Signs In / Navigates
     │
     ▼
┌───────────────────────────────────────────────────────────┐
│ DataManager Context                                       │
│ Single Orchestrated Load Sequence                         │
└───────────────────────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────────────────────┐
│ STEP 1: sessionStorage Load (SYNC, immediate)             │
│ ├─ Load retireplan.unified.v1                             │
│ └─ Load retireplan.lifestyleProfile                       │
│ ├─ setDataState({ atRetirement, projection, lifestyle }) │
│ └─ loadSequence.sessionStorageLoaded = true               │
└───────────────────────────────────────────────────────────┘
     │
     ▼ (only if authenticated)
┌───────────────────────────────────────────────────────────┐
│ STEP 2: Cloud Load (ASYNC, parallel)                      │
│                                                            │
│ Promise.all([                                              │
│   fetch('/api/me/retireplan'),   ┐                        │
│   fetch('/api/me/lifestyle')      │ IN PARALLEL           │
│ ])                                ┘                        │
│                                                            │
│ Both requests complete → Continue to Step 3               │
└───────────────────────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────────────────────┐
│ STEP 3: Intelligent Merge                                 │
│                                                            │
│ mergedAtRetirement = merge(                               │
│   sessionData.atRetirement,      ← Local                 │
│   cloudData.inputs,               ← Cloud                │
│   cloudLifestyle                  ← Lifecycle            │
│ )                                                          │
│                                                            │
│ Logic:                                                     │
│ 1. Start with cloud data (if available)                   │
│ 2. If desiredSpendAnnual empty in cloud:                  │
│    → Use lifecycle.baselineAmount                         │
│ 3. Else: Use cloud value (user override)                  │
│                                                            │
│ mergedProjection = merge(                                 │
│   sessionData.projection,         ← Local                │
│   cloudData.projection,           ← Cloud                │
│   cloudLifestyle.exceptionalItems ← Lifecycle            │
│ )                                                          │
│                                                            │
│ Logic:                                                     │
│ 1. Start with cloud projection data                       │
│ 2. Extract manual events (no 'source' field)              │
│ 3. Transform lifecycle exceptionalItems to events         │
│ 4. Merge: [...manualEvents, ...lifecycleEvents]           │
│ 5. Save merged result                                     │
│                                                            │
│ loadSequence.complete = true                              │
│ setDataState({ loading: false, loaded: true })            │
└───────────────────────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────────────────────┐
│ STEP 4: Components Receive Data                           │
│                                                            │
│ Components via useDataManager():                          │
│ const { atRetirement, projection, loading } = ...         │
│                                                            │
│ useEffect(() => {                                          │
│   if (!loading && atRetirement) {                         │
│     setForm(atRetirement.form);                           │
│     // Data guaranteed to be fully merged                 │
│   }                                                        │
│ }, [loading, atRetirement]);                              │
│                                                            │
│ No race conditions - load is COMPLETE before data arrives │
└───────────────────────────────────────────────────────────┘
```

### Timeline Comparison

#### Current (Broken)
```
T=0     Mount → sessionStorage load
T=50    SaveBar → /api/me/retireplan ──┐
T=100   Component → /api/me/lifestyle ──┼─ COMPETING LOADS
T=200   Lifestyle responds             │
T=210   setForm({ spend: 45000 })      │  ← VALUE SET
T=500   Retireplan responds            │
T=501   setForm({ spend: "" })        ┘  ← OVERWRITTEN!
```

#### With DataManager (Fixed)
```
T=0     Mount → DataManager starts load
T=0     Step 1: sessionStorage (sync)
T=10    Step 2: Promise.all([retireplan, lifestyle]) ─┐
T=500   Both APIs respond                              │ COORDINATED
T=501   Step 3: Intelligent merge                      │
T=502     - retireplan.spend = ""                      │
T=503     - lifecycle.baseline = 45000                 │
T=504     - Merged: spend = 45000 (lifecycle wins)    ┘
T=505   Step 4: Components receive complete data
T=506   setForm({ spend: 45000 }) ← CORRECT VALUE, NO OVERWRITES
```

---

## Key Architectural Principles

### ❌ Current Architecture (Anti-patterns)

```
┌─────────────────────────────────────────┐
│ Multiple Independent Loaders            │
│                                         │
│ Component A ──→ sessionStorage          │
│           └──→ /api/me/lifestyle        │
│                                         │
│ Component B ──→ sessionStorage          │
│           └──→ /api/me/retireplan       │
│                                         │
│ SaveBar ──────→ /api/me/retireplan      │
│           └──→ overwrites Component A/B │
│                                         │
│ Result: Race conditions, data loss      │
└─────────────────────────────────────────┘
```

### ✅ Proposed Architecture (Best practices)

```
┌─────────────────────────────────────────┐
│ Single Centralized Loader               │
│                                         │
│ DataManager ──→ sessionStorage          │
│            └──→ /api/me/retireplan      │
│            └──→ /api/me/lifestyle       │
│            └──→ MERGE intelligently     │
│            └──→ Provide to components   │
│                                         │
│ Component A ──→ useDataManager()        │
│ Component B ──→ useDataManager()        │
│                                         │
│ Result: No races, single source of truth│
└─────────────────────────────────────────┘
```

---

## Summary

The race conditions occur because:

1. **Multiple loaders** - SaveBar, AtRetirement, and PostRetirementProjection all load data independently
2. **No sequencing** - Loads happen in parallel with unpredictable timing
3. **No coordination** - Each loader overwrites data from others
4. **Callback ordering bugs** - SaveBar calls `onCloudLoadComplete` before `onImportJson`
5. **Fragile trigger mechanism** - Projection lifecycle load gated by state variable that doesn't always trigger

**Solution**: Centralized DataManager that loads all data in a coordinated sequence, merges intelligently, and provides a single source of truth to components.
