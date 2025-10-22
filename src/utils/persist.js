// src/utils/persist.js
const KEY = 'retireplan.autosave.v1';

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAutosave(payload) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
  } catch {
    // ignore quota errors
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
