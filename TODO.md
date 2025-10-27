# Tomorrow's Tasks

## 1. Webflow Integration with Cross-Domain Auth

**Goal**: Integrate the calculator with the main Webflow site and enable seamless authentication across domains.

**Key Considerations**:
- Main site domain vs. calculator domain (e.g., `retireplan.co.uk` vs. `app.retireplan.co.uk`)
- Logto cross-domain SSO configuration
- Embedding options: iframe vs. subdomain
- Session sharing and token management
- Navigation between main site and calculator

**Research Needed**:
- Logto SSO configuration for multiple domains
- Cookie settings (SameSite, domain scope)
- Webflow custom code integration points

---

## 2. Phase 2: Projection Planner

**Goal**: Build a 20-25 year post-retirement projection tool that uses "at retirement" data as input.

**Architecture Plan**:
- New component: `PostRetirement.jsx` or `ProjectionPlanner.jsx`
- Takes output from Phase 1 as input
- Year-by-year breakdown showing:
  - Asset drawdown
  - Income sources (pensions, state pension, drawdown/annuity)
  - Expenditure
  - Tax calculations per year
  - Inflation adjustments
  - Running balance

**Data Flow**:
```
AtRetirement (Phase 1)
  → outputs { assetsTotal, income, netIncome, etc. }
  → ProjectionPlanner (Phase 2)
  → 25-year timeline
```

**UI Considerations**:
- Table or chart visualization
- Adjustable parameters (inflation scenarios, one-off expenses)
- "What-if" scenarios
- Export/print functionality

---

## 3. Server-Side Encryption for customData

**Goal**: Add encryption/decryption to protect sensitive user data stored in Logto.

**Current Flow**:
```
Frontend → API → Logto customData (PLAIN TEXT)
```

**Target Flow**:
```
Frontend → API → Encrypt → Logto customData (ENCRYPTED)
Logto customData → API → Decrypt → Frontend
```

**Implementation Options**:

### Option A: Symmetric Encryption (AES)
- Use a server-side encryption key (stored in Vercel env vars)
- Encrypt data before saving to Logto
- Decrypt on retrieval
- **Pros**: Simple, fast
- **Cons**: If key leaks, all data compromised

### Option B: User-Specific Keys (Derived from userId)
- Derive encryption key from user's `sub` (user ID) + master secret
- Different key per user
- **Pros**: Better security, user isolation
- **Cons**: Slightly more complex

### Option C: Client-Side Encryption
- Encrypt in browser before sending to API
- **Pros**: Data never exposed to server
- **Cons**: Key management complex, can't recover if user loses key

**Recommended**: Option B (user-specific keys)

**Libraries**:
- `crypto` (Node.js built-in) for AES-256-GCM
- Or `@noble/ciphers` for a lightweight alternative

**Implementation Sketch**:
```javascript
// api/me/retireplan.js
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const MASTER_SECRET = process.env.ENCRYPTION_SECRET; // 32-byte key

function getUserKey(userId) {
  // Derive user-specific key from userId + master secret
  const hash = createHash('sha256');
  hash.update(userId + MASTER_SECRET);
  return hash.digest();
}

function encrypt(data, userId) {
  const key = getUserKey(userId);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, userId) {
  const key = getUserKey(userId);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encryptedData.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}
```

**Migration Strategy**:
- Check if data is encrypted (has `iv` and `authTag` fields)
- If not, treat as legacy plain text, encrypt on next save
- Gradual migration without breaking existing users

---

## Current Status Summary

### ✅ Working
- Phase 1: "At Retirement" calculator fully functional
- Authentication with Logto
- Auto-load saved data on login
- Save to Logto customData
- LocalStorage autosave (crash recovery)
- Export/Import JSON
- Tax calculations (England/Wales/NI and Scotland)
- DB and DC pension projections

### 🔧 Ready for Enhancement
- Webflow integration (tomorrow)
- Phase 2: Projection planner (tomorrow)
- Encryption (tomorrow)

### 📋 Nice-to-Have (Future)
- Remove default test data from form
- Mobile responsive design review
- Accessibility audit
- Performance optimization
