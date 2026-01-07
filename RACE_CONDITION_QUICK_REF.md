# Quick Reference Card - Data Loading Race Conditions

## The Problems (TL;DR)

### Problem #1: Lifestyle Baseline Not Loading
**Symptom**: User creates lifestyle profile with £45,000 baseline, but At-Retirement calculator shows empty.

**Why**: SaveBar cloud load overwrites lifecycle profile value with stale cloud data.

**Fix Location**: `SaveBar.jsx:58-67` and `AtRetirement.jsx:992-1047`

---

### Problem #2: Life Events Not Loading
**Symptom**: User creates lifestyle profile with "Holiday £5,000", but Projection shows no events.

**Why**:
1. Lifecycle profile load only triggers for unauthenticated users
2. Cloud load's `onImportJson` overwrites events after lifecycle loads

**Fix Location**: `PostRetirementProjection.jsx:59-102` and `344-363`

---

## Race Condition Timeline

```
USER SIGNS IN
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ T=0ms    Component mounts, sessionStorage loads         │
│ T=50ms   SaveBar → /api/me/retireplan (async)           │
│ T=100ms  Component → /api/me/lifestyle (async)          │
│ T=200ms  ✓ Lifecycle responds → setForm({ spend: 45k })│ ← VALUE SET
│ T=500ms  ✓ Retireplan responds → setForm({ spend: "" })│ ← OVERWRITTEN!
└─────────────────────────────────────────────────────────┘
```

---

## Key Code Locations

### SaveBar.jsx
```javascript
// Line 139-152: Auto-load trigger (runs on sign-in)
useEffect(() => {
  if (isAuthenticated && userInfo) {
    loadProfile(); // ← Loads /api/me/retireplan
  }
}, [isAuthenticated, userInfo]);

// Line 58-67: Cloud load callback (WRONG ORDER!)
const data = await res.json();
if (data && data.inputs) {
  onImportJson?.(data);           // ← Should be FIRST
}
onCloudLoadComplete?.();          // ← Called BEFORE onImportJson!
```

### AtRetirement.jsx
```javascript
// Line 503-548: Lifecycle profile load
useEffect(() => {
  const loadProfile = async () => {
    // ...
    const profile = await fetch('/api/me/lifestyle');
    setLifestyleProfile(profile);

    // Auto-populate spend if empty
    if (!form.desiredSpendAnnual && profile.baselineAmount) {
      setForm({ desiredSpendAnnual: String(profile.baselineAmount) });
      // ↑ VALUE SET... but SaveBar will overwrite it!
    }
  };
  loadProfile();
}, [isAuthenticated]);

// Line 992-1047: Import cloud data (overwrites lifecycle!)
onImportJson={(data) => {
  // ...
  setForm((f) => ({ ...f, ...data.inputs }));
  // ↑ data.inputs.desiredSpendAnnual = "" (overwrites 45k!)
}}
```

### PostRetirementProjection.jsx
```javascript
// Line 59-102: Initial load (ONLY triggers for !isAuthenticated)
useEffect(() => {
  setTimeout(() => {
    // ...
    if (!isAuthenticated) {  // ← BUG: Skips authenticated users!
      setTriggerProfileLoad(prev => prev + 1);
    }
  }, 500);
}, [isAuthenticated]);

// Line 105-213: Lifecycle profile load (gated by trigger)
useEffect(() => {
  if (triggerProfileLoad === 0) {
    return; // ← Doesn't run for authenticated users!
  }
  // Load lifecycle profile...
}, [triggerProfileLoad]);

// Line 344-363: Import cloud data (overwrites events!)
onImportJson={(data) => {
  if (data?.projection) {
    setLifeEvents(data.projection.lifeEvents ?? []);
    // ↑ Overwrites lifecycle events with empty array!
  }
}}
```

---

## Quick Fix Checklist (Option A - Band-Aid)

### Step 1: Fix SaveBar callback order
- [ ] File: `src/components/SaveBar.jsx`
- [ ] Line: 58-67
- [ ] Change: Move `onCloudLoadComplete()` to AFTER `onImportJson()`
- [ ] Add: Pass `options` parameter to `onImportJson()`

### Step 2: Preserve lifecycle baseline
- [ ] File: `src/components/AtRetirement.jsx`
- [ ] Line: 992-1047
- [ ] Change: Accept `options` parameter in `onImportJson`
- [ ] Add: Check `options.preserveLifestyleBaseline` before overwriting

### Step 3: Fix lifecycle events trigger
- [ ] File: `src/components/PostRetirementProjection.jsx`
- [ ] Line: 59-102
- [ ] Change: Remove `if (!isAuthenticated)` check
- [ ] Result: Trigger lifecycle load for ALL users

