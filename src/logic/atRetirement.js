// src/logic/atRetirement.js

// ---------- Date helpers ----------
export function toDate(val) {
  // Accepts "YYYY-MM-DD" or Date
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val + "T00:00:00");
  return new Date(NaN);
}

export function yearsBetween(a, b) {
  // precise years with decimals
  if (!a || !b || isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  return ms / (365.2425 * 24 * 3600 * 1000);
}

// ---------- Projection helpers ----------
export function projectWithContrib(start, addPerYear, years, rate) {
  // Lump sum + end-of-year compounding for the starting pot
  // Contributions are handled elsewhere (start-of-year timing)
  let v = start * Math.pow(1 + rate, years);
  // Handle rate = 0 case to avoid division by zero (NaN)
  // When rate = 0, geometric series sum is simply years * addPerYear
  if (rate === 0) {
    return v + (addPerYear > 0 ? addPerYear * years : 0);
  }
  return v + (addPerYear > 0 ? addPerYear * ((Math.pow(1 + rate, years) - 1) / rate) : 0);
}

export function inflateToRetirement(todayValue, years, inflation) {
  if (years <= 0 || inflation <= 0) return todayValue;
  return todayValue * Math.pow(1 + inflation, years);
}

export function deflateToToday(nominal, years, inflation) {
  if (years <= 0 || inflation <= 0) return nominal;
  return nominal / Math.pow(1 + inflation, years);
}

// ---------- DB commutation helpers ----------
const CF = 20; // commutation factor (simplified)
function dbCapitalFromIncome(dbAnnual) { return CF * dbAnnual; }
function applyDbPclsAmount(dbAnnualBefore, pclsAmount) {
  const surrenderIncome = pclsAmount / CF;
  const dbAfter = Math.max(0, dbAnnualBefore - surrenderIncome);
  return { dbAfter, pclsCash: pclsAmount };
}

// ---------- DC contribution schedules (START-OF-YEAR timing) ----------
/**
 * Employer scheme:
 *  - Salary grows with INFLATION
 *  - Contribution for year y is based on salary at START of that year
 *  - Each contribution compounds to retirement for (years - y + 1) years
 *  - Supports career breaks: skip contributions during break period
 */
function fvEmployerContrib(inputs, years, currentAge) {
  if (!inputs.dcIsContributing || inputs.dcContributionType !== "employer" || years <= 0) return 0;
  const gSalary = inputs.inflationAssumption; // simplification: salary growth == inflation
  let salary = inputs.salaryNow; // start-of-year salary for year 1
  let totalFV = 0;
  const rate = inputs.growthAssumption;

  // Career break handling
  const hasBreak = inputs.dcHasCareerBreak && inputs.dcBreakStartAge && inputs.dcBreakEndAge;
  const breakStart = hasBreak ? parseFloat(inputs.dcBreakStartAge) : Infinity;
  const breakEnd = hasBreak ? parseFloat(inputs.dcBreakEndAge) : Infinity;

  for (let y = 1; y <= years; y++) {
    const ageThisYear = currentAge + y;

    // Skip contributions during career break (salary still grows)
    if (hasBreak && ageThisYear >= breakStart && ageThisYear < breakEnd) {
      salary *= 1 + gSalary;
      continue;
    }

    const contrib = salary * (inputs.eePct + inputs.erPct);
    const exponent = years - y + 1; // start-of-year cashflow
    totalFV += contrib * Math.pow(1 + rate, exponent);
    // grow salary for next year's START
    salary *= 1 + gSalary;
  }
  return totalFV;
}

/**
 * Personal / SIPP:
 *  - Base amount escalates with INFLATION (to match employer timing parity)
 *  - Payment is at START of each year
 *  - Supports career breaks: skip contributions during break period
 */
function fvPersonalContrib(inputs, years, currentAge) {
  if (!inputs.dcIsContributing || inputs.dcContributionType !== "personal" || years <= 0) return 0;
  const esc = inputs.inflationAssumption; // simplification: escalation == inflation
  const base = inputs.personalAnnualContrib;
  const rate = inputs.growthAssumption;

  // Career break handling
  const hasBreak = inputs.dcHasCareerBreak && inputs.dcBreakStartAge && inputs.dcBreakEndAge;
  const breakStart = hasBreak ? parseFloat(inputs.dcBreakStartAge) : Infinity;
  const breakEnd = hasBreak ? parseFloat(inputs.dcBreakEndAge) : Infinity;

  let totalFV = 0;
  for (let y = 1; y <= years; y++) {
    const ageThisYear = currentAge + y;

    // Skip contributions during career break
    if (hasBreak && ageThisYear >= breakStart && ageThisYear < breakEnd) {
      continue;
    }

    const contrib = base * Math.pow(1 + esc, y - 1);
    const exponent = years - y + 1; // start-of-year cashflow
    totalFV += contrib * Math.pow(1 + rate, exponent);
  }
  return totalFV;
}

// ---------- DB schemes ----------
function computeActiveDbAtRet(s, yearsToRet, inflationDefault, currentAge) {
  // Accrual on final salary; salary grows with inflation
  // Supports career breaks: reduce future service years by break duration
  const acc = s.accrualDenominator; // e.g., 60
  const maxSrv = s.maxServiceYears ?? Infinity;

  // Career break handling: subtract break years from future service
  let futureServiceYears = yearsToRet;
  if (s.hasCareerBreak && s.breakStartAge && s.breakEndAge) {
    const breakStart = parseFloat(s.breakStartAge);
    const breakEnd = parseFloat(s.breakEndAge);
    const retirementAge = currentAge + yearsToRet;
    // Only count break years that fall within the working period
    const effectiveBreakStart = Math.max(breakStart, currentAge);
    const effectiveBreakEnd = Math.min(breakEnd, retirementAge);
    const breakYears = Math.max(0, effectiveBreakEnd - effectiveBreakStart);
    futureServiceYears = Math.max(0, yearsToRet - breakYears);
  }

  const totalService = Math.min((s.serviceYearsToDate ?? 0) + futureServiceYears, maxSrv);
  const g = inflationDefault;
  const finalSalary = s.pensionableSalaryNow * Math.pow(1 + g, yearsToRet);
  return (totalService / acc) * finalSalary; // annual pension at retirement (before PCLS)
}

function computeDeferredDbAtRet(s, yearsToRet, inflationDefault) {
  if (s.preservedPensionNow != null) {
    return s.preservedPensionNow * Math.pow(1 + s.revaluationAssumption, yearsToRet);
  }
  const acc = s.accrualDenominator ?? 60;
  const base = ((s.serviceYearsToDate ?? 0) / acc) * (s.salaryAtLeaving ?? 0);
  return base * Math.pow(1 + s.revaluationAssumption, yearsToRet);
}

function computeDbTotalAtRet(schemes, yearsToRet, inflationDefault, currentAge) {
  if (!Array.isArray(schemes) || schemes.length === 0) return 0;
  let total = 0;
  for (const s of schemes) {
    if (s.kind === "active") total += computeActiveDbAtRet(s, yearsToRet, inflationDefault, currentAge);
    else total += computeDeferredDbAtRet(s, yearsToRet, inflationDefault);
  }
  return total;
}

// Compute active and deferred DB separately for breakdown
function computeDbBreakdown(schemes, yearsToRet, inflationDefault, currentAge) {
  if (!Array.isArray(schemes) || schemes.length === 0) return { active: 0, deferred: 0 };
  let active = 0;
  let deferred = 0;
  for (const s of schemes) {
    if (s.kind === "active") active += computeActiveDbAtRet(s, yearsToRet, inflationDefault, currentAge);
    else deferred += computeDeferredDbAtRet(s, yearsToRet, inflationDefault);
  }
  return { active, deferred };
}

// ---------- Main ----------
export function atRetirement(inputs, taxFns) {
  // Compute years-to-retirement using DOB (decimal years)
  const today = new Date();
  const dob = toDate(inputs.dateOfBirth);
  const currentAgeYears = isNaN(dob.getTime()) ? inputs.currentAge : yearsBetween(dob, today);
  const retirementAgeYears = inputs.retirementAge;
  const years = Math.max(0, retirementAgeYears - currentAgeYears);

  // Check if already retired (explicit flag or years = 0)
  const alreadyRetired = inputs.alreadyRetired || years === 0;

  // ---- DC pot projection
  // If already retired, no growth projection needed - use current value as-is
  let dcProjected = alreadyRetired
    ? inputs.dcPotNow
    : inputs.dcPotNow * Math.pow(1 + inputs.growthAssumption, years);

  // DC contributions (employer / personal), both start-of-year timing
  // No contributions if already retired
  if (!alreadyRetired) {
    dcProjected += fvEmployerContrib(inputs, Math.floor(years), currentAgeYears);
    dcProjected += fvPersonalContrib(inputs, Math.floor(years), currentAgeYears);
  }

  // ---- DC PCLS request (capped later)
  // If already retired, PCLS already taken (assume 0 or already reflected in pot value)
  const desiredDcPcls = (alreadyRetired || !inputs.takeDCTaxFree25) ? 0 : 0.25 * dcProjected;

  // ---- DB annual (before any commutation), then desired DB PCLS (25% of capital)
  // If already retired, only process deferred schemes (no active schemes, no PCLS)
  const dbBeforePcls = computeDbTotalAtRet(inputs.dbSchemes || [], years, inputs.inflationAssumption, currentAgeYears);
  const dbBreakdown = computeDbBreakdown(inputs.dbSchemes || [], years, inputs.inflationAssumption, currentAgeYears);
  const desiredDbPcls = (alreadyRetired || !inputs.takeDBTaxFree25) ? 0 : 0.25 * dbCapitalFromIncome(dbBeforePcls);

  // ---- Enforce global PCLS cap across DC + DB
  const PCLS_CAP = 268275;
  const dcPclsAllowed = Math.min(desiredDcPcls, PCLS_CAP); // DC priority
  const remainingCapForDb = Math.max(0, PCLS_CAP - dcPclsAllowed);
  const dbPclsAllowed = Math.min(desiredDbPcls, remainingCapForDb);

  // Apply allowed PCLS
  const dcAtRetAfterPCLS = dcProjected - dcPclsAllowed;
  const { dbAfter } = applyDbPclsAmount(dbBeforePcls, dbPclsAllowed);

  // ---- DC income from AFTER-PCLS pot: Support blended annuity/drawdown strategy
  // dcAnnuityPct: 0-100, percentage of post-PCLS DC pot to annuitize
  const annuityPct = inputs.dcAnnuityPct ?? 0; // Default 0% (all drawdown)
  const dcPotForAnnuity = dcAtRetAfterPCLS * (annuityPct / 100);
  const dcPotForDrawdown = dcAtRetAfterPCLS * (1 - annuityPct / 100);

  const dcAnnuityIncome = dcPotForAnnuity * inputs.annuityRate;
  const dcDrawdownIncome = dcPotForDrawdown * inputs.drawdownRate;
  const dcIncome = dcAnnuityIncome + dcDrawdownIncome;

  // ---- State Pension & Other (inflated to retirement)
  const statePensionAtRetNominal = inflateToRetirement(
    inputs.statePensionAnnual,
    years,
    inputs.inflationAssumption
  );
  const spaWarning = retirementAgeYears < inputs.statePensionAge;

  // ---- Other Income: Split into categories for future tax differentiation
  const propertyIncomeAtRet = inflateToRetirement(
    inputs.propertyIncomeNow,
    years,
    inputs.inflationAssumption
  );
  const dividendIncomeAtRet = inflateToRetirement(
    inputs.dividendIncomeNow,
    years,
    inputs.inflationAssumption
  );
  const anyOtherIncomeAtRet = inflateToRetirement(
    inputs.anyOtherIncomeNow,
    years,
    inputs.inflationAssumption
  );
  const otherIncomeAtRet = propertyIncomeAtRet + dividendIncomeAtRet + anyOtherIncomeAtRet;

  // ---- Savings to retirement
  // If already retired, no additional contributions
  const isaAtRet = projectWithContrib(
    inputs.isaBalance,
    alreadyRetired ? 0 : inputs.isaAddPerYear,
    years,
    inputs.isaRate
  );
  const taxableAtRetBase = projectWithContrib(
    inputs.taxableSavingsBalance,
    alreadyRetired ? 0 : inputs.taxableSavingsAddPerYear,
    years,
    inputs.taxableSavingsRate
  );
  const higherYieldAtRet = projectWithContrib(
    inputs.higherYieldBalance || 0,
    alreadyRetired ? 0 : (inputs.higherYieldAddPerYear || 0),
    years,
    inputs.higherYieldRate || 0
  );
  const taxableAtRet = taxableAtRetBase + higherYieldAtRet;
  // Blended growth rate weighted by projected balances at retirement
  const blendedSavingsRate = taxableAtRet > 0
    ? (taxableAtRetBase * inputs.taxableSavingsRate + higherYieldAtRet * (inputs.higherYieldRate || 0)) / taxableAtRet
    : inputs.taxableSavingsRate;
  const taxableInterest = Math.max(0, taxableAtRet * blendedSavingsRate);

  // ---- Desired spend (inflated to retirement)
  const desiredSpendAtRet = inflateToRetirement(
    inputs.desiredSpendAnnual,
    years,
    inputs.inflationAssumption
  );

  // ---- Tax (only include state pension if at or past SPA)
  const statePensionForIncome = spaWarning ? 0 : statePensionAtRetNominal;
  const pensionableIncome =
    dcIncome + dbAfter + otherIncomeAtRet + statePensionForIncome;
  const taxRes =
    inputs.region === "Scotland"
      ? taxFns.taxScot({ pensionableIncome, savingsInterest: taxableInterest })
      : taxFns.taxEWNI({ pensionableIncome, savingsInterest: taxableInterest });

  // ---- Group outputs
  const assets = {
    dcAtRetAfterPCLS, // Total pot after PCLS (for reference)
    dcPotForDrawdown, // NEW: Actual remaining liquid pot (after annuity purchase)
    dcPotForAnnuity,  // NEW: Amount used to purchase annuity (no longer liquid)
    dcPclsCash: dcPclsAllowed,
    dbPclsCash: dbPclsAllowed,
    isaAtRet,
    taxableAtRet,
  };
  // Total assets = liquid assets only (annuitized pot is converted to income stream)
  const assetsTotal =
    assets.dcPotForDrawdown + // Only count remaining drawdown pot as liquid asset
    assets.dcPclsCash +
    assets.dbPclsCash +
    assets.isaAtRet +
    assets.taxableAtRet;

  const income = {
    dcIncome,
    dcAnnuityIncome, // NEW: Separate annuity income stream
    dcDrawdownIncome, // NEW: Separate drawdown income stream
    dcPotForAnnuity, // NEW: Pot used for annuity
    dcPotForDrawdown, // NEW: Pot used for drawdown
    dbIncomeAfter: dbAfter,
    dbActiveIncome: dbBreakdown.active, // NEW: Active DB income (before PCLS)
    dbDeferredIncome: dbBreakdown.deferred, // NEW: Deferred DB income (before PCLS)
    propertyIncomeAtRet, // NEW: Property income category
    dividendIncomeAtRet, // NEW: Dividend income category
    anyOtherIncomeAtRet, // NEW: Any other income category
    otherIncomeAtRet, // Total of above three categories
    statePensionAtRetNominal,
    statePensionForIncome, // Actual amount used in calculations (0 if before SPA)
    taxableInterest,
  };
  // Gross income total for display - pension income only (savings interest is asset growth, not income)
  const incomeGrossTotal =
    income.dcIncome +
    income.dbIncomeAfter +
    income.otherIncomeAtRet +
    income.statePensionForIncome;

  // Net income: pension income minus tax (tax includes tax on savings interest, paid from income)
  const netIncome = incomeGrossTotal - taxRes.tax;
  const surplusDeficit = netIncome - desiredSpendAtRet;

  // ---- Real terms
  const deflate = (x) => deflateToToday(x, years, inputs.inflationAssumption);
  const real = {
    assets: {
      dcAtRetAfterPCLS: deflate(assets.dcAtRetAfterPCLS),
      dcPotForDrawdown: deflate(assets.dcPotForDrawdown),
      dcPotForAnnuity: deflate(assets.dcPotForAnnuity),
      dcPclsCash: deflate(assets.dcPclsCash),
      dbPclsCash: deflate(assets.dbPclsCash),
      isaAtRet: deflate(assets.isaAtRet),
      taxableAtRet: deflate(assets.taxableAtRet),
    },
    assetsTotal: deflate(assetsTotal),
    income: {
      dcIncome: deflate(income.dcIncome),
      dcAnnuityIncome: deflate(income.dcAnnuityIncome),
      dcDrawdownIncome: deflate(income.dcDrawdownIncome),
      dcPotForAnnuity: deflate(income.dcPotForAnnuity),
      dcPotForDrawdown: deflate(income.dcPotForDrawdown),
      dbIncomeAfter: deflate(income.dbIncomeAfter),
      dbActiveIncome: deflate(income.dbActiveIncome),
      dbDeferredIncome: deflate(income.dbDeferredIncome),
      propertyIncomeAtRet: deflate(income.propertyIncomeAtRet),
      dividendIncomeAtRet: deflate(income.dividendIncomeAtRet),
      anyOtherIncomeAtRet: deflate(income.anyOtherIncomeAtRet),
      otherIncomeAtRet: deflate(income.otherIncomeAtRet),
      statePensionAtRetNominal: deflate(income.statePensionAtRetNominal),
      statePensionForIncome: deflate(income.statePensionForIncome),
      taxableInterest: deflate(income.taxableInterest),
    },
    incomeGrossTotal: deflate(incomeGrossTotal),
    desiredSpendAtRet: deflate(desiredSpendAtRet),
    estTax: deflate(taxRes.tax),
    netIncome: deflate(netIncome),
    surplusDeficit: deflate(surplusDeficit),
  };

  return {
    yearsToRetirement: years,
    spaWarning,

    assets,
    assetsTotal,

    income,
    incomeGrossTotal,

    desiredSpendAtRet,
    estTax: taxRes.tax,
    netIncome,
    surplusDeficit,
    blendedSavingsRate,

    real,
  };
}