// src/components/wizard/WizardSaveBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthProvider';

export default function WizardSaveBar({ data, onImportData, onSaveSuccess }) {
  const { isAuthenticated, loading, userInfo, signIn, signOut, getAccessToken } = useAuth();
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

  // Save to cloud
  const saveToCloud = async () => {
    try {
      setMsg(null);

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
          setMsg(`Save failed (${res.status})`);
        }
        return;
      }

      setMsg('✅ Saved to your account.');
      localStorage.setItem('retireplan-wizard-last-cloud-save', new Date().toISOString());
      setHasUnsavedChanges(false);
      onSaveSuccess?.();
    } catch (e) {
      if (e.name === 'SyntaxError' || e.message?.includes('JSON')) {
        console.info('ℹ️ API endpoint not available (OK in local dev)');
        setMsg('💾 Local auto-save active. Deploy to Vercel for cloud save.');
        onSaveSuccess?.();
      } else {
        console.error('Save error:', e);
        setMsg(e.message || 'Save failed.');
      }
    }
  };

  // Load from cloud
  const loadFromCloud = async () => {
    try {
      setMsg('Loading...');
      setShowAccountMenu(false);

      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        console.info('ℹ️ VITE_API_AUDIENCE not configured - cloud load disabled');
        setMsg('⚠️ Cloud not configured');
        return;
      }

      // Confirm before overwriting local data
      const hasLocalData = data?.metadata?.completedModules?.length > 0;
      if (hasLocalData) {
        const confirmed = window.confirm(
          'Loading from cloud will overwrite your current local data. Continue?'
        );
        if (!confirmed) {
          setMsg(null);
          return;
        }
      }

      console.log('🔄 Fetching cloud data...');
      const token = await getAccessToken(audience);

      const res = await fetch('/api/me/retireplan', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('📡 Response status:', res.status);

      if (!res.ok) {
        if (res.status === 404) {
          console.info('ℹ️ API endpoint not available');
          setMsg('❌ No cloud data found');
        } else {
          console.warn('Load API error:', res.status);
          setMsg(`❌ Load failed (${res.status})`);
        }
        return;
      }

      const cloudData = await res.json();
      console.log('☁️ Received cloud data:', cloudData);

      if (cloudData && cloudData.inputs) {
        console.log('✅ Importing data with date of birth:', cloudData.inputs.dateOfBirth);
        onImportData?.(cloudData);
        localStorage.setItem('retireplan-wizard-last-cloud-save', new Date().toISOString());
        setHasUnsavedChanges(false);
        setMsg('✅ Loaded from cloud');
      } else {
        console.warn('⚠️ Cloud data is empty or invalid');
        setMsg('❌ No saved data found');
      }
    } catch (e) {
      console.error('❌ Load failed:', e);
      setMsg(`❌ Load failed: ${e.message}`);
    }
  };

  // Export to JSON file
  const exportToJSON = () => {
    setShowAccountMenu(false);
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retireplan-wizard-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('✅ Exported to JSON');
  };

  // Import from JSON file
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
            'Importing will overwrite your current data. Continue?'
          );
          if (!confirmed) return;

          onImportData?.(importedData);
          setMsg('✅ Imported from JSON');
        } catch (err) {
          console.error('Import error:', err);
          setMsg('❌ Invalid JSON file');
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
    window.location.reload();
  };

  // Handle sign out
  const handleSignOut = () => {
    setShowAccountMenu(false);
    signOut();
  };

  // Auto-load from cloud when user logs in
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      console.log('✅ Signed in. Auto-loading cloud data...');
      loadFromCloud();
    }
  }, [isAuthenticated, userInfo]);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500">💾 Auto-saved locally</span>

        {hasUnsavedChanges && (
          <span className="text-sm font-semibold text-amber-700">● Not saved to cloud</span>
        )}

        {msg && (
          <span className="text-sm font-semibold text-green-700">{msg}</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Authentication & Cloud Save */}
        {!isAuthenticated ? (
          <button
            onClick={signIn}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Login to save'}
          </button>
        ) : (
          <>
            <button
              onClick={saveToCloud}
              disabled={loading}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-md ${
                hasUnsavedChanges
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50`}
            >
              {hasUnsavedChanges ? '💾 Save to cloud' : '✓ Saved'}
            </button>

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
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-300 rounded-lg shadow-lg z-[100]">
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
                    <button
                      onClick={loadFromCloud}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>☁️</span>
                      <span>Load from cloud</span>
                    </button>

                    <button
                      onClick={exportToJSON}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>📥</span>
                      <span>Export JSON</span>
                    </button>

                    <button
                      onClick={importFromJSON}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>📤</span>
                      <span>Import JSON</span>
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
