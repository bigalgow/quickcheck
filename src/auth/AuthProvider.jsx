// src/auth/AuthProvider.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { LogtoProvider } from '@logto/react';
import { LogtoClient } from '@logto/browser'; // manual fallback

export default function AuthProvider({ children }) {
  const endpoint =
    import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk';
  const appId =
    import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z';
  const audience = import.meta.env.VITE_API_AUDIENCE || undefined;

  const cfg = useMemo(
    () => ({
      endpoint,
      appId,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      resources: audience ? [audience] : undefined,
    }),
    [endpoint, appId, audience]
  );

  // --- Manual callback fallback: if ?code&state exist, run the exchange explicitly
  const [cbState, setCbState] = useState({ working: false, error: null });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const usp = new URLSearchParams(window.location.search);
    const hasCode = usp.has('code');
    const hasState = usp.has('state');
    if (!hasCode || !hasState) return;

    // Only run once per load
    if (cbState.working) return;
    setCbState({ working: true, error: null });

    (async () => {
      try {
        console.log('[Logto] Manual callback: starting code→token exchange');
        const client = new LogtoClient(cfg);
        // This parses window.location.href and exchanges code for tokens (PKCE)
        await client.handleSignInCallback(window.location.href);
        console.log('[Logto] Manual callback: exchange complete');

        // Optional: sanity check we’re authenticated
        const authed = await client.isAuthenticated();
        console.log('[Logto] Manual callback: isAuthenticated =', authed);

        // Clean URL and reload root so @logto/react picks up the stored session
        window.history.replaceState({}, document.title, window.location.origin);
        window.location.replace(window.location.origin);
      } catch (e) {
        console.error('[Logto] Manual callback FAILED:', e);
        setCbState({ working: false, error: e });
      }
    })();
  }, [cfg, cbState.working]);

  // Show a simple overlay while manually finishing sign-in
  const showOverlay =
    typeof window !== 'undefined' &&
    (window.location.search.includes('code=') &&
      window.location.search.includes('state='));

  return (
    <LogtoProvider config={cfg}>
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 520 }}>
            <h2>Finishing sign-in…</h2>
            {!cbState.error ? (
              <p>Contacting identity server…</p>
            ) : (
              <div style={{ color: 'crimson', textAlign: 'left' }}>
                <p><strong>Sign-in error</strong></p>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{String(cbState.error)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </LogtoProvider>
  );
}