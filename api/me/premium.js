// api/me/premium.js
// Returns premium status for the authenticated user
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = process.env.LOGTO_ISSUER;
const MGMT_CLIENT_ID = process.env.MGMT_CLIENT_ID;
const MGMT_CLIENT_SECRET = process.env.MGMT_CLIENT_SECRET;
const API_AUDIENCE = process.env.API_AUDIENCE;
const MGMT_RESOURCE = process.env.MGMT_RESOURCE || `${ISSUER}/api`;

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/oidc/jwks`));

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${ISSUER}/oidc`,
    ...(API_AUDIENCE ? { audience: API_AUDIENCE } : {}),
  });
  return payload;
}

async function getManagementToken() {
  const res = await fetch(`${ISSUER}/oidc/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: MGMT_CLIENT_ID,
      client_secret: MGMT_CLIENT_SECRET,
      resource: MGMT_RESOURCE,
      scope: 'all',
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Mgmt token error: ${res.status}`);
  return res.json();
}

async function getUser(userId, mgmtToken) {
  const r = await fetch(`${ISSUER}/api/users/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${mgmtToken}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Get user failed: ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const payload = await verifyAccessToken(token);
    const userId = payload.sub;

    const { access_token: mgmtToken } = await getManagementToken();
    const user = await getUser(userId, mgmtToken);
    const customData = user.customData ?? {};

    // Return premium status
    return res.status(200).json({
      isPremium: customData.isPremium === true,
      premiumSince: customData.premiumSince || null,
      premiumExpires: customData.premiumExpires || null,
    });
  } catch (e) {
    console.error('Premium check error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
