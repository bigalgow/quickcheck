// src/utils/statePensionAge.js

/**
 * Calculate UK State Pension Age based on date of birth
 *
 * Current rules (as of 2025):
 * - Born before 6 April 1960: SPA = 66
 * - Born 6 April 1960 to 5 April 1977: SPA gradually increases from 66 to 67
 * - Born on or after 6 April 1977: SPA = 67
 * - Future increases to 68 are planned but not yet legislated
 *
 * @param {string|Date} dateOfBirth - Date in YYYY-MM-DD format or Date object
 * @returns {number} State Pension Age in years
 */
export function calculateStatePensionAge(dateOfBirth) {
  const dob = typeof dateOfBirth === 'string'
    ? new Date(dateOfBirth + 'T00:00:00')
    : dateOfBirth;

  if (isNaN(dob.getTime())) {
    return 67; // Default fallback
  }

  // Key dates for SPA calculation
  const date_6_Apr_1960 = new Date('1960-04-06T00:00:00');
  const date_6_May_1960 = new Date('1960-05-06T00:00:00');
  const date_6_Apr_1977 = new Date('1977-04-06T00:00:00');

  // Born before 6 April 1960: SPA = 66
  if (dob < date_6_Apr_1960) {
    return 66;
  }

  // Born on or after 6 April 1977: SPA = 67
  if (dob >= date_6_Apr_1977) {
    return 67;
  }

  // Transition period: 6 April 1960 to 5 April 1977
  // SPA increases by 1 month for every 1 month of birth date
  // Starting from 66 years on 6 April 1960, reaching 67 years on 6 April 1977

  // Special case: 6 April 1960 to 5 May 1960 have SPA of 66
  if (dob >= date_6_Apr_1960 && dob < date_6_May_1960) {
    return 66;
  }

  // Calculate months between 6 May 1960 and DOB
  const monthsDiff =
    (dob.getFullYear() - 1960) * 12 +
    dob.getMonth() -
    4; // May is month 4 (0-indexed)

  // SPA = 66 years + monthsDiff months
  // Return as decimal (e.g., 66.5 for 66 years 6 months)
  const spaYears = 66 + (monthsDiff / 12);

  // Cap at 67
  return Math.min(67, Math.max(66, spaYears));
}

/**
 * Format State Pension Age for display
 * @param {number} spaYears - SPA in decimal years
 * @returns {string} Formatted string like "66" or "66 years 6 months"
 */
export function formatStatePensionAge(spaYears) {
  const years = Math.floor(spaYears);
  const months = Math.round((spaYears - years) * 12);

  if (months === 0) {
    return `${years}`;
  }

  return `${years} years ${months} months`;
}
