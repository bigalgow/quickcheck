import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getLogto } from './logtoClient';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const logto = useMemo(() => getLogto(), []);
  const [state, setState] = useState({ isAuthenticated: false, userInfo: null, loading: true });

  // 1) finish callback if ?code&state present
  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        if (qs.has('code') && qs.has('state')) {
          await logto.handleSignInCallback(window.location.href);
          // clean URL
          window.history.replaceState({}, document.title, window.location.origin);
        }
      } catch (e) {
        console.error('[logto] handleSignInCallback failed:', e);
      } finally {
        // after attempting callback, sync auth state
        try {
          const isAuthed = await logto.isAuthenticated();
          let user = null;
          if (isAuthed) {
            // fetch claims/profile
            user = await logto.fetchUserInfo();
          }
          setState({ isAuthenticated: isAuthed, userInfo: user, loading: false });
        } catch (e) {
          console.error('[logto] status sync failed:', e);
          setState((s) => ({ ...s, loading: false }));
        }
      }
    })();
  }, [logto]);

  const signIn = async () => {
    await logto.signIn(window.location.origin); // redirect to root (registered in console)
  };

  const signOut = async () => {
    await logto.signOut(window.location.origin); // must be in Post sign-out URIs
    // after redirect back, the effect above will re-sync and show logged-out UI
  };

  const getAccessToken = async () => {
    // Option A: Account API token (opaque is fine)
    return logto.getAccessToken();
  };

  const value = {
    ...state,
    signIn,
    signOut,
    getAccessToken,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
