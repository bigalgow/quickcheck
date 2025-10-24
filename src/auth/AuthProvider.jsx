import { LogtoProvider } from '@logto/react';

export default function AuthProvider({ children }) {
  const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk';
  const appId = import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z';

  const cfg = {
    endpoint,
    appId,
    // Remove resources/audience for now
    // scopes: ['openid', 'profile', 'email'], // keep it simple for debugging
    scopes: ['openid', 'profile', 'email', 'offline_access'],

  };

  if (typeof window !== 'undefined') window.__LOGTO_CFG__ = cfg;
  console.log('Logto cfg:', cfg);

  return <LogtoProvider config={cfg}>{children}</LogtoProvider>;
}
