import { LogtoProvider, useHandleSignInCallback } from '@logto/react';

function CallbackFinalizer() {
  // Runs once after redirect if ?code & ?state exist
  useHandleSignInCallback(() => {
    // tidy the URL after the token exchange
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.origin);
    }
  });
  return null;
}

export default function AuthProvider({ children }) {
  const cfg = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk',
    appId: import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    // resources: import.meta.env.VITE_API_AUDIENCE ? [import.meta.env.VITE_API_AUDIENCE] : undefined, // enable later if needed
  };

  return (
    <LogtoProvider config={cfg}>
      <CallbackFinalizer />
      {children}
    </LogtoProvider>
  );
}