// src/utils/lifestyleProfile.js
// Utility functions for lifestyle profile operations
import { v4 as uuidv4 } from 'uuid';

/**
 * PLSA (Pension and Lifetime Savings Association) benchmark values for 2025/26
 * Source: https://www.plsa.co.uk/retirement-living-standards
 * Note: These figures assume home ownership (no rent/mortgage costs)
 */
export const PLSA_VALUES = {
  minimum: { solo: 13400, couple: 21600 },
  moderate: { solo: 31700, couple: 43900 },
  comfortable: { solo: 43900, couple: 60600 }
};

/**
 * Get PLSA value based on tier and household type
 */
export function getPLSAValue(tier, householdType) {
  const householdKey = householdType === 'couple' ? 'couple' : 'solo';
  return PLSA_VALUES[tier]?.[householdKey] || 0;
}

/**
 * Generate a profile name based on tier and exceptional items
 */
export function generateProfileName(tier, exceptionalItems) {
  const tierNames = {
    minimum: 'Essential',
    moderate: 'Moderate',
    comfortable: 'Comfortable',
    custom: 'Custom'
  };

  const tierLabel = tierNames[tier] || 'Custom';

  // Find dominant category
  const categoryCounts = {};
  exceptionalItems.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });

  const dominantCategory = Object.keys(categoryCounts).reduce((a, b) =>
    categoryCounts[a] > categoryCounts[b] ? a : b, null
  );

  const categoryNames = {
    travel: 'Explorer',
    purchase: 'Planner',
    family: 'Supporter',
    upgrade: 'Upgrader'
  };

  if (dominantCategory && exceptionalItems.length > 0) {
    return `The ${tierLabel} ${categoryNames[dominantCategory]}`;
  }

  return `The ${tierLabel} Lifestyle`;
}

/**
 * Calculate total annual income from baseline and recurring items
 */
export function calculateTotalAnnual(baselineAmount, exceptionalItems) {
  const recurring = exceptionalItems
    .filter(item => item.timing === 'recurring')
    .reduce((sum, item) => sum + item.cost, 0);

  return baselineAmount + recurring;
}

/**
 * Calculate total one-off costs
 */
export function calculateTotalOneOff(exceptionalItems) {
  return exceptionalItems
    .filter(item => item.timing === 'oneOff')
    .reduce((sum, item) => sum + item.cost, 0);
}

/**
 * Get age-appropriate messaging based on user age
 */
export function getAgeAppropriateMessage(userAge, context) {
  if (userAge < 45) {
    const messages = {
      preamble: "Envision your future - what would you LOVE to do?",
      emphasis: "Don't worry if you're not sure yet - you can always update this later",
      tone: "aspirational"
    };
    return messages[context] || messages.preamble;
  } else if (userAge < 55) {
    const messages = {
      preamble: "What are you planning beyond day-to-day living?",
      emphasis: "Think about the next 10-20 years of retirement",
      tone: "planning"
    };
    return messages[context] || messages.preamble;
  } else {
    const messages = {
      preamble: "What specific plans and commitments do you have?",
      emphasis: "Be as precise as possible for accurate planning",
      tone: "commitment"
    };
    return messages[context] || messages.preamble;
  }
}

/**
 * Transform lifestyle profile exceptional items to projection events
 * @param {Array} exceptionalItems - Items from lifestyle profile
 * @param {number} retirementAge - User's retirement age
 * @returns {Array} Events in projection format
 */
export function transformToProjectionEvents(exceptionalItems, retirementAge) {
  return exceptionalItems.map(item => ({
    id: uuidv4(), // Generate unique ID for each event
    name: item.name,
    age: retirementAge + (item.year || 0),
    amount: item.cost,
    type: 'expense', // All lifestyle items are expenses
    isRecurring: item.timing === 'recurring', // Match LifeEvents field name
    // For recurring events with null/undefined duration, default to 10 years (user can adjust in projection planner)
    // For one-off events, use 1 year
    // For recurring events with explicit duration, use that
    recurringYears: item.timing === 'oneOff' ? 1 : (item.duration || 10), // Match LifeEvents field name
    source: 'lifestyleProfile' // Mark as coming from profile
  }));
}

/**
 * Estimate baseline from income range (70-80% rule of thumb)
 */
export function estimateBaselineFromIncome(incomeRange) {
  const ranges = {
    '25k-40k': { min: 25000, max: 40000 },
    '40k-60k': { min: 40000, max: 60000 },
    '60k-80k': { min: 60000, max: 80000 },
    '80k-100k': { min: 80000, max: 100000 },
    '100k-150k': { min: 100000, max: 150000 },
    '150k+': { min: 150000, max: 200000 }
  };

  const range = ranges[incomeRange];
  if (!range) return { min: 0, max: 0, midpoint: 0 };

  const min = Math.round(range.min * 0.70);
  const max = Math.round(range.max * 0.80);
  const midpoint = Math.round((min + max) / 2);

  return { min, max, midpoint };
}

/**
 * Validate lifestyle profile data
 */
export function validateProfile(profile) {
  const errors = [];

  if (!profile.householdType) {
    errors.push('Household type is required');
  }

  if (!profile.baselineTier) {
    errors.push('Baseline tier is required');
  }

  if (!profile.baselineAmount || profile.baselineAmount <= 0) {
    errors.push('Baseline amount must be greater than zero');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