### Step 4: Don't overwrite events from cloud
- [ ] File: `src/components/PostRetirementProjection.jsx`
- [ ] Line: 344-363
- [ ] Change: Accept `options` parameter
- [ ] Add: Only set `lifeEvents` if NOT cloud import

---

## Proper Fix Checklist (Option B - DataManager)

### Step 1: Create DataManager
- [ ] File: `src/contexts/DataManager.jsx` (NEW)
- [ ] Code: ~400 lines
- [ ] Function: Centralized data loading orchestrator

### Step 2: Wrap app in provider
- [ ] File: `src/main.jsx`
- [ ] Change: Add `<DataManagerProvider>` wrapper

### Step 3: Update AtRetirement
- [ ] File: `src/components/AtRetirement.jsx`
- [ ] Remove: Manual sessionStorage loading (line 432-500)
- [ ] Remove: Lifecycle profile loading (line 503-548)
- [ ] Add: `useDataManager()` hook
- [ ] Change: Initialize from context instead of local state

### Step 4: Update PostRetirementProjection
- [ ] File: `src/components/PostRetirementProjection.jsx`
- [ ] Remove: Manual sessionStorage loading
- [ ] Remove: Lifecycle profile loading (line 105-213)
- [ ] Add: `useDataManager()` hook
- [ ] Change: Initialize from context

### Step 5: Update SaveBar
- [ ] File: `src/components/SaveBar.jsx`
- [ ] Remove: Auto-load logic (line 139-152)
- [ ] Change: Use `saveToCloud()` from DataManager

---

## Testing Checklist

### Test Case 1: Baseline Loading
- [ ] Create lifestyle profile with £45,000 baseline
- [ ] Leave At-Retirement `desiredSpendAnnual` empty
- [ ] Sign in
- [ ] **Expected**: At-Retirement shows £45,000
- [ ] **Verify**: Value persists after page refresh

### Test Case 2: Events Loading
- [ ] Create lifestyle profile with "Holiday £5,000" item
- [ ] Navigate to Projection page
- [ ] Sign in (or refresh)
- [ ] **Expected**: Life events show "Holiday" event
- [ ] **Verify**: Event persists after page refresh

### Test Case 3: Manual Override
- [ ] Set `desiredSpendAnnual` to £50,000 manually
- [ ] Save to cloud
- [ ] Sign out and back in
- [ ] **Expected**: Shows £50,000 (NOT lifecycle baseline)

### Test Case 4: Cross-Device Sync
- [ ] Save data on Device A
- [ ] Sign in on Device B
- [ ] **Expected**: All data syncs correctly
- [ ] **Verify**: Lifecycle baseline AND events present

---

## Debug Commands

### Check sessionStorage
```javascript
// In browser console:
JSON.parse(sessionStorage.getItem('retireplan.unified.v1'))
JSON.parse(sessionStorage.getItem('retireplan.lifestyleProfile'))
```

### Watch load sequence
```javascript
// Look for these console logs:
"✅ Loaded lifestyle profile:"
"✅ Received data from cloud:"
"📥 Importing JSON data:"
"☁️ Cloud load complete"
```

### Identify race condition
```javascript
// If you see this pattern, it's a race condition:
"✅ Auto-populated baseline expenditure from profile"  // T=200ms
"📥 Importing JSON data"                               // T=500ms
// Result: Baseline lost!
```

---

## File Reference

| Document | Purpose |
|----------|---------|
| `ANALYSIS_SUMMARY.md` | Executive summary, start here |
| `DATA_FLOW_ANALYSIS.md` | Complete technical analysis |
| `RACE_CONDITION_DIAGRAMS.md` | Visual diagrams and timelines |
| `IMPLEMENTATION_GUIDE.md` | Step-by-step fix instructions |
| `RACE_CONDITION_QUICK_REF.md` | This cheat sheet |

---

## Decision Matrix

| Criteria | Option A (Band-Aid) | Option B (DataManager) |
|----------|---------------------|------------------------|
| Time to implement | 2-4 hours | 1-2 days |
| Complexity | Low | Medium |
| Risk | Low | Medium |
| Fixes root cause | ❌ No | ✅ Yes |
| Prevents future issues | ❌ No | ✅ Yes |
| Technical debt | ⚠️ Adds some | ✅ Reduces |
| Recommended for | Immediate fix | Long-term solution |

---

**Recommendation**:
1. Implement **Option A** this week for immediate relief
2. Plan **Option B** for next sprint for proper fix

---

Last updated: 2026-01-07
