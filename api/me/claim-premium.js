// api/me/claim-premium.js
// Grants premium status to the authenticated user (beta mode: auto-approve all)
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = process.env.LOGTO_ISSUER;
const MGMT_CLIENT_ID = process.env.MGMT_CLIENT_ID;
const MGMT_CLIENT_SECRET = process.env.MGMT_CLIENT_SECRET;
const API_AUDIENCE = process.env.API_AUDIENCE;
const MGMT_RESOURCE = process.env.MGMT_RESOURCE || `${ISSUER}/api`;

// Beta mode: auto-approve all claims. Set to false to require manual approval.
const BETA_AUTO_APPROVE = process.env.PREMIUM_AUTO_APPROVE !== 'false';

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

async function updateUserCustomData(userId, customData, mgmtToken) {
  const r = await fetch(`${ISSUER}/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${mgmtToken}`,
    },
    body: JSON.stringify({ customData }),
  });
  if (!r.ok) throw new Error(`Update failed: ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
    const currentCustomData = user.customData ?? {};

    // Check if already premium
    if (currentCustomData.isPremium === true) {
      return res.status(200).json({
        success: true,
        message: 'Already premium',
        isPremium: true,
        premiumSince: currentCustomData.premiumSince,
      });
    }

    // Beta mode: auto-approve
    if (!BETA_AUTO_APPROVE) {
      return res.status(403).json({
        error: 'Premium claims require approval. Contact support.',
        isPremium: false,
      });
    }

    // Grant premium status
    const now = new Date().toISOString();
    const updatedCustomData = {
      ...currentCustomData,
      isPremium: true,
      premiumSince: now,
      premiumSource: 'beta-claim', // Track how they got premium
    };

    await updateUserCustomData(userId, updatedCustomData, mgmtToken);

    console.log(`[premium] Granted premium to user ${userId} via beta claim`);

    return res.status(200).json({
      success: true,
      message: 'Premium activated!',
      isPremium: true,
      premiumSince: now,
    });
  } catch (e) {
    console.error('Claim premium error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
