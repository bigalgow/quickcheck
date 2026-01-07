# Implementation Guide: Fix Data Loading Race Conditions

## Overview

This guide provides step-by-step instructions to fix the race conditions in RetirePlan QuickCheck's data loading architecture.

**Choose your path:**
- **Option A: Quick Band-Aid Fix** (2-4 hours) - Minimal changes, reduces symptoms
- **Option B: Proper Architectural Fix** (1-2 days) - Complete refactor, eliminates root cause

---

## Option A: Quick Band-Aid Fix

**Time**: 2-4 hours
**Risk**: Low
**Long-term**: Band-aid only, issues may recur

### Fix #1: AtRetirement Lifestyle Baseline Loading

**Problem**: SaveBar's cloud load overwrites lifestyle profile baseline

**Solution**: Add preservation logic to SaveBar and AtRetirement

#### Step 1.1: Update SaveBar.jsx

**File**: `/Users/alangow/retireplan-quickcheck/src/components/SaveBar.jsx`

**Change lines 58-67:**

```javascript
// BEFORE:
const data = await res.json();
console.log("✅ Received data from cloud:", data);
if (data && data.inputs) {
  onImportJson?.(data);
  console.log("✅ Loaded saved data from account");
  setMsg("Loaded saved data");
} else {
  console.log("ℹ️ No saved data found in cloud");
}
onCloudLoadComplete?.(); // Load complete

// AFTER:
const data = await res.json();
console.log("✅ Received data from cloud:", data);
if (data && data.inputs) {
  // Check if desiredSpendAnnual should be preserved from lifestyle profile
  const shouldPreserveSpend = !data.inputs.desiredSpendAnnual;
  const options = {
    preserveLifestyleBaseline: shouldPreserveSpend,
    fromCloud: true
  };
  onImportJson?.(data, options);
  console.log("✅ Loaded saved data from account");
  setMsg("Loaded saved data");
} else {
  console.log("ℹ️ No saved data found in cloud");
}
// Call onCloudLoadComplete AFTER onImportJson completes
// Use a small delay to ensure state updates finish
setTimeout(() => {
  onCloudLoadComplete?.();
}, 100);
```

#### Step 1.2: Update AtRetirement.jsx

**File**: `/Users/alangow/retireplan-quickcheck/src/components/AtRetirement.jsx`

**Change lines 992-1047 (onImportJson callback):**

```javascript
// BEFORE:
onImportJson={(data) => {
  console.log('📥 Importing JSON data:', data);

  // Temporarily mark as loading to prevent unsaved changes flag
  isInitialLoadRef.current = true;

  // Handle numeric inputs from exported JSON - convert to strings for form
  if (data?.inputs) {
    const formData = {};
    Object.entries(data.inputs).forEach(([key, value]) => {
      // Skip dbSchemes - handled separately
      if (key === 'dbSchemes') return;
      // Convert numbers to strings for form fields
      if (typeof value === 'number') {
        formData[key] = String(value);
      } else if (typeof value === 'boolean') {
        formData[key] = value;
      } else if (typeof value === 'string') {
        formData[key] = value;
      }
    });
    setForm((f) => ({ ...f, ...formData }));
    // ... rest of the code

// AFTER:
onImportJson={(data, options = {}) => {
  console.log('📥 Importing JSON data:', data);
  console.log('📥 Import options:', options);

  // Temporarily mark as loading to prevent unsaved changes flag
  isInitialLoadRef.current = true;

  // Handle numeric inputs from exported JSON - convert to strings for form
  if (data?.inputs) {
    const formData = {};
    Object.entries(data.inputs).forEach(([key, value]) => {
      // Skip dbSchemes - handled separately
      if (key === 'dbSchemes') return;
      // Convert numbers to strings for form fields
      if (typeof value === 'number') {
        formData[key] = String(value);
      } else if (typeof value === 'boolean') {
        formData[key] = value;
      } else if (typeof value === 'string') {
        formData[key] = value;
      }
    });

    // PRESERVATION LOGIC: If importing from cloud and desiredSpendAnnual is empty,
    // check if lifecycle profile has a baseline to use instead
    if (options.preserveLifestyleBaseline &&
        options.fromCloud &&
        lifestyleProfile?.baselineAmount) {
      console.log('💡 Preserving lifestyle baseline:', lifestyleProfile.baselineAmount);
      formData.desiredSpendAnnual = String(lifestyleProfile.baselineAmount);
    }

    setForm((f) => ({ ...f, ...formData }));
    // ... rest of the code stays the same
```

