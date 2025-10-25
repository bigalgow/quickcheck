// src/auth/AuthProvider.jsx
import { LogtoProvider, useHandleSignInCallback } from '@logto/react';

function CallbackFinalizer() {
  console.log('[Logto] CallbackFinalizer mounted, checking URL…');

  useHandleSignInCallback(() => {
    console.log('[Logto] useHandleSignInCallback fired — code exchange complete.');
    if (typeof window !== 'undefined') {
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