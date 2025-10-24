// src/auth/AuthProvider.jsx
import { LogtoProvider, useHandleSignInCallback } from '@logto/react';

function CallbackFinalizer() {
  // Runs once when arriving with ?code=&state=
  useHandleSignInCallback(() => {
    if (typeof window !== 'undefined') {
      // Clean up URL (remove code/state)
      window.history.replaceState({}, document.title, window.location.origin);
    }
  });
  return null;
}

export default function AuthProvider({ children }) {
  const endpoint =
    import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk';
  const appId =
    import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z';
  const audience = import.meta.env.VITE_API_AUDIENCE || undefined;

  const cfg = {
    endpoint,
    appId,
    // resources: audience ? [audience] : undefined, // enable if you use an API Resource
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  };

  if (typeof window !== 'undefined') window.__LOGTO_CFG__ = cfg;
  console.log('Logto cfg:', cfg);

  return (
    <LogtoProvider config={cfg}>
      <CallbackFinalizer />
      {children}
    </LogtoProvider>
  );
}