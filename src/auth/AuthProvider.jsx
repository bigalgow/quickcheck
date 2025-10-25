// src/auth/AuthProvider.jsx
import React from 'react';
import { LogtoProvider, useHandleSignInCallback } from '@logto/react';

function CallbackGate() {
  // Only mount the hook when we actually have ?code & ?state
  const hasCode =
    typeof window !== 'undefined' && /[?&]code=/.test(window.location.search);
  const hasState =
    typeof window !== 'undefined' && /[?&]state=/.test(window.location.search);

  // If no auth params in URL, don’t run anything
  if (!hasCode || !hasState) return null;

  // Run the exchange; show status so we know it’s alive
  const { isLoading, error } = useHandleSignInCallback(() => {
    // Clean the URL after exchange
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.origin);
    }
    console.log('[Logto] callback complete — code exchanged');
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2>Finishing sign-in…</h2>
        {isLoading && <p>Contacting identity server…</p>}
        {error && (
          <pre style={{ color: 'crimson', textAlign: 'left' }}>
            {String(error)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function AuthProvider({ children }) {
  const cfg = {
    endpoint:
      import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk',
    appId: import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    // resources: import.meta.env.VITE_API_AUDIENCE ? [import.meta.env.VITE_API_AUDIENCE] : undefined,
  };

  console.log('Logto cfg:', cfg);

  return (
    <LogtoProvider config={cfg}>
      {/* This overlay renders ONLY when ?code&state are in the URL,
          runs the exchange, and then removes the query string. */}
      <CallbackGate />
      {children}
    </LogtoProvider>
  );
}