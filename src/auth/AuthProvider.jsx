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
    // Also clear SSO attempt tracking
    sessionStorage.removeItem('logto:sso_attempted');
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
  });

  useEffect(() => {
    const SSO_ATTEMPTED_KEY = 'logto:sso_attempted';

    (async () => {
      try {
        // finish callback if needed
        const qs = new URLSearchParams(window.location.search);
        if (qs.has('code') && qs.has('state')) {
          await client.handleSignInCallback(window.location.href);
          window.history.replaceState({}, document.title, window.location.origin);
          // Mark that we've completed SSO attempt (successful or not)
          sessionStorage.setItem(SSO_ATTEMPTED_KEY, 'true');
        }
      } catch (e) {
        console.error('[logto] handleSignInCallback failed:', e);
        // If this failed, we still continue to status sync below.
      }

      try {
        const authed = await client.isAuthenticated();
        const ssoAttempted = sessionStorage.getItem(SSO_ATTEMPTED_KEY);

        console.log('[logto] Auth status check:', {
          isAuthenticated: authed,
          ssoAlreadyAttempted: !!ssoAttempted,
          willAttemptSSO: !authed && !ssoAttempted
        });

        // SSO: If not authenticated locally, attempt silent sign-in to check for active Logto session
        // Only try once per session to avoid infinite loops
        if (!authed && !ssoAttempted) {
          try {
            const redirectUri = window.location.origin;
            console.log('[logto] Attempting silent SSO sign-in with redirectUri:', redirectUri);
            sessionStorage.setItem(SSO_ATTEMPTED_KEY, 'true');
            await client.signIn({
              redirectUri,
              prompt: 'none', // Silent authentication - won't show login UI if session exists
            });
            // If we get here, silent sign-in succeeded - status will be checked on redirect
            return;
          } catch (ssoError) {
            // Silent sign-in failed - no active SSO session, continue as guest
            console.log('[logto] No active SSO session found:', ssoError?.message || ssoError);
            // If error is about cookies/third-party, log it prominently
            if (ssoError?.message?.includes('cookie') || ssoError?.message?.includes('third-party')) {
              console.warn('[logto] SSO may be blocked by browser cookie settings');
            }
          }
        }

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