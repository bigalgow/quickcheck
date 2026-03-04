// src/utils/tax.js
// 2026/27 UK tax configuration.
// NOTE: Scottish bands for 2026/27 should be verified against the Scottish Budget
// (typically announced December each year). Values below are 2025/26 placeholders.

// Personal allowance (standard) & taper
const STD_PA = 12570;
const PA_TAPER_START = 100000;
const PA_ZERO_AT = 125140;

function taperedPersonalAllowance(adjustedNetIncome) {
  if (adjustedNetIncome <= PA_TAPER_START) return STD_PA;
  if (adjustedNetIncome >= PA_ZERO_AT) return 0;
  const reduction = Math.floor((adjustedNetIncome - PA_TAPER_START) / 2);
  return Math.max(0, STD_PA - reduction);
}

// Personal savings allowance (PSA)
function savingsAllowance(basicOrHigherOrAdditional) {
  if (basicOrHigherOrAdditional === "basic") return 1000;
  if (basicOrHigherOrAdditional === "higher") return 500;
  return 0; // additional
}

// Determine taxpayer status for PSA using rUK thresholds (simple rule)
function taxpayerStatusForPSA(taxableNonSavings, cfg) {
  const r = cfg.psaBands;
  const taxable = Math.max(0, taxableNonSavings);
  if (taxable <= r.basic) return "basic";
  if (taxable <= r.higher) return "higher";
  return "additional";
}

// Dividend allowance (nil-rate band) - £500 from 2024/25 onwards
const DIVIDEND_ALLOWANCE = 500;

// England/Wales/NI income tax bands (non-savings) — frozen until April 2028
export const TAX_2026_EWNI = {
  bands: [
    { upTo: 37700, rate: 0.20 },      // basic
    { upTo: 125140, rate: 0.40 },     // higher
    { upTo: Infinity, rate: 0.45 },   // additional
  ],
  psaBands: { basic: 37700, higher: 125140 },
  dividendBands: [
    { upTo: 37700, rate: 0.0875 },    // basic
    { upTo: 125140, rate: 0.3375 },   // higher
    { upTo: Infinity, rate: 0.3935 }, // additional
  ],
};

// Scotland income tax bands — VERIFY 2026/27 rates against Scottish Budget announcement
export const TAX_2026_SCOTLAND = {
  bands: [
    { upTo: 14732, rate: 0.19 },   // starter   ← verify for 2026/27
    { upTo: 25989, rate: 0.20 },   // basic     ← verify for 2026/27
    { upTo: 43662, rate: 0.21 },   // intermediate ← verify for 2026/27
    { upTo: 75437, rate: 0.42 },   // higher    ← verify for 2026/27
    { upTo: 125140, rate: 0.45 },  // top
    { upTo: Infinity, rate: 0.48 },// advanced/additional
  ],
  // PSA status still uses rUK concept (HMRC rule)
  psaBands: { basic: 37700, higher: 125140 },
  // Dividend rates are reserved — same as rUK (PSA/dividend rules are UK-wide)
  dividendBands: [
    { upTo: 37700, rate: 0.0875 },
    { upTo: 125140, rate: 0.3375 },
    { upTo: Infinity, rate: 0.3935 },
  ],
};

// Backward-compat aliases (remove after all callers updated)
export const TAX_2025_EWNI = TAX_2026_EWNI;
export const TAX_2025_SCOTLAND = TAX_2026_SCOTLAND;

/**
 * Estimate UK income tax on pension/property/other income, savings interest, and dividend income.
 *
 * Income is stacked in order: non-savings → savings → dividends.
 * Property income is currently taxed at income tax rates (same as pension).
 * Prepared for separate property treatment when 2027/28 rules are known.
 *
 * @param {number} pensionableIncome  - Pension + property + other non-dividend income
 * @param {number} savingsInterest    - Taxable savings interest (after PSA)
 * @param {number} dividendIncome     - Gross dividend income (allowance applied here)
 * @param {number} propertyIncome     - Property/rental income (reserved for 2027/28 — currently 0, included in pensionableIncome by caller)
 * @param {Object} cfg                - Tax configuration (TAX_2026_EWNI or TAX_2026_SCOTLAND)
 */
export function estimateIncomeTax({ pensionableIncome, savingsInterest, dividendIncome = 0, propertyIncome = 0, cfg }) {
  const nonSav = Math.max(0, pensionableIncome);
  const interest = Math.max(0, savingsInterest);
  const dividends = Math.max(0, dividendIncome);

  // Adjusted Net Income (simplified: gross of all income types)
  const gross = nonSav + interest + dividends;
  const pa = taperedPersonalAllowance(gross);

  // Determine PSA from NON-SAVINGS taxable band (after PA)
  const taxableNonSavings = Math.max(0, nonSav - pa);
  const status = taxpayerStatusForPSA(taxableNonSavings, cfg);
  const psa = savingsAllowance(status);

  // Allocate PA: first against non-savings, any remainder against savings
  let remainingPA = pa;
  const nonSavingsAfterPA = Math.max(0, nonSav - remainingPA);
  remainingPA = Math.max(0, remainingPA - nonSav);

  let savingsAfterPA = Math.max(0, interest - remainingPA);
  const savingsAfterPSA = Math.max(0, savingsAfterPA - psa);

  // === TAX: NON-SAVINGS ===
  let tax = 0;
  let cumulativeIncome = 0;
  let remaining = nonSavingsAfterPA;
  let lowerEdge = 0;

  for (const band of cfg.bands) {
    const cap = band.upTo ?? Infinity;
    const width = Math.max(0, Math.min(remaining, cap - lowerEdge));
    if (width > 0) {
      tax += width * band.rate;
      remaining -= width;
      cumulativeIncome += width;
    }
    lowerEdge = cap;
    if (remaining <= 0) break;
  }

  // === TAX: SAVINGS (stacked on top of non-savings) ===
  remaining = savingsAfterPSA;
  lowerEdge = cumulativeIncome;

  for (const band of cfg.bands) {
    const cap = band.upTo ?? Infinity;
    const width = Math.max(0, Math.min(remaining, cap - lowerEdge));
    if (width > 0) {
      tax += width * band.rate;
      remaining -= width;
      cumulativeIncome += width;
    }
    lowerEdge = cap;
    if (remaining <= 0) break;
  }

  // === TAX: DIVIDENDS (stacked on top of everything, after allowance) ===
  const dividendsAfterAllowance = Math.max(0, dividends - DIVIDEND_ALLOWANCE);
  if (dividendsAfterAllowance > 0 && cfg.dividendBands) {
    remaining = dividendsAfterAllowance;
    lowerEdge = cumulativeIncome;

    for (const band of cfg.dividendBands) {
      const cap = band.upTo ?? Infinity;
      const width = Math.max(0, Math.min(remaining, cap - lowerEdge));
      if (width > 0) {
        tax += width * band.rate;
        remaining -= width;
      }
      lowerEdge = cap;
      if (remaining <= 0) break;
    }
  }

  return { tax, personalAllowanceUsed: pa, psaUsed: Math.min(psa, savingsAfterPA) };
}
