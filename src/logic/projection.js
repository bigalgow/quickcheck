// src/logic/projection.js
// 25-year post-retirement projection calculator

import { estimateIncomeTax, TAX_2025_EWNI, TAX_2025_SCOTLAND } from '../utils/tax';

/**
 * Calculate life events total for a specific age
 * @param {number} age - Current age
 * @param {Array} lifeEvents - Array of life event objects
 * @returns {number} Net life events (income positive, expenses negative)
 */
function calculateLifeEventsForAge(age, lifeEvents) {
  if (!lifeEvents || lifeEvents.length === 0) return 0;

  let total = 0;

  for (const event of lifeEvents) {
    if (!event.isRecurring) {
      // Single event at specific age
      if (age === event.age) {
        total += event.type === 'income' ? event.amount : -event.amount;
      }
    } else {
      // Recurring event: starts at event.age, runs for event.recurringYears
      const startAge = event.age;
      const endAge = event.age + (event.recurringYears || 0) - 1;
      if (age >= startAge && age <= endAge) {
        total += event.type === 'income' ? event.amount : -event.amount;
      }
    }
  }

  return total;
}

/**
 * Calculate 25-year post-retirement projection
 *
 * @param {Object} openingValues - Values from "At Retirement" calculation
 * @param {Object} projectionInputs - User inputs for projection
 * @returns {Array} Array of 25 year objects with all calculations
 */