**Result**: When cloud data has empty `desiredSpendAnnual`, lifecycle baseline is preserved.

---

### Fix #2: PostRetirementProjection Lifecycle Events Loading

**Problem**: SaveBar's `onImportJson` overwrites lifecycle events after they load

**Solution**: Don't overwrite `lifeEvents` in `onImportJson`, let lifecycle load handle it

#### Step 2.1: Update PostRetirementProjection.jsx

**File**: `/Users/alangow/retireplan-quickcheck/src/components/PostRetirementProjection.jsx`

**Change lines 344-363 (onImportJson callback):**

```javascript
// BEFORE:
onImportJson={(data) => {
  // Temporarily mark as loading to prevent unsaved changes flag
  isInitialLoadRef.current = true;

  // Handle imported data - update projection inputs if present
  if (data?.projection) {
    setIsaRecurringAmount(data.projection.isaRecurringAmount ?? "");
    setIsaRecurringYears(data.projection.isaRecurringYears ?? "");
    setDcDrawdownPercent(data.projection.dcDrawdownPercent ?? 4.0);
    setLifeEvents(data.projection.lifeEvents ?? []);  // ← REMOVES THIS LINE
  }
  // Note: At Retirement data is handled by sessionStorage auto-load

  // Reset loading flag and clear unsaved changes after data loads (generous timeout)
  setTimeout(() => {
    isInitialLoadRef.current = false;
    setHasUnsavedChanges(false); // Data just loaded from cloud, so no unsaved changes
    console.log('✅ Projection: Import complete - no unsaved changes');
  }, 500);
}}

// AFTER:
onImportJson={(data, options = {}) => {
  console.log('📥 Projection: Importing JSON data:', data);
  console.log('📥 Projection: Import options:', options);

  // Temporarily mark as loading to prevent unsaved changes flag
  isInitialLoadRef.current = true;

  // Handle imported data - update projection inputs if present
  if (data?.projection) {
    setIsaRecurringAmount(data.projection.isaRecurringAmount ?? "");
    setIsaRecurringYears(data.projection.isaRecurringYears ?? "");
    setDcDrawdownPercent(data.projection.dcDrawdownPercent ?? 4.0);

    // DON'T overwrite lifeEvents - let lifecycle profile load handle merging
    // Only set lifeEvents if this is a manual JSON import (not cloud auto-load)
    if (!options.fromCloud && data.projection.lifeEvents) {
      console.log('📥 Manual import - setting lifeEvents from JSON');
      setLifeEvents(data.projection.lifeEvents);
    } else {
      console.log('☁️ Cloud import - lifecycle profile will handle lifeEvents');
    }
  }
  // Note: At Retirement data is handled by sessionStorage auto-load

  // Reset loading flag and clear unsaved changes after data loads (generous timeout)
  setTimeout(() => {
    isInitialLoadRef.current = false;
    setHasUnsavedChanges(false); // Data just loaded from cloud, so no unsaved changes
    console.log('✅ Projection: Import complete - no unsaved changes');
  }, 500);
}}
```

#### Step 2.2: Update lifecycle profile trigger timing

**File**: `/Users/alangow/retireplan-quickcheck/src/components/PostRetirementProjection.jsx`

**Change lines 59-102 (initial load useEffect):**

