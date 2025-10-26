// src/auth/logtoClient.js
// Use the browser SDK (works in Vite SPA). In this package version the client is the DEFAULT export.
import LogtoClient from '@logto/browser';

let client;

export function getLogto() {
  if (!client) {
    client = new LogtoClient({
      endpoint: import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk',
      appId: import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z',
      // Option A: request Account API-friendly scopes (opaque token OK)
      scopes: ['openid', 'profile', 'email', 'offline_access', 'custom_data'],
      // No 'resources' here (we’re using Account API, not your custom API audience)
    });
  }
  return client;
}
