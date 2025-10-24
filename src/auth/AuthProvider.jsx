// src/auth/AuthProvider.jsx
import { useEffect } from 'react';
import { LogtoProvider } from '@logto/react';
import { handleSignInCallback } from '@logto/browser';

export default function AuthProvider({ children }) {
  const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk';
  const appId = import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z';
  // If/when you use a Resource (API audience), re-enable resources below.
  const audience = import.meta.env.VITE_API_AUDIENCE || undefined;

  const cfg = {
    endpoint,
    appId,
    // resources: audience ? [audience] : undefined, // re-enable if you’re using an API Resource
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  };

  // Process ?code & ?state after redirect so the SDK finalizes the session.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasCode = /[?&]code=/.test(window.location.search);
    const hasState = /[?&]state=/.test(window.location.search);
    if (hasCode && hasState) {
      // Exchange code for tokens, then clean the URL.
      handleSignInCallback(cfg)
        .then(() => {
          window.history.replaceState({}, document.title, window.location.origin);
        })
        .catch((e) => {
          // Non-fatal: log for diagnostics
          console.error('Logto handleSignInCallback failed:', e);
        });
    }
  }, []);

  if (typeof window !== 'undefined') window.__LOGTO_CFG__ = cfg;
  console.log('Logto cfg:', cfg);

  return <LogtoProvider config={cfg}>{children}</LogtoProvider>;
}
