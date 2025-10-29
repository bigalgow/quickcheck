// src/utils/persist.js
// Using sessionStorage for security - data clears when browser tab closes
// This prevents sensitive financial data from persisting across sessions

// UNIFIED DATA MODEL - Both At Retirement and Projection stored together
const UNIFIED_KEY = 'retireplan.unified.v1';

// Legacy keys for migration
const OLD_KEY = 'retireplan.autosave.v1';
const OLD_PROJECTION_KEY = 'retireplan.projection.v1';

/**
 * Load unified data structure containing both At Retirement and Projection data
 * Returns: { atRetirement: {...}, projection: {...}, savedAt: timestamp, lastModified: timestamp }
 */
export function loadUnifiedData() {
  try {
    const raw = sessionStorage.getItem(UNIFIED_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    // Migration: Try to load from old separate keys
    const oldAtRetirement = sessionStorage.getItem(OLD_KEY);
    const oldProjection = sessionStorage.getItem(OLD_PROJECTION_KEY);

    if (oldAtRetirement || oldProjection) {
      const unified = {
        atRetirement: oldAtRetirement ? JSON.parse(oldAtRetirement) : null,
        projection: oldProjection ? JSON.parse(oldProjection) : null,
        savedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };

      // Save migrated data to new unified key
      saveUnifiedData(unified);

      // Clean up old keys
      sessionStorage.removeItem(OLD_KEY);
      sessionStorage.removeItem(OLD_PROJECTION_KEY);

      return unified;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Save unified data structure
 * payload: { atRetirement?: {...}, projection?: {...} }
 */
export function saveUnifiedData(payload) {
  try {
    // Load existing data to merge
    const existing = loadUnifiedData() || {};

    const unified = {
      atRetirement: payload.atRetirement ?? existing.atRetirement,
      projection: payload.projection ?? existing.projection,
      savedAt: existing.savedAt || new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    sessionStorage.setItem(UNIFIED_KEY, JSON.stringify(unified));
  } catch {
    // ignore quota errors
  }
}

/**
 * Update just the At Retirement section without touching Projection
 */
export function saveAtRetirement(atRetirementData) {
  saveUnifiedData({ atRetirement: atRetirementData });
}

/**
 * Update just the Projection section without touching At Retirement
 */
export function saveProjection(projectionData) {
  saveUnifiedData({ projection: projectionData });
}

/**
 * Clear all unified data
 */
export function clearUnifiedData() {
  try {
    sessionStorage.removeItem(UNIFIED_KEY);
    // Also clear legacy keys just in case
    sessionStorage.removeItem(OLD_KEY);
    sessionStorage.removeItem(OLD_PROJECTION_KEY);
  } catch {}
}

// Legacy function aliases for backward compatibility during transition
export function loadAutosave() {
  const unified = loadUnifiedData();
  return unified?.atRetirement || null;
}

export function saveAutosave(payload) {
  saveAtRetirement(payload);
}

export function clearAutosave() {
  clearUnifiedData();
}

export function loadProjectionInputs() {
  const unified = loadUnifiedData();
  return unified?.projection || null;
}

export function saveProjectionInputs(payload) {
  saveProjection(payload);
}

export function clearProjectionInputs() {
  clearUnifiedData();
}
