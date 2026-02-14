// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import LogtoClient from '@logto/browser';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// wipe any lingering Logto keys that can confuse the refresh flow
function clearLogtoStorage() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((k) => {
      if (k.startsWith('logto:')) localStorage.removeItem(k);
    });
  } catch {}
}

export default function AuthProvider({ children }) {
  const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk';
  const appId = import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z';

  const client = useMemo(
    () =>
      new LogtoClient({
        endpoint,
        appId,
        // Option A + general use. custom_data is fine to keep even though we save via backend now.
        scopes: ['openid', 'profile', 'email', 'offline_access', 'custom_data'],
        // Register API resource to enable audience token requests
        resources: [import.meta.env.VITE_API_AUDIENCE || 'https://api.retireplan'],
      }),
    [endpoint, appId]
  );

  const [state, setState] = useState({
    isAuthenticated: false,
    userInfo: null,
    loading: true,
    isPremium: false,
    premiumLoading: false,
  });

  // Fetch premium status from backend
  const fetchPremiumStatus = async () => {
    try {
      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        console.log('[logto] No API audience configured, skipping premium check');
        setState(prev => ({ ...prev, isPremium: false, premiumLoading: false }));
        return;
      }

      const token = await client.getAccessToken(audience);
      const res = await fetch('/api/me/premium', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn('[logto] Premium check failed:', res.status);
        setState(prev => ({ ...prev, isPremium: false, premiumLoading: false }));
        return;
      }

      const { isPremium } = await res.json();
      console.log('[logto] Premium status:', isPremium);
      setState(prev => ({ ...prev, isPremium: isPremium === true, premiumLoading: false }));
    } catch (e) {
      console.warn('[logto] Premium check error:', e);
      setState(prev => ({ ...prev, isPremium: false, premiumLoading: false }));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // finish callback if needed
        const qs = new URLSearchParams(window.location.search);
        if (qs.has('code') && qs.has('state')) {
          await client.handleSignInCallback(window.location.href);
          window.history.replaceState({}, document.title, window.location.origin);
        }
      } catch (e) {
        console.error('[logto] handleSignInCallback failed:', e);
        // If this failed, we still continue to status sync below.
      }

      try {
        const authed = await client.isAuthenticated();
        console.log('[logto] Auth status:', { isAuthenticated: authed });

        // Note: We don't attempt automatic silent SSO (prompt=none) because:
        // 1. It can fail due to cookie/session sharing issues across subdomains
        // 2. Per Logto docs, regular sign-in flow handles SSO automatically if session exists
        // 3. Users clicking "Login to save" will get instant SSO if they're already logged in elsewhere

        const profile = authed ? await client.fetchUserInfo() : null;
        setState({ isAuthenticated: authed, userInfo: profile, loading: false, isPremium: false, premiumLoading: authed });

        // Fetch premium status if authenticated
        if (authed) {
          fetchPremiumStatus();
        }
      } catch (e) {
        // This is where your log came from: refresh grant failed.
        console.error('[logto] status sync failed:', e);
        // Auto-clear stale tokens and fall back to logged-out.
        clearLogtoStorage();
        setState({ isAuthenticated: false, userInfo: null, loading: false, isPremium: false, premiumLoading: false });
      }
    })();
  }, [client]);

  const signIn = () => {
    const redirectUri = window.location.origin;
    console.log('[logto] Sign in with redirectUri:', redirectUri);
    return client.signIn(redirectUri);
  };
  const signOut = () => client.signOut(window.location.origin);

  // flexible getter:
  //   getAccessToken() -> Account token (opaque or JWT)
  //   getAccessToken('https://api.retireplan') -> API audience token (JWT)
  //   getAccessToken({ resource: 'https://api.retireplan' }) -> same
  const getAccessToken = (arg) => {
    if (typeof arg === 'string') return client.getAccessToken(arg);
    if (arg && typeof arg === 'object') return client.getAccessToken(arg);
    return client.getAccessToken();
  };

  // Expose refreshPremium for use after claiming
  const refreshPremium = () => {
    setState(prev => ({ ...prev, premiumLoading: true }));
    fetchPremiumStatus();
  };

  return (
    <AuthCtx.Provider
      value={{
        ...state,
        signIn,
        signOut,
        getAccessToken,
        refreshPremium,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}