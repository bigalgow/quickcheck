// src/utils/tax.js
// 2025/26 style example configs. Adjust when rules change.

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
  const r = cfg.psaBands; // [{upTo, rateName}]
  const taxable = Math.max(0, taxableNonSavings);
  if (taxable <= r.basic) return "basic";
  if (taxable <= r.higher) return "higher";
  return "additional";
}

// England/Wales/NI income tax bands (non-savings)
export const TAX_2025_EWNI = {
  bands: [
    { upTo: 37700, rate: 0.20 }, // basic
    { upTo: 125140, rate: 0.40 }, // higher (upper threshold not really used here)
    { upTo: Infinity, rate: 0.45 }, // additional
  ],
  psaBands: { basic: 37700, higher: 125140 },
};

// Scotland income tax bands (earnings)
export const TAX_2025_SCOTLAND = {
  bands: [
    { upTo: 14732, rate: 0.19 },   // starter
    { upTo: 25989, rate: 0.20 },   // basic
    { upTo: 43662, rate: 0.21 },   // intermediate
    { upTo: 75437, rate: 0.42 },   // higher
    { upTo: 125140, rate: 0.45 },  // top (align upper limit for PA taper)
    { upTo: Infinity, rate: 0.48 },// advanced/additional (illustrative)
  ],
  // PSA status still uses rUK concept (HMRC rule) — we’ll proxy with rUK thresholds:
  psaBands: { basic: 37700, higher: 125140 },
};

/**
 * Estimate UK income tax on (non-savings pensionable income) + savings interest.
 * Applies Personal Allowance **once** (fix), determines PSA from non-savings band.
 */
export function estimateIncomeTax({ pensionableIncome, savingsInterest, cfg }) {
  const nonSav = Math.max(0, pensionableIncome);
  const interest = Math.max(0, savingsInterest);
  const gross = nonSav + interest;

  // Adjusted Net Income (simplified here == gross)
  const pa = taperedPersonalAllowance(gross);

  // Determine PSA from NON-SAVINGS taxable band (after PA)
  const taxableNonSavings = Math.max(0, nonSav - pa);
  const status = taxpayerStatusForPSA(taxableNonSavings, cfg);
  const psa = savingsAllowance(status);

  // Allocate allowances:
  // Use PA first against non-savings; any remaining PA can go to savings (rare)
  let remainingPA = pa;
  const nonSavingsAfterPA = Math.max(0, nonSav - remainingPA);
  remainingPA = Math.max(0, remainingPA - nonSav);

  // Savings starting-rate band complexities omitted (kept simple as before).
  // Apply PSA to savings interest AFTER PA.
  let savingsAfterPA = Math.max(0, interest - remainingPA);
  const savingsAfterPSA = Math.max(0, savingsAfterPA - psa);

  // Tax non-savings using cfg bands
  let tax = 0;
  let remaining = nonSavingsAfterPA;
  let lowerEdge = 0;
  for (const band of cfg.bands) {
    const cap = band.upTo ?? Infinity;
    const width = Math.max(0, Math.min(remaining, cap - lowerEdge));
    if (width > 0) {
      tax += width * band.rate;
      remaining -= width;
    }
    lowerEdge = cap;
    if (remaining <= 0) break;
  }

  // Tax savings at the same marginal structure (approximation)
  remaining = savingsAfterPSA;
  lowerEdge = 0;
  for (const band of cfg.bands) {
    const cap = band.upTo ?? Infinity;
    const width = Math.max(0, Math.min(remaining, cap - lowerEdge));
    if (width > 0) {
      tax += width * band.rate;
      remaining -= width;
    }
    lowerEdge = cap;
    if (remaining <= 0) break;
  }

  return { tax, personalAllowanceUsed: pa, psaUsed: Math.min(psa, savingsAfterPA) };
}