```javascript
// BEFORE:
useEffect(() => {
  // If no saved data, mark load complete immediately
  if (!savedInputs) {
    console.log('📊 Projection: No saved data found');
    isInitialLoadRef.current = false;

    // For unauthenticated users, trigger lifestyle profile load immediately
    if (!isAuthenticated) {
      console.log('📊 Projection: Not authenticated - triggering lifestyle profile load immediately');
      setTriggerProfileLoad(prev => prev + 1);
    }
    return;
  }

  // Otherwise wait for state updates to complete (generous timeout to be safe)
  // But if cloud load is pending, wait for it to complete
  setTimeout(() => {
    if (cloudLoadPendingRef.current) {
      console.log('⏳ Projection: Waiting for cloud load to complete before marking initial load done');
      return; // Don't mark as complete yet - cloud load callback will do it
    }

    isInitialLoadRef.current = false;
    console.log('✅ Projection: Initial load complete');

    // For unauthenticated users, trigger lifestyle profile load now
    if (!isAuthenticated) {
      console.log('📊 Projection: Not authenticated - triggering lifestyle profile load after initial load');
      setTriggerProfileLoad(prev => prev + 1);
    }
    // ... rest
  }, 500);
}, [isAuthenticated]);

// AFTER:
useEffect(() => {
  // If no saved data, mark load complete immediately
  if (!savedInputs) {
    console.log('📊 Projection: No saved data found');
    isInitialLoadRef.current = false;

    // Trigger lifestyle profile load for ALL users (not just unauthenticated)
    console.log('📊 Projection: Triggering lifestyle profile load immediately');
    setTriggerProfileLoad(prev => prev + 1);
    return;
  }

  // Otherwise wait for state updates to complete (generous timeout to be safe)
  // But if cloud load is pending, wait for it to complete
  setTimeout(() => {
    if (cloudLoadPendingRef.current) {
      console.log('⏳ Projection: Waiting for cloud load to complete before marking initial load done');
      return; // Don't mark as complete yet - cloud load callback will do it
    }

    isInitialLoadRef.current = false;
    console.log('✅ Projection: Initial load complete');

    // Trigger lifestyle profile load for ALL users (authenticated or not)
    console.log('📊 Projection: Triggering lifestyle profile load after initial load');
    setTriggerProfileLoad(prev => prev + 1);

    // ... rest stays the same
  }, 500);
}, [isAuthenticated]);
```

**Result**: Lifecycle events load from profile, cloud import doesn't overwrite them.

---

### Testing Band-Aid Fixes

#### Test Case 1: AtRetirement Baseline

1. Create lifecycle profile with baseline £45,000
2. Leave `desiredSpendAnnual` empty in calculator
3. Sign in
4. **Expected**: Calculator shows £45,000 from lifecycle profile
5. **Verify**: Value persists after cloud load completes

#### Test Case 2: Projection Events

1. Create lifecycle profile with exceptional items (e.g., "Holiday" £5,000)
2. Navigate to Projection page
3. Sign in (or refresh if already signed in)
4. **Expected**: Life events show "Holiday" event from profile
5. **Verify**: Events persist after cloud load completes

#### Test Case 3: Manual Override

1. Set `desiredSpendAnnual` to £50,000 manually
2. Save to cloud
3. Sign out and back in
4. **Expected**: Shows £50,000 (manual value), NOT lifecycle baseline

---

## Option B: Proper Architectural Fix

**Time**: 1-2 days
**Risk**: Medium (larger refactor)
**Long-term**: Eliminates root cause, prevents future issues

### Overview of Changes

1. Create `DataManager` context provider
2. Centralize all data loading in DataManager
3. Update components to consume data from context
4. Remove per-component loading logic
5. Update backend to return unified data
6. Migrate sessionStorage structure

### Implementation Steps

#### Step 1: Create DataManager Context

**File**: `/Users/alangow/retireplan-quickcheck/src/contexts/DataManager.jsx` (new file)

