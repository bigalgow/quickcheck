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
        // no resources here; we’ll request an audience on demand when needed
      }),
    [endpoint, appId]
  );

  const [state, setState] = useState({
    isAuthenticated: false,
    userInfo: null,
    loading: true,
  });

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
        const profile = authed ? await client.fetchUserInfo() : null;
        setState({ isAuthenticated: authed, userInfo: profile, loading: false });
      } catch (e) {
        // This is where your log came from: refresh grant failed.
        console.error('[logto] status sync failed:', e);
        // Auto-clear stale tokens and fall back to logged-out.
        clearLogtoStorage();
        setState({ isAuthenticated: false, userInfo: null, loading: false });
      }
    })();
  }, [client]);

  const signIn = () => client.signIn(window.location.origin);
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

  return (
    <AuthCtx.Provider
      value={{
        ...state,
        signIn,
        signOut,
        getAccessToken,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}