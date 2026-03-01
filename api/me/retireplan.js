// api/me/retireplan.js
import { createRemoteJWKSet, jwtVerify } from 'jose';
import crypto from 'crypto';

const ISSUER = process.env.LOGTO_ISSUER;                 // e.g. https://auth.your-logto-domain
const MGMT_CLIENT_ID = process.env.MGMT_CLIENT_ID;
const MGMT_CLIENT_SECRET = process.env.MGMT_CLIENT_SECRET;
const API_AUDIENCE = process.env.API_AUDIENCE;           // optional
const MGMT_RESOURCE = process.env.MGMT_RESOURCE || `${ISSUER}/api`;
// Key versioning: supports ENCRYPTION_KEY (current) and ENCRYPTION_KEY_V{n} for rotation
// To rotate: 1) Add new ENCRYPTION_KEY_V2, 2) Change ENCRYPTION_KEY to new value
// Old keys kept for decrypting existing data until all users have re-saved
const CURRENT_KEY_VERSION = parseInt(process.env.ENCRYPTION_KEY_VERSION || '1', 10);
const ENCRYPTION_KEYS = {};

// Load all available keys (current + versioned backups)
if (process.env.ENCRYPTION_KEY) {
  ENCRYPTION_KEYS[CURRENT_KEY_VERSION] = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
}
// Load any legacy versioned keys for decryption (ENCRYPTION_KEY_V1, ENCRYPTION_KEY_V2, etc.)
for (let v = 1; v <= 10; v++) {
  const keyEnv = process.env[`ENCRYPTION_KEY_V${v}`];
  if (keyEnv && !ENCRYPTION_KEYS[v]) {
    ENCRYPTION_KEYS[v] = Buffer.from(keyEnv, 'hex');
  }
}

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/oidc/jwks`));

// Encryption helpers for AES-256-GCM with key versioning
function encrypt(data) {
  const key = ENCRYPTION_KEYS[CURRENT_KEY_VERSION];
  if (!key) {
    console.warn('ENCRYPTION_KEY not set - data will be stored unencrypted');
    return data;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);
  return {
    _encrypted: true,
    _keyVersion: CURRENT_KEY_VERSION,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: encrypted.toString('hex')
  };
}

function decrypt(payload) {
  // Handle null/undefined or unencrypted legacy data
  if (!payload || !payload._encrypted) return payload;

  // Determine which key version to use (default to 1 for data encrypted before versioning)
  const keyVersion = payload._keyVersion || 1;
  const key = ENCRYPTION_KEYS[keyVersion];

  if (!key) {
    throw new Error(`Encrypted data requires key version ${keyVersion} but it's not configured`);
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'hex')),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

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
    headers: {
      Authorization: `Bearer ${mgmtToken}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
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
      // Return the latest snapshot if it exists (decrypted)
      const decrypted = decrypt(currentRP?.latest ?? null);
      return res.status(200).json(decrypted);
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const encrypted = encrypt(body);
      const next = { ...current, retirePlan: { latest: encrypted } }; // store encrypted snapshot
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