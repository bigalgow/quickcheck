# RetirePlan QuickCheck - Data Flow Architecture Analysis

## Executive Summary

The application has **critical race conditions** in how it loads data from multiple sources (cloud API, sessionStorage, lifecycle profile). The current architecture causes:

1. **Lifestyle profile baseline (income level) not loading reliably** in AtRetirement component
2. **Life events (exceptional items) never loading** in PostRetirementProjection component

**Root Cause**: Three independent data loading systems competing with each other, with no orchestration or sequencing.

---

## Current Architecture Overview

### Data Storage Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD (Logto Management API)              │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │ customData.retirePlan  │  │ customData.lifestyle     │   │
│  │ .latest                │  │ Profile                  │   │
│  │                        │  │                          │   │
│  │ • inputs (form data)   │  │ • baselineAmount         │   │
│  │ • outputs (calc)       │  │ • exceptionalItems       │   │
│  │ • projection (events)  │  │ • householdType          │   │
│  └────────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                  BROWSER sessionStorage                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  retireplan.unified.v1                                 │ │
│  │  {                                                     │ │
│  │    atRetirement: { form, dbSchemes, model, ... }      │ │
│  │    projection: { isaRecurring, lifeEvents, ... }      │ │
│  │  }                                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  retireplan.lifestyleProfile (SEPARATE!)              │ │
│  │  { baselineAmount, exceptionalItems, ... }            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints

**`/api/me/retireplan`** (handles calculator data)
- GET: Returns `customData.retirePlan.latest` (inputs + outputs + projection)
- POST: Saves full snapshot to `customData.retirePlan.latest`

**`/api/me/lifestyle`** (handles lifestyle profile)
- GET: Returns `customData.lifestyleProfile`
- POST: Saves/updates lifestyle profile
- DELETE: Clears lifestyle profile

---

## Data Flow on Component Mount

### AtRetirement Component Load Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Component Mount (AtRetirement.jsx)                       │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. useEffect (line 432-500)                                 │
│    - Loads from sessionStorage (IMMEDIATE, SYNC)            │
│    - Restores form, dbSchemes, model, projection            │
│    - Sets isInitialLoadRef = true                           │
│    - setTimeout 1000ms → sets isInitialLoadRef = false      │
└─────────────────────────────────────────────────────────────┘
          ↓ (parallel, independent)
┌─────────────────────────────────────────────────────────────┐
│ 3. useEffect (line 503-548) - Lifestyle Profile Load       │
│    - Dependency: [isAuthenticated, getAccessToken]         │
│    - IF authenticated:                                      │
│      → fetch('/api/me/lifestyle') ASYNC                     │
│      → setLifestyleProfile(profile)                         │
│      → IF form.desiredSpendAnnual empty:                   │
│         → setForm({ desiredSpendAnnual: profile.baseline}) │
│    - setLoadingProfile(false)                               │
└─────────────────────────────────────────────────────────────┘
          ↓ (parallel, independent - triggered by SaveBar)
