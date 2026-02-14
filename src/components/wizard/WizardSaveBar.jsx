// src/components/wizard/WizardSaveBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthProvider';

export default function WizardSaveBar({ data, onImportData, onSaveSuccess, hasWizardData = true }) {
  const { isAuthenticated, loading, userInfo, signIn, signOut, getAccessToken, isPremium, premiumLoading } = useAuth();
  const [msg, setMsg] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };

    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAccountMenu]);

  // Track unsaved changes by comparing with last cloud save timestamp
  useEffect(() => {
    const lastCloudSave = localStorage.getItem('retireplan-wizard-last-cloud-save');
    const lastLocalModified = data?.metadata?.lastModified;

    if (!lastCloudSave || !lastLocalModified) {
      setHasUnsavedChanges(false);
      return;
    }

    const cloudTime = new Date(lastCloudSave).getTime();
    const localTime = new Date(lastLocalModified).getTime();
    setHasUnsavedChanges(localTime > cloudTime);
  }, [data?.metadata?.lastModified]);

  // Save to cloud (premium only)
  const saveToCloud = async () => {
    try {
      setMsg(null);

      // Check premium status
      if (!isPremium) {
        setMsg('⭐ Cloud sync is a premium feature');
        return;
      }

      // Check if offline first
      if (!navigator.onLine) {
        setMsg('⚠️ You\'re offline. Data saved locally - will sync when back online.');
        console.info('ℹ️ Offline - save to cloud skipped');
        return;
      }

      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        setMsg('⚠️ Cloud save not configured');
        console.info('ℹ️ VITE_API_AUDIENCE not configured - use Export JSON for local save');
        return;
      }

      const token = await getAccessToken(audience);

      const dataToSave = {
        ...data,
        savedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/me/retireplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(dataToSave),
      });

      if (!res.ok) {
        if (res.status === 404) {
          console.info('ℹ️ API endpoint not available (OK in local dev)');
          setMsg('💾 Local auto-save active. Deploy to Vercel for cloud save.');
          onSaveSuccess?.();
        } else {
          const text = await res.text();
          console.error('Save API error:', res.status, text);
          setMsg(`❌ Save failed (${res.status})`);
        }
        return;
      }

      setMsg('✅ Saved to your account.');
      localStorage.setItem('retireplan-wizard-last-cloud-save', new Date().toISOString());
      setHasUnsavedChanges(false);
      onSaveSuccess?.();
    } catch (e) {
      // Check if it's a network error (likely offline or connection issue)
      if (e.name === 'TypeError' && e.message?.includes('fetch')) {
        console.info('ℹ️ Network error during save - likely offline');
        setMsg('⚠️ Connection error. Data saved locally - will sync when reconnected.');
        return;
      }
      if (e.name === 'SyntaxError' || e.message?.includes('JSON')) {
        console.info('ℹ️ API endpoint not available (OK in local dev)');
        setMsg('💾 Local auto-save active. Deploy to Vercel for cloud save.');
        onSaveSuccess?.();
      } else {
        console.error('Save error:', e);
        setMsg(`❌ Save failed: ${e.message || 'Unknown error'}`);
      }
    }
  };

  // Fetch cloud data without importing (for comparison)
  const fetchCloudData = async () => {
    const audience = import.meta.env.VITE_API_AUDIENCE;
    if (!audience) {
      return null;
    }

    try {
      const token = await getAccessToken(audience);
      const res = await fetch('/api/me/retireplan', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return null;

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return null;
      }

      const cloudData = await res.json();
      // Accept any non-null object as valid cloud data
      // (handles both new format with 'inputs' and any legacy formats)
      return cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0 ? cloudData : null;
    } catch (e) {
      return null;
    }
  };

  // Load from cloud (premium only)
  const loadFromCloud = async (skipConfirm = false) => {
    try {
      setMsg('Loading...');
      setShowAccountMenu(false);

      // Check premium status
      if (!isPremium) {
        setMsg('⭐ Cloud sync is a premium feature');
        return;
      }

      // Check if offline first
      if (!navigator.onLine) {
        setMsg('⚠️ You\'re offline. Can\'t load from cloud right now.');
        return;
      }

      const cloudData = await fetchCloudData();

      if (!cloudData) {
        console.info('ℹ️ No cloud data available');
        setMsg('❌ No cloud data found');
        return;
      }

      // Confirm before overwriting local data (unless skipConfirm is true)
      const hasLocalData = data?.metadata?.completedModules?.length > 0;
      if (hasLocalData && !skipConfirm) {
        const confirmed = window.confirm(
          'Loading from cloud will overwrite your current local data. Continue?'
        );
        if (!confirmed) {
          setMsg(null);
          return;
        }
      }

      console.log('✅ Importing cloud data');
      onImportData?.(cloudData);
      localStorage.setItem('retireplan-wizard-last-cloud-save', cloudData.metadata?.lastModified || new Date().toISOString());
      setHasUnsavedChanges(false);
      setMsg('✅ Loaded from cloud');
    } catch (e) {
      console.error('❌ Load error:', e);
      // Check if it's a network error
      if (e.name === 'TypeError' && e.message?.includes('fetch')) {
        setMsg('⚠️ Connection error. Can\'t load from cloud right now.');
      } else {
        setMsg(`❌ Load failed: ${e.message}`);
      }
    }
  };

  // Backup to device (download JSON file)
  const exportToJSON = () => {
    setShowAccountMenu(false);
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retireplan-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('✅ Backup saved to device');
  };

  // Restore from device (import JSON file)
  const importFromJSON = () => {
    setShowAccountMenu(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);

          // Confirm before overwriting
          const confirmed = window.confirm(
            '⚠️ Restoring from backup will overwrite your current data.\n\nTip: Consider creating a backup of your current data first.\n\nContinue with restore?'
          );
          if (!confirmed) return;

          onImportData?.(importedData);
          setMsg('✅ Restored from backup');
        } catch (err) {
          console.error('Restore error:', err);
          setMsg('❌ Invalid backup file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Clear all local data
  const clearLocalData = () => {
    setShowAccountMenu(false);
    const confirmed = window.confirm(
      'This will delete ALL your local data. This cannot be undone. Continue?'
    );
    if (!confirmed) return;

    localStorage.removeItem('retireplan-wizard-data');
    localStorage.removeItem('retireplan-wizard-last-cloud-save');
    localStorage.removeItem('retireplan-dc-pots');
    setMsg('✅ Local data cleared');

    // Redirect to welcome page instead of reload (avoids 404 on mobile)
    window.location.href = '/';
  };

  // Handle sign out
  const handleSignOut = () => {
    setShowAccountMenu(false);
    signOut();
  };

  // Smart sync on login: compare timestamps and sync intelligently (premium only)
  useEffect(() => {
    const performSmartSync = async () => {
      if (!isAuthenticated || !userInfo) return;

      // Wait for premium status to be determined
      if (premiumLoading) return;

      // Non-premium users don't get cloud sync
      if (!isPremium) {
        console.log('ℹ️ Cloud sync requires premium. Using local storage only.');
        setMsg('💾 Data saved locally. Upgrade for cloud sync.');
        return;
      }

      console.log('✅ Signed in (premium). Initiating smart sync...');

      // Skip cloud sync if offline
      if (!navigator.onLine) {
        console.log('📴 Offline - skipping cloud sync');
        setMsg('📴 You\'re offline. Data saved locally.');
        return;
      }

      const hasLocalData = data?.metadata?.completedModules?.length > 0;
      const localTimestamp = data?.metadata?.lastModified;

      // Fetch cloud data for comparison
      const cloudData = await fetchCloudData();

      // Case 1: No cloud data, no local data → Nothing to sync
      if (!cloudData && !hasLocalData) {
        console.log('ℹ️ No data anywhere. Fresh start.');
        setMsg(null);
        return;
      }

      // Case 2: No cloud data, has local data → Local wins, ready to save
      if (!cloudData && hasLocalData) {
        console.log('📱 No cloud data. Your local data is ready to save.');
        setMsg('💾 Your data is ready to save to cloud');
        return;
      }

      // Case 3: Has cloud data, no local data → Ask user before loading
      if (cloudData && !hasLocalData) {
        console.log('☁️ Cloud data found, no local data.');
        const userChoice = window.confirm(
          '☁️ Cloud data found.\n\n' +
          'Click OK to LOAD your saved data from cloud\n' +
          'Click Cancel to START FRESH'
        );
        if (userChoice) {
          onImportData?.(cloudData);
          localStorage.setItem('retireplan-wizard-last-cloud-save', cloudData.metadata?.lastModified || new Date().toISOString());
          setHasUnsavedChanges(false);
          setMsg('✅ Loaded from cloud');
        } else {
          setMsg(null);
        }
        return;
      }

      // Case 4: Both exist → Compare timestamps
      const cloudTimestamp = cloudData.metadata?.lastModified;

      if (!localTimestamp || !cloudTimestamp) {
        // Can't compare - ask user
        console.log('⚠️ Missing timestamps. Asking user...');
        const userChoice = window.confirm(
          '☁️ Cloud data found.\n\n' +
          'Click OK to LOAD from cloud\n' +
          'Click Cancel to KEEP your local data'
        );
        if (userChoice) {
          onImportData?.(cloudData);
          localStorage.setItem('retireplan-wizard-last-cloud-save', cloudData.metadata?.lastModified || new Date().toISOString());
          setHasUnsavedChanges(false);
          setMsg('✅ Loaded from cloud');
        } else {
          setMsg('💾 Your local data is ready to save to cloud');
          setHasUnsavedChanges(true);
        }
        return;
      }

      const localTime = new Date(localTimestamp).getTime();
      const cloudTime = new Date(cloudTimestamp).getTime();
      const timeDiff = Math.abs(localTime - cloudTime);

      // Same timestamp (within 1 second) → Already synced
      if (timeDiff < 1000) {
        console.log('✅ Local and cloud are in sync');
        localStorage.setItem('retireplan-wizard-last-cloud-save', cloudTimestamp);
        setHasUnsavedChanges(false);
        setMsg('✅ Synced with cloud');
        return;
      }

      // Cloud is newer → Ask user before overwriting local changes
      if (cloudTime > localTime) {
        console.log('☁️ Cloud data is newer than local.');
        const userChoice = window.confirm(
          '☁️ Your cloud data is newer than your local data.\n\n' +
          'Click OK to LOAD from cloud (overwrites local changes)\n' +
          'Click Cancel to KEEP your local data'
        );
        if (userChoice) {
          onImportData?.(cloudData);
          localStorage.setItem('retireplan-wizard-last-cloud-save', cloudTimestamp);
          setHasUnsavedChanges(false);
          setMsg('✅ Loaded newer data from cloud');
        } else {
          setMsg('💾 Keeping local data. Save to cloud when ready.');
          setHasUnsavedChanges(true);
        }
        return;
      }

      // Local is newer → Keep local, show ready to save
      if (localTime > cloudTime) {
        console.log('📱 Local data is newer. Ready to save.');
        setMsg('💾 Your local data is newer. Click "Save to cloud" to sync.');
        setHasUnsavedChanges(true);
        return;
      }
    };

    performSmartSync();
  }, [isAuthenticated, userInfo, isPremium, premiumLoading]);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-wrap gap-3 no-print">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500">💾 Auto-saved locally</span>

        {/* Show sync status - msg takes priority over hasUnsavedChanges to avoid contradictions */}
        {msg ? (
          <span className={`text-sm font-semibold ${msg.includes('❌') || msg.includes('⚠️') ? 'text-red-700' : msg.includes('●') ? 'text-amber-700' : 'text-green-700'}`}>
            {msg}
          </span>
        ) : hasUnsavedChanges ? (
          <span className="text-sm font-semibold text-amber-700">● Not saved to cloud</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Authentication & Cloud Save */}
        {!isAuthenticated ? (
          <button
            onClick={signIn}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Login to sync'}
          </button>
        ) : (
          <>
            {/* Save button - only show if there's wizard data to save */}
            {hasWizardData && (
              isPremium ? (
                <button
                  onClick={saveToCloud}
                  disabled={loading || premiumLoading}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-md ${
                    hasUnsavedChanges
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {hasUnsavedChanges ? '💾 Save to cloud' : '✓ Saved'}
                </button>
              ) : premiumLoading ? (
                <span className="px-4 py-2 text-sm text-slate-500">Loading...</span>
              ) : (
                <span className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-md">
                  ⭐ Free tier (local only)
                </span>
              )
            )}

            {/* Account Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-2"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Account</span>
                <span className="text-xs">{showAccountMenu ? '▲' : '▼'}</span>
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white border border-slate-300 rounded-lg shadow-lg z-[100]">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-800">
                      {userInfo?.name || userInfo?.given_name || 'User'}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {userInfo?.email}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {/* Cloud sync options - premium only */}
                    {isPremium ? (
                      <button
                        onClick={loadFromCloud}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span>☁️</span>
                        <span>Load from cloud</span>
                      </button>
                    ) : (
                      <div className="px-4 py-2 text-sm text-slate-500">
                        <span className="flex items-center gap-2">
                          <span>⭐</span>
                          <span>Cloud sync (premium)</span>
                        </span>
                      </div>
                    )}

                    {/* Only show Backup if there's wizard data to backup */}
                    {hasWizardData && (
                      <button
                        onClick={exportToJSON}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span>💾</span>
                        <span>Backup (to device)</span>
                      </button>
                    )}

                    <button
                      onClick={importFromJSON}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>📁</span>
                      <span>Restore (from device)</span>
                    </button>

                    <div className="border-t border-slate-200 my-1"></div>

                    <button
                      onClick={clearLocalData}
                      className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                    >
                      <span>🗑️</span>
                      <span>Clear all data</span>
                    </button>

                    <div className="border-t border-slate-200 my-1"></div>

                    <button
                      onClick={handleSignOut}
                      disabled={loading}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>🚪</span>
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
