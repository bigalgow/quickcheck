// api/me/retireplan.js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = process.env.LOGTO_ISSUER;                 // e.g. https://auth.your-logto-domain
const MGMT_CLIENT_ID = process.env.MGMT_CLIENT_ID;
const MGMT_CLIENT_SECRET = process.env.MGMT_CLIENT_SECRET;
const API_AUDIENCE = process.env.API_AUDIENCE;           // optional
const MGMT_RESOURCE = process.env.MGMT_RESOURCE || `${ISSUER}/api`;

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/oidc/jwks`));

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${ISSUER}/oidc`,
    ...(API_AUDIENCE ? { audience: API_AUDIENCE } : {}),
  });
  return payload; // { sub, email, ... }
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
  if (!res.ok) throw new Error(`Mgmt token error: ${res.status} ${await res.text()}`);
  return res.json(); // { access_token }
}

async function getUser(userId, mgmtToken) {
  const r = await fetch(`${ISSUER}/api/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${mgmtToken}` },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Get user failed: ${r.status}`);
  return r.json();
}

async function updateUserCustomData(userId, nextCustomData, mgmtToken) {
  const r = await fetch(`${ISSUER}/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${mgmtToken}`,
    },
    body: JSON.stringify({ customData: nextCustomData }),
  });
  if (!r.ok) throw new Error(`Update failed: ${r.status} ${await r.text()}`);
}

export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const payload = await verifyAccessToken(token);
    const userId = payload.sub;

    const { access_token: mgmtToken } = await getManagementToken();
    const user = await getUser(userId, mgmtToken);
    const current = user.customData ?? {};
    const currentRP = current.retirePlan ?? null;

    if (req.method === 'GET') {
      // Return both retirePlan data and lifestyleProfile
      return res.status(200).json({
        ...(currentRP?.latest ?? {}),
        lifestyleProfile: current.lifestyleProfile ?? null
      });
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};

      // Extract lifestyleProfile if provided separately
      const { lifestyleProfile, ...retirePlanData } = body;

      // Build next customData, preserving both fields
      const next = { ...current };

      // Update retirePlan if there's data other than lifestyleProfile
      if (Object.keys(retirePlanData).length > 0 || !lifestyleProfile) {
        next.retirePlan = { latest: retirePlanData };
      }

      // Update lifestyleProfile if provided (can be null to delete)
      if (lifestyleProfile !== undefined) {
        next.lifestyleProfile = lifestyleProfile;
      }

      await updateUserCustomData(userId, next, mgmtToken);
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}