```javascript
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { loadUnifiedData, saveUnifiedData } from '../utils/persist';
import { transformToProjectionEvents } from '../utils/lifestyleProfile';

const DataManagerContext = createContext();

export function DataManagerProvider({ children }) {
  const { isAuthenticated, getAccessToken } = useAuth();

  const [dataState, setDataState] = useState({
    atRetirement: null,      // { form, dbSchemes, model }
    projection: null,         // { isaRecurring, dcDrawdown, lifeEvents }
    lifestyleProfile: null,   // { baseline, exceptionalItems }
    loading: true,
    loaded: false,
    error: null,
  });

  const loadSequence = useRef({
    sessionStorageLoaded: false,
    cloudDataLoaded: false,
    complete: false,
  });

  // ===== STEP 1: Load from sessionStorage (immediate, sync) =====
  useEffect(() => {
    console.log('📦 DataManager: Loading from sessionStorage');

    try {
      const unified = loadUnifiedData();
      const profileStored = sessionStorage.getItem('retireplan.lifestyleProfile');

      setDataState(prev => ({
        ...prev,
        atRetirement: unified?.atRetirement || null,
        projection: unified?.projection || null,
        lifestyleProfile: profileStored ? JSON.parse(profileStored) : null,
      }));

      loadSequence.current.sessionStorageLoaded = true;
      console.log('✅ DataManager: sessionStorage loaded');
    } catch (e) {
      console.error('❌ DataManager: sessionStorage load failed:', e);
      loadSequence.current.sessionStorageLoaded = true; // Continue anyway
    }
  }, []);

  // ===== STEP 2: Load from cloud if authenticated (async) =====
  useEffect(() => {
    // Wait for sessionStorage to load first
    if (!loadSequence.current.sessionStorageLoaded) {
      return;
    }

    // If not authenticated, mark cloud load as complete (skip it)
    if (!isAuthenticated) {
      console.log('📦 DataManager: Not authenticated - skipping cloud load');
      loadSequence.current.cloudDataLoaded = true;
      markLoadComplete();
      return;
    }

    async function loadCloudData() {
      console.log('☁️ DataManager: Loading from cloud');

      try {
        const audience = import.meta.env.VITE_API_AUDIENCE;
        if (!audience) {
          console.log('⚠️ DataManager: No API audience - skipping cloud load');
          loadSequence.current.cloudDataLoaded = true;
          markLoadComplete();
          return;
        }

        const token = await getAccessToken(audience);

        // Load retireplan and lifestyle IN PARALLEL
        const [retireplanRes, lifestyleRes] = await Promise.all([
          fetch('/api/me/retireplan', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(e => {
            console.warn('Retireplan fetch failed:', e);
            return { ok: false };
          }),
          fetch('/api/me/lifestyle', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(e => {
            console.warn('Lifestyle fetch failed:', e);
            return { ok: false };
          }),
        ]);

        // Process retireplan data
        let cloudAtRetirement = null;
        let cloudProjection = null;
        if (retireplanRes.ok) {
          const data = await retireplanRes.json();
          if (data?.inputs) {
            cloudAtRetirement = {
              form: data.inputs,
              dbSchemes: data.inputs?.dbSchemes || [],
              model: null, // model is computed, not stored
            };
            cloudProjection = data.projection || null;
          }
        }

        // Process lifestyle profile
        let cloudLifestyle = null;
        if (lifestyleRes.ok) {
          const data = await lifestyleRes.json();
          if (data) {
            cloudLifestyle = data;
          }
        }

        console.log('✅ DataManager: Cloud data loaded', {
          hasAtRetirement: !!cloudAtRetirement,
          hasProjection: !!cloudProjection,
          hasLifestyle: !!cloudLifestyle,
        });

        // Mark cloud load complete
        loadSequence.current.cloudDataLoaded = true;

        // ===== STEP 3: Intelligent Merge =====
        setDataState(prev => {
          const mergedAtRetirement = mergeAtRetirementData(
            prev.atRetirement,
            cloudAtRetirement,
            cloudLifestyle
          );

          const mergedProjection = mergeProjectionData(
            prev.projection,
            cloudProjection,
            cloudLifestyle,
            mergedAtRetirement?.form?.retirementAge || 65
          );

          const merged = {
            ...prev,
            atRetirement: mergedAtRetirement,
            projection: mergedProjection,
            lifestyleProfile: cloudLifestyle || prev.lifestyleProfile,
          };

          console.log('✅ DataManager: Data merged', merged);

          // Save merged data back to sessionStorage
          saveUnifiedData({
            atRetirement: merged.atRetirement,
            projection: merged.projection,
          });
          if (merged.lifestyleProfile) {
            sessionStorage.setItem(
              'retireplan.lifestyleProfile',
              JSON.stringify(merged.lifestyleProfile)
            );
          }

          return merged;
        });

        markLoadComplete();
      } catch (e) {
        console.error('❌ DataManager: Cloud load error:', e);
        setDataState(prev => ({ ...prev, error: e.message }));
        loadSequence.current.cloudDataLoaded = true;
        markLoadComplete();
      }
    }

    loadCloudData();
  }, [isAuthenticated, loadSequence.current.sessionStorageLoaded]);

  // ===== Mark load sequence complete =====
  function markLoadComplete() {
    if (
      loadSequence.current.sessionStorageLoaded &&
      loadSequence.current.cloudDataLoaded &&
      !loadSequence.current.complete
    ) {
      console.log('✅ DataManager: Load sequence complete');
      setDataState(prev => ({
        ...prev,
        loading: false,
        loaded: true,
      }));
      loadSequence.current.complete = true;
    }
  }

  // ===== Smart merge function for AtRetirement data =====
  function mergeAtRetirementData(sessionData, cloudData, lifestyleProfile) {
    console.log('🔄 Merging AtRetirement data', {
      hasSession: !!sessionData,
      hasCloud: !!cloudData,
      hasLifestyle: !!lifestyleProfile,
    });

    // If no cloud data, check if lifestyle profile should populate empty fields
    if (!cloudData) {
      if (sessionData && lifestyleProfile?.baselineAmount) {
        const form = sessionData.form || {};
        return {
          ...sessionData,
          form: {
            ...form,
            desiredSpendAnnual: form.desiredSpendAnnual ||
                                 String(lifestyleProfile.baselineAmount),
          },
        };
      }
      return sessionData;
    }

    // Cloud data exists - use it, but fill empty fields from lifestyle
    const cloudForm = cloudData.form || {};
    const mergedForm = { ...cloudForm };

    // If desiredSpendAnnual is empty in cloud but lifestyle has baseline, use it
    if (!mergedForm.desiredSpendAnnual && lifestyleProfile?.baselineAmount) {
      console.log('💡 Using lifecycle baseline for empty desiredSpendAnnual');
      mergedForm.desiredSpendAnnual = String(lifestyleProfile.baselineAmount);
    }

    return {
      ...cloudData,
      form: mergedForm,
    };
  }

  // ===== Smart merge function for Projection data =====
  function mergeProjectionData(sessionData, cloudData, lifestyleProfile, retirementAge) {
    console.log('🔄 Merging Projection data', {
      hasSession: !!sessionData,
      hasCloud: !!cloudData,
      hasLifestyle: !!lifestyleProfile,
      retirementAge,
    });

    // Start with cloud data (if available), fall back to session
    const base = cloudData || sessionData || {};

    // Smart-merge lifecycle events
    let mergedEvents = base.lifeEvents || [];

    if (lifestyleProfile?.exceptionalItems?.length > 0) {
      console.log('🎯 Transforming lifestyle profile exceptional items');

      const profileEvents = transformToProjectionEvents(
        lifestyleProfile.exceptionalItems,
        retirementAge
      );

      // Keep manual events (no source or source !== 'lifestyleProfile')
      const manualEvents = mergedEvents.filter(
        e => e.source !== 'lifestyleProfile'
      );

      // Merge: manual events + new profile events
      mergedEvents = [...manualEvents, ...profileEvents];

      console.log('✅ Events merged:', {
        manual: manualEvents.length,
        profile: profileEvents.length,
        total: mergedEvents.length,
      });
    }

    return {
      ...base,
      lifeEvents: mergedEvents,
    };
  }

  // ===== Update function (called by components when user makes changes) =====
  function updateAtRetirement(data) {
    console.log('💾 DataManager: Updating AtRetirement', data);

    setDataState(prev => ({
      ...prev,
      atRetirement: data,
    }));

    saveUnifiedData({ atRetirement: data });
  }

  function updateProjection(data) {
    console.log('💾 DataManager: Updating Projection', data);

    setDataState(prev => ({
      ...prev,
      projection: data,
    }));

    saveUnifiedData({ projection: data });
  }

  // ===== Save to cloud =====
  async function saveToCloud() {
    if (!isAuthenticated) {
      throw new Error('Must be authenticated to save to cloud');
    }

    const audience = import.meta.env.VITE_API_AUDIENCE;
    if (!audience) {
      throw new Error('API audience not configured');
    }

    const token = await getAccessToken(audience);

    const payload = {
      inputs: dataState.atRetirement?.form || {},
      outputs: {}, // Computed values, not stored
      projection: dataState.projection || {},
      savedAt: new Date().toISOString(),
    };

    const res = await fetch('/api/me/retireplan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Save failed: ${res.status} ${text}`);
    }

    console.log('✅ DataManager: Saved to cloud');
  }

  const value = {
    ...dataState,
    updateAtRetirement,
    updateProjection,
    saveToCloud,
  };

  return (
    <DataManagerContext.Provider value={value}>
      {children}
    </DataManagerContext.Provider>
  );
}

