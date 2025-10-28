// src/utils/persist.js
// Using sessionStorage for security - data clears when browser tab closes
// This prevents sensitive financial data from persisting across sessions
const KEY = 'retireplan.autosave.v1';
const PROJECTION_KEY = 'retireplan.projection.v1';

export function loadAutosave() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAutosave(payload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
  } catch {
    // ignore quota errors
  }
}

export function clearAutosave() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

// Projection-specific persistence
export function loadProjectionInputs() {
  try {
    const raw = sessionStorage.getItem(PROJECTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProjectionInputs(payload) {
  try {
    sessionStorage.setItem(PROJECTION_KEY, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
  } catch {
    // ignore quota errors
  }
}

export function clearProjectionInputs() {
  try {
    sessionStorage.removeItem(PROJECTION_KEY);
  } catch {}
}
