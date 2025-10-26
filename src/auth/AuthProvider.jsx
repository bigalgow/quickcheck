// src/auth/AuthProvider.jsx
import React, { useEffect } from 'react';
import { LogtoProvider, useHandleSignInCallback, useLogto } from '@logto/react';

function CallbackFinalizer() {
  // Only mount the hook when ?code & ?state exist
  const hasAuthParams =
    typeof window !== 'undefined' &&
    window.location.search.includes('code=') &&
    window.location.search.includes('state=');

  const { isLoading, error } = useHandleSignInCallback(() => {
    console.log('[Logto] useHandleSignInCallback: code→token exchange complete.');
    if (typeof window !== 'undefined') {
      // Clean the URL so we don’t retry the callback.
      window.history.replaceState({}, document.title, window.location.origin);
    }
  });

  useEffect(() => {
    if (hasAuthParams) {
      console.log('[Logto] Detected ?code & ?state. Running callback…');
    }
  }, [hasAuthParams]);

  if (!hasAuthParams) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2>Finishing sign-in…</h2>
        {isLoading && <p>Contacting identity server…</p>}
        {error && (
          <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
            {String(error)}
          </pre>
        )}
      </div>
    </div>
  );
}

function DebugBanner() {
  // Small, temporary banner so we can see what the SDK thinks.
  const { isAuthenticated, isLoading, userInfo } = useLogto();
  useEffect(() => {
    console.log('[Logto] state:', { isAuthenticated, isLoading, userInfo });
  }, [isAuthenticated, isLoading, userInfo]);

  return null;
}

export default function AuthProvider({ children }) {
  const cfg = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk',
    appId: import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z',
    // Option A: we want an Account API token (opaque is fine) for /api/my-account/*
    // Don’t specify resources here.
    scopes: ['openid', 'profile', 'email', 'offline_access', 'custom_data'],
  };

  console.log('[Logto] Provider config:', cfg);

  return (
    <LogtoProvider config={cfg}>
      <CallbackFinalizer />
      <DebugBanner />
      {children}
    </LogtoProvider>
  );
}