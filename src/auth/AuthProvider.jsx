import { LogtoProvider } from '@logto/react';

export default function AuthProvider({ children }) {
  return (
    <LogtoProvider
      config={{
        endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
        appId: import.meta.env.VITE_LOGTO_APP_ID,
        resources: import.meta.env.VITE_API_AUDIENCE ? [import.meta.env.VITE_API_AUDIENCE] : undefined,
        scopes: ['openid', 'profile', 'email', 'offline_access'],
      }}
    >
      {children}
    </LogtoProvider>
  );
}
