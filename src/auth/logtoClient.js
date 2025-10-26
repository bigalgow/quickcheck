import { LogtoClient } from '@logto/js';

let client;

export function getLogto() {
  if (!client) {
    client = new LogtoClient({
      endpoint: import.meta.env.VITE_LOGTO_ENDPOINT || 'https://auth.retireplan.co.uk',
      appId: import.meta.env.VITE_LOGTO_APP_ID || 'pu4bsk6f3m9mox3vtxh8z',
      scopes: ['openid', 'profile', 'email', 'offline_access', 'custom_data'], // Option A
      // no resources here (we want Account API tokens for save)
    });
  }
  return client;
}
