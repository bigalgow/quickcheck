import { LogtoProvider } from '@logto/react';

export default function AuthProvider({ children }) {
  // IMPORTANT: hardcode once to rule out env issues; then revert to env
  const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk';
  const appId = import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z';
  const audience = import.meta.env.VITE_API_AUDIENCE || undefined;

  const cfg = {
    endpoint,
    appId,
    resources: audience ? [audience] : undefined,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  };

  // Expose visibly for production debugging
  if (typeof window !== 'undefined') {
    window.__LOGTO_CFG__ = cfg; // check in DevTools: window.__LOGTO_CFG__
  }
  console.log('Logto cfg:', cfg); // you should SEE this in production console

  return <LogtoProvider config={cfg}>{children}</LogtoProvider>;
}
