// src/auth/AuthProvider.jsx
import { LogtoProvider, useHandleSignInCallback } from '@logto/react';

// This small component runs automatically after login redirect
function CallbackFinalizer() {
  // useHandleSignInCallback processes ?code & ?state in the URL
  useHandleSignInCallback(() => {
    if (typeof window !== 'undefined') {
      // Clean the URL after the exchange
      window.history.replaceState({}, document.title, window.location.origin);
    }
  });
  return null;
}

// The main AuthProvider wraps your entire app (in main.jsx)
export default function AuthProvider({ children }) {
  const cfg = {
    // ---- YOUR LOGTO INSTANCE SETTINGS ----
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk',
    appId: import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z',

    // ---- SCOPES for Option A ----
    // We include custom_data here so the SPA can call the Account API directly.
    scopes: ['openid', 'profile', 'email', 'offline_access', 'custom_data'],

    // ---- IMPORTANT ----
    // For Option A, DO NOT include any "resources" or API audience.
    // That is only used when obtaining an access token for a custom API (Option B).
  };

  return (
    <LogtoProvider config={cfg}>
      {/* This handles the login callback automatically */}
      <CallbackFinalizer />
      {/* Your entire app runs inside the provider */}
      {children}
    </LogtoProvider>
  );
}