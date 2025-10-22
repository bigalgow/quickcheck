import { LogtoProvider } from '@logto/react';

export default function AuthProvider({ children }) {
  const cfg = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
    appId: import.meta.env.VITE_LOGTO_APP_ID,
    resources: import.meta.env.VITE_API_AUDIENCE ? [import.meta.env.VITE_API_AUDIENCE] : undefined,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  };
  console.log('Logto cfg:', cfg); // remove after testing
  return <LogtoProvider config={cfg}>{children}</LogtoProvider>;
}
