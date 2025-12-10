// src/utils/retirementStatus.js

/**
 * Determines what features/fields should be shown based on retirement status
 * This centralizes all the business logic for handling "already retired" users
 */
export function getRetirementCapabilities(alreadyRetired) {
  return {
    // Data collection capabilities
    canContributeToPensions: !alreadyRetired,
    canTakePCLS: !alreadyRetired,
    canHaveActiveDB: !alreadyRetired,
    canAddSavingsContributions: !alreadyRetired,
    canChooseAnnuityPercentage: !alreadyRetired, // Already decided at retirement

    // Modelling capabilities
    canAdjustRetirementAge: !alreadyRetired,
    canModelDCGrowth: !alreadyRetired, // No accumulation phase
    canModelDCPotSize: !alreadyRetired, // Fixed at current value
    canModelDrawdownRate: true, // Always relevant
    canModelInflation: true, // Always relevant for projections
    canModelSpending: true, // Always relevant

    // Labels/Messages
    getMainTitle: () => alreadyRetired ? "Current Position" : "At-Retirement Summary",
    getYearsLabel: () => alreadyRetired ? "Currently retired" : "Years to retirement",
    getDCPotLabel: () => alreadyRetired ? "Current DC pot" : "DC pot now",
    getResultsTitle: () => alreadyRetired ? "Your Current Financial Position" : "Your Position at Retirement",
    getDCIncomeLabel: () => alreadyRetired ? "DC pension income" : "DC income (first year)",
    getDBIncomeLabel: () => alreadyRetired ? "DB pension income" : "DB income",
    getAssetsLabel: () => alreadyRetired ? "Current assets" : "Retirement assets (at retirement)",
    getPCLSMessage: () => alreadyRetired
      ? "Tax-free cash has already been taken at retirement"
      : "You can take up to 25% of your pension as tax-free cash",
    getContributionMessage: () => alreadyRetired
      ? "You're already retired, so no further contributions to pensions"
      : "Contributions will be made until retirement",
  };
}

/**
 * Helper to check if user is effectively retired (either explicitly set or years = 0)
 */
export function isEffectivelyRetired(alreadyRetired, yearsToRetirement) {
  return alreadyRetired || yearsToRetirement === 0 || yearsToRetirement < 0;
}
