// src/logic/atRetirement.js

// ---------- Date helpers ----------
function toDate(val) {
  // Accepts "YYYY-MM-DD" or Date
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val + "T00:00:00");
  return new Date(NaN);
}

function yearsBetween(a, b) {
  // precise years with decimals
  const ms = b.getTime() - a.getTime();
  return ms / (365.2425 * 24 * 3600 * 1000);
}

// ---------- Projection helpers ----------
export function projectWithContrib(start, addPerYear, years, rate) {
  // Lump sum + end-of-year compounding for the starting pot
  // Contributions are handled elsewhere (start-of-year timing)
  let v = start * Math.pow(1 + rate, years);
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
 */
function fvEmployerContrib(inputs, years) {
  if (!inputs.dcIsContributing || inputs.dcContributionType !== "employer" || years <= 0) return 0;
  const gSalary = inputs.inflationAssumption; // simplification: salary growth == inflation
  let salary = inputs.salaryNow; // start-of-year salary for year 1
  let totalFV = 0;
  const rate = inputs.growthAssumption;

  for (let y = 1; y <= years; y++) {
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
 */
function fvPersonalContrib(inputs, years) {
  if (!inputs.dcIsContributing || inputs.dcContributionType !== "personal" || years <= 0) return 0;
  const esc = inputs.inflationAssumption; // simplification: escalation == inflation
  const base = inputs.personalAnnualContrib;
  const rate = inputs.growthAssumption;

  let totalFV = 0;
  for (let y = 1; y <= years; y++) {
    const contrib = base * Math.pow(1 + esc, y - 1);
    const exponent = years - y + 1; // start-of-year cashflow
    totalFV += contrib * Math.pow(1 + rate, exponent);
  }
  return totalFV;
}

// ---------- DB schemes ----------
function computeActiveDbAtRet(s, yearsToRet, inflationDefault) {
  // Accrual on final salary; salary grows with inflation
  const acc = s.accrualDenominator; // e.g., 60
  const maxSrv = s.maxServiceYears ?? Infinity;
  const totalService = Math.min((s.serviceYearsToDate ?? 0) + yearsToRet, maxSrv);
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

function computeDbTotalAtRet(schemes, yearsToRet, inflationDefault) {
  if (!Array.isArray(schemes) || schemes.length === 0) return 0;
  let total = 0;
  for (const s of schemes) {
    if (s.kind === "active") total += computeActiveDbAtRet(s, yearsToRet, inflationDefault);
    else total += computeDeferredDbAtRet(s, yearsToRet, inflationDefault);
  }
  return total;
}

// ---------- Main ----------
export function atRetirement(inputs, taxFns) {
  // Compute years-to-retirement using DOB (decimal years)
  const today = new Date();
  const dob = toDate(inputs.dateOfBirth);
  const currentAgeYears = isNaN(dob) ? inputs.currentAge : yearsBetween(dob, today);
  const retirementAgeYears = inputs.retirementAge;
  const years = Math.max(0, retirementAgeYears - currentAgeYears);

  // ---- DC pot projection
  let dcProjected = inputs.dcPotNow * Math.pow(1 + inputs.growthAssumption, years);

  // DC contributions (employer / personal), both start-of-year timing
  dcProjected += fvEmployerContrib(inputs, Math.floor(years));
  dcProjected += fvPersonalContrib(inputs, Math.floor(years));

  // ---- DC PCLS request (capped later)
  const desiredDcPcls = inputs.takeDCTaxFree25 ? 0.25 * dcProjected : 0;

  // ---- DB annual (before any commutation), then desired DB PCLS (25% of capital)
  const dbBeforePcls = computeDbTotalAtRet(inputs.dbSchemes || [], years, inputs.inflationAssumption);
  const desiredDbPcls = inputs.takeDBTaxFree25 ? 0.25 * dbCapitalFromIncome(dbBeforePcls) : 0;

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
  const isaAtRet = projectWithContrib(
    inputs.isaBalance,
    inputs.isaAddPerYear,
    years,
    inputs.isaRate
  );
  const taxableAtRet = projectWithContrib(
    inputs.taxableSavingsBalance,
    inputs.taxableSavingsAddPerYear,
    years,
    inputs.taxableSavingsRate
  );
  const taxableInterest = Math.max(0, taxableAtRet * inputs.taxableSavingsRate);

  // ---- Tax (only include state pension if at or past SPA)
  const statePensionForIncome = spaWarning ? 0 : statePensionAtRetNominal;
  const pensionableIncome =
    dcIncome + dbAfter + otherIncomeAtRet + statePensionForIncome;
  const taxRes =
    inputs.region === "Scotland"
      ? taxFns.taxScot({ pensionableIncome, savingsInterest: taxableInterest })
      : taxFns.taxEWNI({ pensionableIncome, savingsInterest: taxableInterest });

  const grossIncome = pensionableIncome + taxableInterest;
  const netIncome = grossIncome - taxRes.tax;
  const surplusDeficit = netIncome - inputs.desiredSpendAnnual;

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
    propertyIncomeAtRet, // NEW: Property income category
    dividendIncomeAtRet, // NEW: Dividend income category
    anyOtherIncomeAtRet, // NEW: Any other income category
    otherIncomeAtRet, // Total of above three categories
    statePensionAtRetNominal,
    statePensionForIncome, // Actual amount used in calculations (0 if before SPA)
    taxableInterest,
  };
  // Gross income total for display - pension income only (taxable interest used for tax calc but not shown in total)
  const incomeGrossTotal =
    income.dcIncome +
    income.dbIncomeAfter +
    income.otherIncomeAtRet +
    income.statePensionForIncome;

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
      propertyIncomeAtRet: deflate(income.propertyIncomeAtRet),
      dividendIncomeAtRet: deflate(income.dividendIncomeAtRet),
      anyOtherIncomeAtRet: deflate(income.anyOtherIncomeAtRet),
      otherIncomeAtRet: deflate(income.otherIncomeAtRet),
      statePensionAtRetNominal: deflate(income.statePensionAtRetNominal),
      statePensionForIncome: deflate(income.statePensionForIncome),
      taxableInterest: deflate(income.taxableInterest),
    },
    incomeGrossTotal: deflate(incomeGrossTotal),
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

    estTax: taxRes.tax,
    netIncome,
    surplusDeficit,

    real,
  };
}