┌─────────────────────────────────────────────────────────────┐
│ 4. SaveBar.loadProfile() - Cloud Data Load                 │
│    - Triggered by useEffect in SaveBar (line 139-152)      │
│    - Dependency: [isAuthenticated, userInfo]               │
│    - Calls onCloudLoadStart()                               │
│    - fetch('/api/me/retireplan') ASYNC                      │
│    - Calls onImportJson(data)                               │
│      → Sets isInitialLoadRef = true (line 996)             │
│      → setForm(data.inputs) - OVERWRITES lifecycle data!   │
│      → setTimeout 1000ms → isInitialLoadRef = false        │
│    - Calls onCloudLoadComplete()                            │
└─────────────────────────────────────────────────────────────┘
```

### PostRetirementProjection Component Load Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Component Mount (PostRetirementProjection.jsx)          │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. useState initialization (line 41-50)                     │
│    - Loads from sessionStorage (IMMEDIATE, SYNC)            │
│    - const savedInputs = loadProjectionInputs()            │
│    - Sets isaRecurring, dcDrawdown, lifeEvents              │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. useEffect (line 59-102) - Initial Load Complete         │
│    - setTimeout 500ms                                        │
│    - IF !isAuthenticated:                                   │
│      → setTriggerProfileLoad(prev => prev + 1)             │
│    - ELSE: wait for cloud load (never triggers!)           │
└─────────────────────────────────────────────────────────────┘
          ↓ (ONLY triggered for unauthenticated users!)
┌─────────────────────────────────────────────────────────────┐
│ 4. useEffect (line 105-213) - Lifestyle Profile Load       │
│    - Dependency: [triggerProfileLoad, isAuthenticated]     │
│    - ONLY runs if triggerProfileLoad > 0                   │
│    - IF authenticated:                                      │
│      → fetch('/api/me/lifestyle') ASYNC                     │
│    - ELSE:                                                  │
│      → Load from sessionStorage.retireplan.lifestyleProfile│
│    - transformToProjectionEvents(exceptionalItems)          │
│    - setLifeEvents(mergedEvents) - smart merge             │
└─────────────────────────────────────────────────────────────┘
          ↓ (parallel - triggered by SaveBar)
┌─────────────────────────────────────────────────────────────┐
│ 5. SaveBar.loadProfile() - Cloud Data Load                 │
│    - fetch('/api/me/retireplan') ASYNC                      │
│    - Calls onImportJson(data)                               │
│      → setLifeEvents(data.projection.lifeEvents)           │
│      → OVERWRITES lifecycle events from step 4!            │
│    - Calls onCloudLoadComplete()                            │
│      → setTriggerProfileLoad(prev => prev + 1) (line 342)  │
│      → NOW lifecycle profile loads (TOO LATE!)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Race Conditions Identified

### Race #1: AtRetirement Lifestyle Profile vs Cloud Load

**Timeline (authenticated user signs in):**

```
T=0ms:    Component mounts
T=0ms:    sessionStorage loads (form.desiredSpendAnnual = "")
T=50ms:   SaveBar triggers loadProfile() for /api/me/retireplan
T=100ms:  Lifestyle profile useEffect triggers /api/me/lifestyle
T=200ms:  /api/me/lifestyle responds (profile.baselineAmount = 45000)
T=210ms:  Checks: form.desiredSpendAnnual empty? YES
T=211ms:  setForm({ desiredSpendAnnual: "45000" })
T=500ms:  /api/me/retireplan responds (inputs.desiredSpendAnnual = "")
T=501ms:  SaveBar calls onImportJson()
T=502ms:  setForm(data.inputs) → desiredSpendAnnual = "" (OVERWRITES!)
```

**Result**: Lifestyle profile baseline is loaded, then immediately overwritten by cloud data.

**Why it fails**:
- Two independent data sources writing to same state
- No coordination between SaveBar cloud load and lifestyle profile load
- Cloud data wins because it finishes last

---

### Race #2: PostRetirementProjection Lifestyle Events Never Load

**Timeline (authenticated user):**

```
T=0ms:    Component mounts
T=0ms:    sessionStorage loads (lifeEvents = [])
T=100ms:  Initial load useEffect waits 500ms
T=150ms:  SaveBar triggers loadProfile() for /api/me/retireplan
T=600ms:  Initial load timeout expires
          CHECK: isAuthenticated? YES
          CHECK: cloudLoadPendingRef? NO (SaveBar hasn't set it!)
          SKIP: setTriggerProfileLoad (only for unauthenticated!)
T=700ms:  /api/me/retireplan responds
T=701ms:  SaveBar calls onCloudLoadComplete()
T=702ms:  setTriggerProfileLoad(prev => prev + 1)
T=703ms:  Lifestyle profile useEffect triggers
T=800ms:  /api/me/lifestyle responds with exceptional items
T=801ms:  transformToProjectionEvents() creates life events
T=802ms:  setLifeEvents([...manual, ...profile])
```

**BUT THEN**:

```
T=850ms:  SaveBar calls onImportJson()
          (this happens AFTER onCloudLoadComplete)
T=851ms:  setLifeEvents(data.projection.lifeEvents || [])
          OVERWRITES the lifecycle events that just loaded!
```

**Result**: Lifecycle events load correctly, then immediately get overwritten by cloud projection data (which has stale/empty events).

**Why it fails**:
- `onCloudLoadComplete` is called BEFORE `onImportJson` in SaveBar
- Lifecycle profile loads when triggered by `onCloudLoadComplete`
- But then `onImportJson` overwrites the newly loaded events
- Sequence is wrong: Load → Trigger → Overwrite

---

### Race #3: SaveBar Cloud Load vs sessionStorage Auto-Restore

**Timeline (authenticated user navigates to page):**

```
T=0ms:    Component mounts
T=0ms:    sessionStorage auto-restore (loads all saved data)
T=50ms:   SaveBar auto-load triggers (isAuthenticated = true)
T=100ms:  /api/me/retireplan request sent
T=800ms:  Component's auto-save timeout triggers (800ms debounce)
          Saves current state (from sessionStorage) to sessionStorage
          Sets hasUnsavedChanges = true (because isInitialLoadRef = false)
T=1000ms: isInitialLoadRef = false (from component's initial load timeout)
T=1200ms: /api/me/retireplan responds
T=1201ms: onImportJson() loads cloud data
          Sets isInitialLoadRef = true (to prevent unsaved flag)
T=1202ms: setForm() triggers re-render
T=2000ms: Auto-save debounce triggers again
          Saves merged state to sessionStorage
T=2200ms: setTimeout in onImportJson expires
          Sets isInitialLoadRef = false
          Sets hasUnsavedChanges = false
```

**Result**: Multiple competing timers, unclear state transitions, sometimes cloud data loads but is marked as "unsaved changes" anyway.

---

## Why Lifecycle Profile Baseline Doesn't Load

### AtRetirement Component

**Problem**: Line 531-537 in `AtRetirement.jsx`

```javascript
// Auto-populate spend field if empty
if (!form.desiredSpendAnnual && profile.baselineAmount) {
  setForm(f => ({
    ...f,
    desiredSpendAnnual: String(profile.baselineAmount)
  }));
  console.log('✅ Auto-populated baseline expenditure from profile');
}
```

This checks `if (!form.desiredSpendAnnual)` but by the time this runs:

1. sessionStorage has already restored `form.desiredSpendAnnual = ""`
2. SaveBar's cloud load will soon call `onImportJson()` which does:
   ```javascript
   setForm((f) => ({ ...f, ...formData })); // Line 1013
   ```
3. This overwrites ANY value set by lifestyle profile

**The condition passes** (empty string is falsy), **the value is set**, but then **SaveBar overwrites it**.

---

## Why Lifecycle Events Never Load

### PostRetirementProjection Component

**Problem**: Line 105-213 in `PostRetirementProjection.jsx`

The lifecycle profile load is gated behind a trigger mechanism:

```javascript
// Line 107-110
if (triggerProfileLoad === 0) {
  console.log('🎬 Lifestyle profile useEffect - waiting for trigger...');
  return;
}
```

The trigger is only set in two places:

**1. Initial load timeout (line 86-88)** - ONLY for unauthenticated users:
```javascript
if (!isAuthenticated) {
  console.log('📊 Projection: Not authenticated - triggering lifestyle profile load after initial load');
  setTriggerProfileLoad(prev => prev + 1);
}
```

**2. Cloud load complete (line 341-342)** - After SaveBar loads from cloud:
```javascript
onCloudLoadComplete={() => {
  // ...
  setTriggerProfileLoad(prev => prev + 1);
}}
```

**But the sequence is wrong:**

1. SaveBar calls `onCloudLoadComplete()` (line 333-343)
2. This triggers lifecycle profile load: `setTriggerProfileLoad(prev => prev + 1)`
3. Lifecycle profile loads from API
4. Lifecycle events are transformed and merged: `setLifeEvents([...manual, ...profile])`
5. **THEN** SaveBar's `loadProfile()` continues (line 58-67):
   ```javascript
   const data = await res.json();
   if (data && data.inputs) {
     onImportJson?.(data);  // ← This happens AFTER onCloudLoadComplete!
   }
   onCloudLoadComplete?.();
   ```
6. `onImportJson()` is called (line 344-363)
7. Line 353 overwrites lifecycle events:
   ```javascript
   setLifeEvents(data.projection.lifeEvents ?? []);
   ```

**The callback sequence is backwards!** Should be:
1. Import JSON (merge cloud data)
2. THEN trigger lifecycle profile load
3. THEN mark load complete

---

## sessionStorage Storage Structure Issues

### Two Separate Storage Keys for Related Data

**Problem**: Lifestyle profile is stored separately from unified data

```javascript
// persist.js uses:
sessionStorage.setItem('retireplan.unified.v1', ...)

// But lifestyle profile is stored in:
sessionStorage.setItem('retireplan.lifestyleProfile', ...)
```

**Why this is problematic:**

1. Lifecycle profile is saved by LifestyleCalculator to `retireplan.lifestyleProfile`
2. AtRetirement/Projection components load from `retireplan.unified.v1`
3. When cloud data is imported, it only updates `unified.v1`
4. Lifecycle profile in separate key is never consulted during cloud load
5. Components must manually load lifestyle profile in separate useEffect

**Result**: Data fragmentation leads to synchronization issues.

---

## Architectural Issues Summary

### 1. **No Single Source of Truth**

Three overlapping data sources:
- `sessionStorage.retireplan.unified.v1` (calculator + projection)
- `sessionStorage.retireplan.lifestyleProfile` (lifestyle data)
- Cloud API `/api/me/retireplan` (calculator + projection)
- Cloud API `/api/me/lifestyle` (lifestyle data)

All four can have different values at different times.

### 2. **No Load Orchestration**

Components independently load data:
- AtRetirement auto-loads from sessionStorage (immediate, sync)
- AtRetirement loads lifestyle profile (async, depends on auth)
- SaveBar loads cloud data (async, depends on auth)
- PostRetirementProjection auto-loads from sessionStorage (immediate, sync)
- PostRetirementProjection loads lifestyle profile (async, gated by trigger)

No coordination = race conditions.

### 3. **Callback Sequencing Bug in SaveBar**

```javascript
// SaveBar.jsx line 58-67
const data = await res.json();
console.log("✅ Received data from cloud:", data);
if (data && data.inputs) {
  onImportJson?.(data);           // ← Called LAST
}
onCloudLoadComplete?.();          // ← Called BEFORE onImportJson!
```

Should be:

```javascript
if (data && data.inputs) {
  onImportJson?.(data);           // ← Import first
}
onCloudLoadComplete?.();          // ← Mark complete after import
```

### 4. **Trigger Mechanism in Projection is Fragile**

- Relies on `triggerProfileLoad` counter
- Only increments in specific scenarios
- Misses authenticated users on initial load
- Easy to miss trigger, resulting in no lifecycle events

### 5. **Multiple Competing Timers**

- Component initial load: `setTimeout(..., 1000)`
- Component cloud load: `setTimeout(..., 500)`
- Auto-save debounce: `setTimeout(..., 800)`
- Import complete: `setTimeout(..., 1000)`

All trying to set `isInitialLoadRef` and `hasUnsavedChanges` flags.

### 6. **Lifestyle Profile Data Not in Unified Structure**

Lifecycle profile should be part of cloud retireplan data:

```javascript
// CURRENT (WRONG):
customData.retirePlan.latest = { inputs, outputs, projection }
customData.lifestyleProfile = { baseline, exceptionalItems }

// SHOULD BE:
customData.retirePlan.latest = {
  inputs,
  outputs,
  projection,
  lifestyleProfile: { baseline, exceptionalItems }
}
```

---

## Recommended Architectural Fix

### Solution: Centralized Data Loading Orchestrator

Create a **single data loading manager** that:

1. Loads all data sources in a coordinated sequence
2. Merges data from all sources intelligently
3. Provides data to components via React Context
4. Handles race conditions internally

### Implementation Plan

#### Phase 1: Create DataManager Context

**File**: `src/contexts/DataManager.jsx`

```javascript
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { loadUnifiedData, saveUnifiedData } from '../utils/persist';

const DataManagerContext = createContext();

export function DataManagerProvider({ children }) {
  const { isAuthenticated, getAccessToken } = useAuth();

  const [dataState, setDataState] = useState({
    atRetirement: null,
    projection: null,
    lifestyleProfile: null,
    loading: true,
    loaded: false,
    error: null,
  });

  const loadSequence = useRef({
    sessionStorageLoaded: false,
    cloudDataLoaded: false,
    lifestyleProfileLoaded: false,
    complete: false,
  });

  // STEP 1: Load from sessionStorage (immediate, sync)
  useEffect(() => {
    const unified = loadUnifiedData();
    const profileStored = sessionStorage.getItem('retireplan.lifestyleProfile');

    setDataState(prev => ({
      ...prev,
      atRetirement: unified?.atRetirement || null,
      projection: unified?.projection || null,
      lifestyleProfile: profileStored ? JSON.parse(profileStored) : null,
    }));

    loadSequence.current.sessionStorageLoaded = true;
  }, []);

  // STEP 2: Load from cloud if authenticated (async)
  useEffect(() => {
    if (!isAuthenticated || !loadSequence.current.sessionStorageLoaded) {
      return;
    }

    async function loadCloudData() {
      try {
        const audience = import.meta.env.VITE_API_AUDIENCE;
        if (!audience) {
          loadSequence.current.cloudDataLoaded = true;
          loadSequence.current.lifestyleProfileLoaded = true;
          markLoadComplete();
          return;
        }

        const token = await getAccessToken(audience);

        // Load retireplan and lifestyle IN PARALLEL
        const [retireplanRes, lifestyleRes] = await Promise.all([
          fetch('/api/me/retireplan', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/me/lifestyle', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Process retireplan data
        let cloudAtRetirement = null;
        let cloudProjection = null;
        if (retireplanRes.ok) {
          const data = await retireplanRes.json();
          if (data?.inputs) {
            cloudAtRetirement = data.inputs;
            cloudProjection = data.projection;
          }
        }

        // Process lifestyle profile
        let cloudLifestyle = null;
        if (lifestyleRes.ok) {
          cloudLifestyle = await lifestyleRes.json();
        }

        loadSequence.current.cloudDataLoaded = true;
        loadSequence.current.lifestyleProfileLoaded = true;

        // MERGE: Cloud data takes precedence, but intelligently merge lifestyle data
        setDataState(prev => {
          const mergedAtRetirement = mergeAtRetirementData(
            prev.atRetirement,
            cloudAtRetirement,
            cloudLifestyle
          );

          const mergedProjection = mergeProjectionData(
            prev.projection,
            cloudProjection,
            cloudLifestyle
          );

          return {
            ...prev,
            atRetirement: mergedAtRetirement,
            projection: mergedProjection,
            lifestyleProfile: cloudLifestyle || prev.lifestyleProfile,
          };
        });

        markLoadComplete();
      } catch (e) {
        console.error('Cloud load error:', e);
        loadSequence.current.cloudDataLoaded = true;
        loadSequence.current.lifestyleProfileLoaded = true;
        markLoadComplete();
      }
    }

    loadCloudData();
  }, [isAuthenticated, loadSequence.current.sessionStorageLoaded]);

  function markLoadComplete() {
    if (
      loadSequence.current.sessionStorageLoaded &&
      loadSequence.current.cloudDataLoaded &&
      loadSequence.current.lifestyleProfileLoaded
    ) {
      setDataState(prev => ({
        ...prev,
        loading: false,
        loaded: true,
      }));
      loadSequence.current.complete = true;
    }
  }

  // Smart merge function for AtRetirement data
  function mergeAtRetirementData(sessionData, cloudData, lifestyleProfile) {
    // If no cloud data, check if lifestyle profile should populate empty fields
    if (!cloudData) {
      if (sessionData && lifestyleProfile) {
        return {
          ...sessionData,
          desiredSpendAnnual: sessionData.desiredSpendAnnual ||
                               String(lifestyleProfile.baselineAmount || ''),
        };
      }
      return sessionData;
    }

    // Cloud data exists - merge with lifestyle profile
    const merged = { ...cloudData };

    // If desiredSpendAnnual is empty in cloud but lifecycle has baseline, use it
    if (!merged.desiredSpendAnnual && lifestyleProfile?.baselineAmount) {
      merged.desiredSpendAnnual = String(lifestyleProfile.baselineAmount);
    }

    return merged;
  }

  // Smart merge function for Projection data
  function mergeProjectionData(sessionData, cloudData, lifestyleProfile) {
    if (!cloudData && !lifestyleProfile) {
      return sessionData;
    }

    const merged = cloudData || sessionData || {};

    // Merge lifecycle events intelligently
    if (lifestyleProfile?.exceptionalItems?.length > 0) {
      const retirementAge = merged.retirementAge || 65; // fallback
      const profileEvents = transformToProjectionEvents(
        lifestyleProfile.exceptionalItems,
        retirementAge
      );

      // Keep manual events, merge profile events
      const manualEvents = (merged.lifeEvents || []).filter(
        e => e.source !== 'lifestyleProfile'
      );

      merged.lifeEvents = [...manualEvents, ...profileEvents];
    }

    return merged;
  }

  // Save function (called by components)
  async function saveData(section, data) {
    // Update local state
    setDataState(prev => ({
      ...prev,
      [section]: data,
    }));

    // Save to sessionStorage
    saveUnifiedData({ [section]: data });

    // If authenticated, save to cloud
    if (isAuthenticated) {
      try {
        const audience = import.meta.env.VITE_API_AUDIENCE;
        const token = await getAccessToken(audience);

        await fetch('/api/me/retireplan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            inputs: dataState.atRetirement,
            outputs: {}, // computed values
            projection: dataState.projection,
          }),
        });
      } catch (e) {
        console.error('Cloud save error:', e);
      }
    }
  }

  const value = {
    ...dataState,
    saveData,
  };

  return (
    <DataManagerContext.Provider value={value}>
      {children}
    </DataManagerContext.Provider>
  );
}

export function useDataManager() {
  return useContext(DataManagerContext);
}
```

#### Phase 2: Update Components to Use DataManager

**AtRetirement.jsx** - Remove all manual loading, use context:

```javascript
function AtRetirement() {
  const { atRetirement, lifestyleProfile, loading, saveData } = useDataManager();

  // Initialize form from context data (happens once, after load complete)
  useEffect(() => {
    if (!loading && atRetirement) {
      setForm(atRetirement.form);
      setDbSchemes(atRetirement.dbSchemes);
      // ...
    }
  }, [loading, atRetirement]);

  // No more manual sessionStorage loads
  // No more separate lifestyle profile loading
  // Everything comes from DataManager
}
```

**PostRetirementProjection.jsx** - Same pattern:

```javascript
function PostRetirementProjection() {
  const { projection, lifestyleProfile, loading, saveData } = useDataManager();

  useEffect(() => {
    if (!loading && projection) {
      setLifeEvents(projection.lifeEvents || []);
      setIsaRecurringAmount(projection.isaRecurringAmount || '');
      // ...
    }
  }, [loading, projection]);
}
```

#### Phase 3: Update Backend to Store Unified Data

**`api/me/retireplan.js`** - Include lifestyle profile in response:

```javascript
if (req.method === 'GET') {
  const lifestyle = current.lifestyleProfile ?? null;
  const response = {
    ...currentRP?.latest,
    lifestyleProfile: lifestyle, // Include lifestyle in retireplan response
  };
  return res.status(200).json(response);
}
```

Now `/api/me/retireplan` returns EVERYTHING in one request.

---

## Migration Path (Zero Downtime)

### Step 1: Deploy Backend Change
- Update `/api/me/retireplan` to include `lifestyleProfile` in GET response
- Existing code continues to work (backwards compatible)

### Step 2: Deploy DataManager Context
- Add new context provider
- Wrap app in `<DataManagerProvider>`
- Existing components still use old loading (no breaking change)

### Step 3: Migrate AtRetirement Component
- Switch from manual loading to `useDataManager()`
- Test thoroughly
- Deploy

### Step 4: Migrate PostRetirementProjection Component
- Switch from manual loading to `useDataManager()`
- Test thoroughly
- Deploy

### Step 5: Remove Old Code
- Remove SaveBar's auto-load logic
- Remove per-component lifecycle loading
- Clean up persist.js legacy functions
- Remove separate `retireplan.lifestyleProfile` sessionStorage key

---

## Benefits of This Architecture

### 1. **Single Load Sequence**
- sessionStorage → Cloud API (parallel) → Merge → Components
- No race conditions
- Predictable order

### 2. **Intelligent Merging**
- Lifecycle profile data merged into calculator/projection data
- Cloud data takes precedence for explicit user inputs
- Lifecycle baseline only applied if field is empty
- Lifecycle events intelligently merged with manual events

### 3. **Single Source of Truth**
- DataManager context is the source
- Components consume, never load directly
- Saves propagate back through context

### 4. **Loading States**
- Components can show spinner during `loading: true`
- Clear "data ready" signal when `loaded: true`
- No multiple loading flags to coordinate

### 5. **Separation of Concerns**
- Components focus on UI and user interaction
- DataManager handles all persistence complexity
- Auth layer provides tokens, doesn't manage data

### 6. **Testability**
- DataManager can be mocked for component tests
- Loading sequence can be unit tested in isolation
- Clear contract between layers

---

## Alternative: Quick Band-Aid Fix (Not Recommended)

If you want a quick fix without full refactor:

### Fix #1: AtRetirement Lifestyle Baseline

Change `SaveBar.jsx` line 60-62:

```javascript
// BEFORE:
if (data && data.inputs) {
  onImportJson?.(data);
}

// AFTER:
if (data && data.inputs) {
  // Check if desiredSpendAnnual should be preserved from lifestyle profile
  const shouldPreserveSpend = !data.inputs.desiredSpendAnnual;
  onImportJson?.(data, { preserveLifestyleBaseline: shouldPreserveSpend });
}
```

And in `AtRetirement.jsx` line 992:

```javascript
onImportJson={(data, options) => {
  // ... existing code ...

  if (options?.preserveLifestyleBaseline && lifestyleProfile) {
    formData.desiredSpendAnnual = String(lifestyleProfile.baselineAmount || '');
  }

  setForm((f) => ({ ...f, ...formData }));
}
```

### Fix #2: PostRetirementProjection Lifecycle Events

Change `SaveBar.jsx` line 58-67:

```javascript
// BEFORE:
const data = await res.json();
if (data && data.inputs) {
  onImportJson?.(data);
}
onCloudLoadComplete?.();

// AFTER:
const data = await res.json();
if (data && data.inputs) {
  onImportJson?.(data);
}
// Move this AFTER onImportJson completes
await new Promise(resolve => setTimeout(resolve, 100));
onCloudLoadComplete?.();
```

And change `PostRetirementProjection.jsx` line 344-363:

```javascript
onImportJson={(data) => {
  isInitialLoadRef.current = true;

  if (data?.projection) {
    // DON'T overwrite lifeEvents - let lifecycle profile load handle it
    setIsaRecurringAmount(data.projection.isaRecurringAmount ?? "");
    setIsaRecurringYears(data.projection.isaRecurringYears ?? "");
    setDcDrawdownPercent(data.projection.dcDrawdownPercent ?? 4.0);
    // REMOVE: setLifeEvents(data.projection.lifeEvents ?? []);
  }

  setTimeout(() => {
    isInitialLoadRef.current = false;
    setHasUnsavedChanges(false);
  }, 500);
}}
```

**WARNING**: These are band-aids. They'll reduce the symptoms but won't fix the underlying architectural issues.

---

## Conclusion

The root cause of both issues is **lack of data loading orchestration**. Multiple independent systems are loading data from different sources with no coordination, leading to race conditions where the last load wins (overwriting previous loads).

The **proper fix** is to implement a centralized DataManager that:
1. Loads all data sources in sequence
2. Intelligently merges data
3. Provides a single source of truth to components

The **band-aid fixes** can work temporarily but leave the fragile architecture in place, making future bugs likely.

**Recommendation**: Implement the DataManager architecture for a robust, maintainable solution.