export function useDataManager() {
  const context = useContext(DataManagerContext);
  if (!context) {
    throw new Error('useDataManager must be used within DataManagerProvider');
  }
  return context;
}
```

#### Step 2: Wrap App in DataManager Provider

**File**: `/Users/alangow/retireplan-quickcheck/src/main.jsx`

```javascript
// BEFORE:
import { AuthProvider } from './auth/AuthProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

// AFTER:
import { AuthProvider } from './auth/AuthProvider';
import { DataManagerProvider } from './contexts/DataManager';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DataManagerProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DataManagerProvider>
    </AuthProvider>
  </React.StrictMode>
);
```

#### Step 3: Update AtRetirement Component

**File**: `/Users/alangow/retireplan-quickcheck/src/components/AtRetirement.jsx`

**Major changes:**

1. Remove manual sessionStorage loading (lines 432-500)
2. Remove separate lifestyle profile loading (lines 503-548)
3. Use `useDataManager()` hook instead
4. Remove SaveBar's `onImportJson` callback

```javascript
// Add import at top:
import { useDataManager } from '../contexts/DataManager';

// In component:
export default function AtRetirement() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); // Still need for auth UI

  // NEW: Get data from DataManager instead of loading manually
  const {
    atRetirement: dataManagerAtRetirement,
    lifestyleProfile,
    loading: dataLoading,
    loaded: dataLoaded,
    updateAtRetirement,
    saveToCloud,
  } = useDataManager();

  // Remove these states (no longer needed):
  // const [lifestyleProfile, setLifestyleProfile] = useState(null);
  // const [loadingProfile, setLoadingProfile] = useState(true);

  // Form state (still needed for UI interaction)
  const [form, setForm] = useState({ /* initial state */ });
  const [dbSchemes, setDbSchemes] = useState([/* initial state */]);

  // ===== NEW: Initialize form from DataManager when data loads =====
  const initialized = useRef(false);
  useEffect(() => {
    if (dataLoaded && !initialized.current && dataManagerAtRetirement) {
      console.log('✅ Initializing form from DataManager');

      if (dataManagerAtRetirement.form) {
        setForm(dataManagerAtRetirement.form);
      }
      if (dataManagerAtRetirement.dbSchemes) {
        setDbSchemes(dataManagerAtRetirement.dbSchemes);
      }

      initialized.current = true;
    }
  }, [dataLoaded, dataManagerAtRetirement]);

  // ===== REMOVE: Old sessionStorage load useEffect (lines 432-500) =====
  // ===== REMOVE: Old lifestyle profile load useEffect (lines 503-548) =====

  // ===== UPDATE: Auto-save now uses DataManager =====
  useEffect(() => {
    if (!initialized.current) return; // Don't save until initialized

    const h = setTimeout(() => {
      updateAtRetirement({
        form,
        dbSchemes,
        model,
        // ... other fields
      });
      setHasUnsavedChanges(true);
    }, 800);
    return () => clearTimeout(h);
  }, [form, dbSchemes, model, /* other deps */]);

  // ===== UPDATE: SaveBar integration =====
  // Remove onImportJson, onCloudLoadStart, onCloudLoadComplete callbacks
  // SaveBar will use DataManager directly

  return (
    <div className="grid">
      {/* Show loading spinner while DataManager loads */}
      {dataLoading && (
        <div>Loading your data...</div>
      )}

      {/* Show content when loaded */}
      {dataLoaded && (
        <>
          <SaveBar
            // Remove: onImportJson, onCloudLoadStart, onCloudLoadComplete
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveSuccess={async () => {
              await saveToCloud();
              setHasUnsavedChanges(false);
            }}
          />

          {/* Rest of component */}
        </>
      )}
    </div>
  );
}
```

#### Step 4: Update PostRetirementProjection Component

Similar pattern - replace manual loading with `useDataManager()`.

#### Step 5: Update SaveBar Component

Remove auto-load logic, use DataManager instead.

#### Step 6: Testing

1. Test sessionStorage-only (no auth)
2. Test cloud load (with auth)
3. Test lifecycle profile integration
4. Test manual JSON import
5. Test cross-device sync

---

## Recommendation

**For immediate fix**: Use **Option A** (band-aid) to resolve user-facing issues quickly.

**For long-term stability**: Plan **Option B** (proper fix) for next sprint/release.

The band-aid fixes will reduce symptoms and buy time to implement the proper architectural solution.
