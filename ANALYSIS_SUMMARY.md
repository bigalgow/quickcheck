# Data Flow Analysis - Executive Summary

## Problem Statement

The RetirePlan QuickCheck application has critical race conditions in its data loading architecture, causing:

1. **Lifestyle profile baseline (income level) not loading reliably** in the At-Retirement calculator
2. **Life events (exceptional items) never loading** in the Post-Retirement Projection

These issues occur when users sign in and navigate between pages.

---

## Root Cause

**Three independent data loading systems competing with each other, with no coordination:**

```
SaveBar Component ──────┐
                        ├──→ All writing to same state
AtRetirement Component ─┤
                        ├──→ No sequencing or coordination
Projection Component ───┘
                        └──→ Last write wins (data loss)
```

### The Race Condition Chain

1. Component mounts → loads from sessionStorage (immediate, sync)
2. SaveBar auto-loads from `/api/me/retireplan` (async, ~500ms)
3. Component loads from `/api/me/lifestyle` (async, ~200ms)
4. **Lifecycle profile loads first** and sets value
5. **Cloud retireplan loads second** and overwrites with stale data
6. **Result**: User's lifecycle profile data is lost

---

## Impact Assessment

### Severity: HIGH

- **User Experience**: Confusing behavior - data appears then disappears
- **Data Integrity**: Silent data loss - no error messages
- **Reliability**: Inconsistent - works sometimes, fails sometimes
- **Trust**: Users may lose confidence in the app

### Affected Features

- ✗ Lifestyle Calculator baseline not populating At-Retirement form
- ✗ Lifestyle exceptional items not appearing as life events in Projection
- ✗ "Unsaved changes" indicator flashing incorrectly
- ✗ Cloud data occasionally overwriting local edits

---

## Technical Details

### Data Storage Architecture (Current)

```
Cloud (Logto Management API)
├── customData.retirePlan.latest
│   ├── inputs (form data)
│   ├── outputs (calculations)
│   └── projection (events, ISA, etc.)
│
└── customData.lifestyleProfile
    ├── baselineAmount
    ├── exceptionalItems
    └── householdType

sessionStorage (Browser)
├── retireplan.unified.v1
│   ├── atRetirement (form, dbSchemes, model)
│   └── projection (lifeEvents, ISA, etc.)
│
└── retireplan.lifestyleProfile (SEPARATE!)
    └── { baseline, exceptionalItems }
```

**Problem**: Lifecycle profile stored separately, not merged with main data.

### Load Sequence (Current - Broken)

```
T=0ms     Component mounts
T=0ms     sessionStorage auto-restore
T=50ms    SaveBar → /api/me/retireplan (async)
T=100ms   Component → /api/me/lifestyle (async)
T=200ms   ✓ Lifecycle responds → setForm({ spend: 45000 })
T=500ms   ✓ Retireplan responds → setForm({ spend: "" })  ← OVERWRITES!
```

### Key Files Involved

| File | Role | Issue |
|------|------|-------|
| `SaveBar.jsx:139-152` | Auto-loads cloud data on sign-in | Calls `onImportJson` which overwrites component state |
| `AtRetirement.jsx:503-548` | Loads lifecycle profile | Loads async, gets overwritten by SaveBar |
| `AtRetirement.jsx:992-1047` | Imports cloud data | Overwrites lifecycle baseline with empty value |
| `PostRetirementProjection.jsx:105-213` | Loads lifecycle events | Gated by trigger that doesn't fire for auth users |
| `PostRetirementProjection.jsx:344-363` | Imports cloud data | Overwrites lifecycle events after they load |
| `SaveBar.jsx:58-67` | Cloud load callback order | Calls `onCloudLoadComplete` before `onImportJson` (backwards!) |

---

## Recommended Solutions

### Option A: Quick Band-Aid Fix (2-4 hours)

**Pros:**
- Fast to implement
- Low risk
- Immediately resolves user-facing issues

