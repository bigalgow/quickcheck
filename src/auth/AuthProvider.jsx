// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getLogto } from './logtoClient';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const logto = useMemo(() => getLogto(), []);
  const [state, setState] = useState({ isAuthenticated: false, userInfo: null, loading: true });

  useEffect(() => {
    (async () => {
      try {
        // If we arrived with ?code&state, finish the code→token exchange.
        const qs = new URLSearchParams(window.location.search);
        if (qs.has('code') && qs.has('state')) {
          await logto.handleSignInCallback(window.location.href);
          // Clean URL so we don’t retry
          window.history.replaceState({}, document.title, window.location.origin);
        }
      } catch (e) {
        console.error('[logto] handleSignInCallback failed:', e);
      } finally {
        // Sync current auth state + profile
        try {
          const authed = await logto.isAuthenticated();
          const profile = authed ? await logto.fetchUserInfo() : null;
          setState({ isAuthenticated: authed, userInfo: profile, loading: false });
        } catch (e) {
          console.error('[logto] status sync failed:', e);
          setState(s => ({ ...s, loading: false }));
        }
      }
    })();
  }, [logto]);

  const signIn = () => logto.signIn(window.location.origin);   // must match Redirect URIs in Logto
  const signOut = () => logto.signOut(window.location.origin); // must match Post sign-out Redirect URIs

  const getAccessToken = () => logto.getAccessToken(); // Option A (Account API): no audience

  const value = { ...state, signIn, signOut, getAccessToken };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}