export function calculateProjection(openingValues, projectionInputs) {
  const {
    retirementAge,
    dcPotAfterPCLS,       // DC pot after PCLS taken (or 0 if full annuity)
    isaSavings,
    taxableSavings,       // Includes PCLS lump sum
    dbPension,            // Annual DB pension (nominal at retirement)
    annuityIncome,        // Annual annuity income (if any)
    statePension,         // Annual state pension (nominal at SPA)
    statePensionAge,      // Age when state pension starts
    otherIncome,          // Other annual income
    annualSpend,          // Target annual spending
    inflation,            // % inflation assumption
    dcGrowth,             // % DC growth assumption
    isaGrowth,            // % ISA growth assumption
    savingsGrowth,        // % Taxable savings growth assumption
    taxRegion,            // 'england' or 'scotland'
    yearsToRetirement = 0, // Years from today to retirement (for real-terms calculation)
  } = openingValues;

  const {
    isaRecurringAmount = 0,
    isaRecurringYears = 0,
    dcDrawdownPercent,      // % for initial DC drawdown
    lifeEvents = [],
  } = projectionInputs;

  // Select tax configuration
  const taxCfg = taxRegion === 'scotland' ? TAX_2025_SCOTLAND : TAX_2025_EWNI;

  const years = [];

  // Track cash drawdown amounts (4% rule style)
  let dcDrawdownCash = null;
  let taxableDrawdownCash = null;

  for (let year = 0; year < 25; year++) {
    const age = retirementAge + year;
    const yearData = { age, year: year + 1 };

    // Inflation factor for this year
    const inflationFactor = Math.pow(1 + inflation / 100, year);

    // === OPENING ASSETS ===
    yearData.openingDC = year === 0
      ? dcPotAfterPCLS
      : years[year - 1].closingDC;
    yearData.openingISA = year === 0
      ? isaSavings
      : years[year - 1].closingISA;
    yearData.openingTaxable = year === 0
      ? taxableSavings
      : years[year - 1].closingTaxable;

    // === DRAWDOWNS (4% Rule Style) ===
    if (year === 0) {
      // Year 1: Calculate from percentage
      dcDrawdownCash = yearData.openingDC * (dcDrawdownPercent / 100);
      taxableDrawdownCash = 0; // Taxable is a buffer, not actively drawn
    } else {
      // Years 2+: Inflate the cash amount
      dcDrawdownCash = dcDrawdownCash * (1 + inflation / 100);
      taxableDrawdownCash = taxableDrawdownCash * (1 + inflation / 100);
    }

    yearData.dcDrawdown = dcDrawdownCash;
    yearData.taxableDrawdown = 0; // Taxable is a buffer, doesn't have explicit drawdown

    // ISA drawdown: Only if taxable savings exhausted (negative)
    yearData.isaDrawdown = 0; // Start with 0, will calculate deficit later if needed

    // === ISA INVESTMENTS ===
    // Only invest if within years limit AND taxable savings sufficient
    if (year < isaRecurringYears && yearData.openingTaxable >= isaRecurringAmount) {
      yearData.isaInvestments = isaRecurringAmount;
    } else {
      yearData.isaInvestments = 0;
    }

    // === INCOME STREAMS ===
    yearData.dbIncome = dbPension * inflationFactor;
    yearData.annuityIncome = annuityIncome; // Annuities don't inflate
    yearData.statePension = age >= statePensionAge
      ? statePension * inflationFactor
      : 0;
    yearData.otherIncome = otherIncome * inflationFactor;

    // === GROWTH ===
    // Apply growth to balance AFTER drawdown (simplified: assume drawdown at start of year)
    const dcBalanceAfterDrawdown = yearData.openingDC - yearData.dcDrawdown;
    yearData.dcGrowth = dcBalanceAfterDrawdown > 0
      ? dcBalanceAfterDrawdown * (dcGrowth / 100)
      : 0;

    const isaBalanceAfterDrawdown = yearData.openingISA - yearData.isaDrawdown;
    yearData.isaGrowth = isaBalanceAfterDrawdown > 0
      ? isaBalanceAfterDrawdown * (isaGrowth / 100)
      : 0;

    // Taxable: apply growth before net flow adjustment (simplified timing)
    yearData.taxableGrowth = yearData.openingTaxable > 0
      ? yearData.openingTaxable * (savingsGrowth / 100)
      : 0;

    // === LIFE EVENTS ===
    yearData.lifeEvents = calculateLifeEventsForAge(age, lifeEvents);

    // === ANNUAL SPEND ===
    yearData.annualSpend = annualSpend * inflationFactor;

    // === TAXABLE INCOME ===
    // DC drawdown + DB + State + Other + Annuity + Taxable savings interest
    const pensionableIncome =
      yearData.dcDrawdown +
      yearData.dbIncome +
      yearData.annuityIncome +
      yearData.statePension +
      yearData.otherIncome;

    const savingsInterest = yearData.taxableGrowth;

    // === TAX CALCULATION ===
    const taxResult = estimateIncomeTax({
      pensionableIncome,
      savingsInterest,
      cfg: taxCfg,
    });

    yearData.tax = taxResult.tax;
    yearData.totalTaxableIncome = pensionableIncome + savingsInterest;

    // === NET FLOW ===
    // Net flow = what flows into/out of taxable savings
    //
    // INTO taxable savings:
    //   - DC drawdown, DB income, annuity, state pension, other income, taxable interest (= totalTaxableIncome)
    //   - Life event income (if positive)
    //
    // OUT OF taxable savings:
    //   - Tax payments
    //   - Annual spending
    //   - Life event expenses (if negative)
    //   - ISA investments (transfers to ISA)
    //
    // NOTE: ISA growth stays in ISA, not included in net flow
    yearData.netFlow =
      yearData.totalTaxableIncome -
      yearData.tax -
      yearData.annualSpend +
      yearData.lifeEvents -
      yearData.isaInvestments;

    // === CLOSING ASSETS ===
    yearData.closingDC = yearData.openingDC - yearData.dcDrawdown + yearData.dcGrowth;
    yearData.closingISA = yearData.openingISA - yearData.isaDrawdown + yearData.isaInvestments + yearData.isaGrowth;

    // Taxable savings absorbs net flow (can go negative)
    yearData.closingTaxable = yearData.openingTaxable + yearData.taxableGrowth + yearData.netFlow;

    // === ISA DRAWDOWN (if taxable negative) ===
    // If taxable closes negative, draw from ISA to cover deficit
    if (yearData.closingTaxable < 0) {
      const deficit = Math.abs(yearData.closingTaxable);
      yearData.isaDrawdown = Math.min(deficit, yearData.closingISA); // Can't draw more than ISA has
      yearData.closingISA -= yearData.isaDrawdown;
      yearData.closingTaxable += yearData.isaDrawdown; // May still be negative if ISA insufficient
    }

    // === TOTAL ASSETS (Nominal and Real) ===
    yearData.totalNominal = yearData.closingDC + yearData.closingISA + yearData.closingTaxable;
    // Deflate to TODAY'S money (not retirement date)
    const yearsFromToday = yearsToRetirement + year;
    const totalInflationFromToday = Math.pow(1 + inflation / 100, yearsFromToday);
    yearData.totalReal = yearData.totalNominal / totalInflationFromToday;

    // === WARNINGS ===
    yearData.warnings = [];
    if (yearData.closingDC < 0) yearData.warnings.push('DC pot depleted');
    if (yearData.closingISA < 0) yearData.warnings.push('ISA depleted');
    if (yearData.closingTaxable < 0) yearData.warnings.push('Taxable savings depleted');

    years.push(yearData);
  }

  return years;
}

/**
 * Helper to extract warnings from projection results
 */
export function extractWarnings(projectionResults) {
  const warnings = [];

  for (const yearData of projectionResults) {
    if (yearData.warnings.length > 0) {
      warnings.push({
        age: yearData.age,
        year: yearData.year,
        messages: yearData.warnings,
      });
    }
  }

  return warnings;
}