**Cons:**
- Doesn't fix root cause
- Issues may recur in different scenarios
- Technical debt remains

**Changes:**
1. Add preservation logic to SaveBar when importing cloud data
2. Skip `lifeEvents` overwrite in Projection's `onImportJson`
3. Fix trigger timing for lifecycle profile load

**Files to modify:**
- `src/components/SaveBar.jsx` (10 lines)
- `src/components/AtRetirement.jsx` (15 lines)
- `src/components/PostRetirementProjection.jsx` (20 lines)

### Option B: Proper Architectural Fix (1-2 days)

**Pros:**
- Eliminates root cause
- Prevents future race conditions
- Clean, maintainable architecture
- Single source of truth

**Cons:**
- Larger refactor
- More testing required
- Takes longer to implement

**Changes:**
1. Create `DataManager` context provider
2. Centralize all loading in one place
3. Coordinate cloud + sessionStorage + lifecycle loads
4. Components consume from context, never load directly
5. Intelligent merging of all data sources

**Files to create/modify:**
- `src/contexts/DataManager.jsx` (new, ~400 lines)
- `src/main.jsx` (wrap app in provider)
- `src/components/AtRetirement.jsx` (remove loading logic, use context)
- `src/components/PostRetirementProjection.jsx` (remove loading logic, use context)
- `src/components/SaveBar.jsx` (remove loading logic, use context)

---

## Implementation Roadmap

### Phase 1: Immediate Fix (This Week)
- Implement **Option A** (band-aid)
- Deploy to production
- Monitor for issues

### Phase 2: Proper Solution (Next Sprint)
- Implement **Option B** (DataManager)
- Comprehensive testing
- Gradual rollout

### Phase 3: Optimization (Future)
- Merge lifecycle profile into retireplan data structure
- Update backend to return unified response
- Remove sessionStorage fragmentation

---

## Documentation Included

This analysis includes 4 documents:

1. **`DATA_FLOW_ANALYSIS.md`** (this file)
   - Complete technical analysis
   - Current vs. proposed architecture
   - Detailed race condition explanations
   - Full DataManager implementation

2. **`RACE_CONDITION_DIAGRAMS.md`**
   - Visual timeline diagrams
   - Step-by-step race condition flows
   - Before/after comparisons

3. **`IMPLEMENTATION_GUIDE.md`**
   - Step-by-step implementation instructions
   - Code snippets for both Option A and B
   - Testing checklists

4. **`ANALYSIS_SUMMARY.md`** (this file)
   - Executive summary
   - Quick reference guide

---

## Next Steps

### Immediate Actions

1. **Review this analysis** with development team
2. **Choose approach**: Option A (band-aid) or Option B (proper fix)
3. **Allocate time**: 2-4 hours (A) or 1-2 days (B)
4. **Implement solution** following Implementation Guide
5. **Test thoroughly** using provided test cases
6. **Deploy** and monitor

### Monitoring After Fix

- Check browser console logs for data load sequence
- Verify lifecycle baseline appears in At-Retirement form
- Verify lifecycle events appear in Projection life events
- Confirm "unsaved changes" indicator behaves correctly
- Test cross-device sync (sign in on different browsers)

### Success Criteria

✅ Lifecycle profile baseline reliably populates At-Retirement calculator
✅ Lifecycle exceptional items appear as life events in Projection
✅ No data loss during sign-in / cloud load
✅ No race conditions in console logs
✅ "Unsaved changes" indicator accurate
✅ Cross-device sync works correctly

---

## Questions?

For clarification on:
- **Technical details**: See `DATA_FLOW_ANALYSIS.md`
- **Visual understanding**: See `RACE_CONDITION_DIAGRAMS.md`
- **Implementation steps**: See `IMPLEMENTATION_GUIDE.md`

For specific code locations, search for line numbers referenced in this document.

---

**Analysis Date**: 2026-01-07
**Analyst**: Claude Code Architecture Review
**Status**: Ready for Implementation
