// src/utils/dataSchema.js
// Unified data schema for 10-module wizard

/**
 * Default empty schema for a new retirement plan
 */
export const defaultRetirePlanData = {
  // Module 1: Core Assumptions
  inputs: {
    dateOfBirth: "",
    retirementAge: "",
    statePensionAnnual: "11973", // Expected annual state pension (today's value)
    inflation: "2.5",
    taxRegion: "englandWalesNI", // or "scotland"
  },

  // Module 2: Lifestyle Baseline
  lifestyle: {
    method: "plsa", // or "custom"
    householdType: "solo", // or "couple"
    plsaTier: "comfortable", // "minimum", "moderate", "comfortable"
    baselineAmount: 0, // Annual spend target (from PLSA or custom)
    housingType: "none", // "none", "rent", or "mortgage"
    housingCostAnnual: "", // Annual housing cost (rent or mortgage payment)
    ageMortgagePaidOff: "", // Age when mortgage is paid off (for mortgage only)
  },

  // Module 3: DC Pensions (matches atRetirement.js structure)
  dc: {
    potNow: "",
    takeTaxFree25: false,
    growthAssumption: "0.04",
    drawdownRate: "0.04",
    annuityRate: "0.06",
    annuityPct: "0", // % of post-PCLS pot to annuitize (0-100)
    isContributing: false,
    contributionType: "employer", // "employer" or "personal"
    salaryNow: "",
    employeePct: "0.05",
    employerPct: "0.05",
    personalAnnualContrib: "",
  },

  // Module 4: DB Pensions (matches atRetirement.js structure)
  db: {
    takeTaxFree25: false,
    schemes: [
      // Active scheme example:
      // { id, kind: "active", accrualDenominator, serviceYearsToDate, maxServiceYears, pensionableSalaryNow }
      // Deferred scheme example:
      // { id, kind: "deferred", preservedPensionNow, revaluationAssumption }
    ],
  },

  // Module 5: Savings & Investments
  savings: {
    isa: {
      currentValue: "",
      addPerYear: "",
      growthRate: "3",
    },
    taxableSavings: {
      currentValue: "",
      addPerYear: "",
      growthRate: "3",
    },
  },

  // Module 6: Other Income
  otherIncome: [],
  // Each item: { id, type: "property"|"dividend"|"other", description, annualAmount }

  // Module 7: At Retirement Results (calculated)
  atRetirementResults: null,
  // Output from atRetirement.js calculation

  // Module 8: Life Events (ONE SOURCE OF TRUTH)
  lifeEvents: [],
  // Each item: { id, name, age, amount, type: "expense"|"income", isRecurring, recurringYears, category, source }

  // Module 9: Drawdown Sequencing
  postRetirement: {
    isaInvestmentAnnual: "",
    dcDrawdownRate: "", // Override for post-retirement DC drawdown rate (defaults to dc.drawdownRate)
  },

  // Module 10: 25-Year Projection (calculated)
  projectionResults: null,
  // Output from projection.js calculation

  // Metadata
  metadata: {
    completedModules: [], // Array of module IDs user has visited
    lastModified: null,
    version: "2.0", // Schema version
  },
};

/**
 * Module definitions with validation requirements
 */
export const MODULES = {
  1: {
    id: 1,
    title: "Core Assumptions",
    description: "Set your basic retirement planning assumptions",
    requiredFields: ["inputs.dateOfBirth", "inputs.retirementAge"],
  },
  2: {
    id: 2,
    title: "Lifestyle Baseline",
    description: "Define your desired retirement lifestyle spending",
    requiredFields: ["lifestyle.baselineAmount"],
  },
  3: {
    id: 3,
    title: "DC Pensions",
    description: "Add your Defined Contribution pension pots",
    requiredFields: [], // Optional - can have zero DC pensions
  },
  4: {
    id: 4,
    title: "DB Pensions",
    description: "Add your Defined Benefit pension schemes",
    requiredFields: [], // Optional - can have zero DB pensions
  },
  5: {
    id: 5,
    title: "Savings & Investments",
    description: "Add your ISAs and other savings",
    requiredFields: [], // Optional - can have zero savings
  },
  6: {
    id: 6,
    title: "Other Income",
    description: "Add property rental, dividends, or other income",
    requiredFields: [], // Optional
  },
  7: {
    id: 7,
    title: "At Retirement Results",
    description: "View your projected position at retirement",
    requiredFields: [], // Calculated module
  },
  8: {
    id: 8,
    title: "Life Events",
    description: "Add significant purchases, trips, and income events",
    requiredFields: [], // Optional
  },
  9: {
    id: 9,
    title: "Drawdown Sequencing",
    description: "Plan your ISA investments and drawdown strategy",
    requiredFields: [], // Optional
  },
  10: {
    id: 10,
    title: "25-Year Projection - Illustration",
    description: "View your detailed retirement projection",
    requiredFields: [], // Calculated module
  },
};

/**
 * Get nested value from object using dot notation path
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path (e.g., "inputs.dateOfBirth")
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check if a field has a valid value (not empty string, null, or undefined)
 * @param {*} value - Value to check
 * @returns {boolean} True if value is valid
 */
function isValidValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * Validate if a module has all required fields filled
 * @param {number} moduleId - Module ID (1-10)
 * @param {Object} data - Full retirePlanData object
 * @returns {boolean} True if module is valid
 */
export function validateModule(moduleId, data) {
  const module = MODULES[moduleId];
  if (!module) return false;

  // Check if all required fields are filled
  for (const fieldPath of module.requiredFields) {
    const value = getNestedValue(data, fieldPath);
    if (!isValidValue(value)) {
      return false;
    }
  }

  return true;
}

/**
 * Get completion status for a module
 * @param {number} moduleId - Module ID (1-10)
 * @param {Object} data - Full retirePlanData object
 * @returns {Object} { completed: boolean, hasData: boolean }
 */
export function getModuleCompletionStatus(moduleId, data) {
  const module = MODULES[moduleId];
  if (!module) return { completed: false, hasData: false };

  // Check if module is in completed list
  const completed = data.metadata?.completedModules?.includes(moduleId) || false;

  // Check if module has any data (beyond defaults)
  let hasData = false;

  switch (moduleId) {
    case 1: // Core Assumptions
      hasData = isValidValue(data.inputs?.dateOfBirth) || isValidValue(data.inputs?.retirementAge);
      break;
    case 2: // Lifestyle
      hasData = data.lifestyle?.baselineAmount > 0 ||
                isValidValue(data.lifestyle?.housingType) ||
                isValidValue(data.lifestyle?.housingCostAnnual);
      break;
    case 3: // DC Pensions
      hasData = data.dcPensions?.length > 0;
      break;
    case 4: // DB Pensions
      hasData = data.dbPensions?.length > 0;
      break;
    case 5: // Savings
      hasData = isValidValue(data.savings?.cashISA?.currentValue) ||
                isValidValue(data.savings?.stocksSharesISA?.currentValue) ||
                isValidValue(data.savings?.taxableSavings?.currentValue);
      break;
    case 6: // Other Income
      hasData = data.otherIncome?.length > 0;
      break;
    case 7: // Results
      hasData = data.atRetirementResults !== null;
      break;
    case 8: // Life Events
      hasData = data.lifeEvents?.length > 0;
      break;
    case 9: // Drawdown Sequencing
      hasData = isValidValue(data.postRetirement?.isaInvestmentAnnual) ||
                isValidValue(data.postRetirement?.dcDrawdownRate);
      break;
    case 10: // Projection
      hasData = data.projectionResults !== null;
      break;
    default:
      hasData = false;
  }

  return { completed, hasData };
}

/**
 * Mark a module as completed
 * @param {Object} data - Full retirePlanData object
 * @param {number} moduleId - Module ID to mark as completed
 * @returns {Object} Updated retirePlanData
 */
export function markModuleCompleted(data, moduleId) {
  const completedModules = data.metadata?.completedModules || [];

  if (!completedModules.includes(moduleId)) {
    return {
      ...data,
      metadata: {
        ...data.metadata,
        completedModules: [...completedModules, moduleId],
        lastModified: new Date().toISOString(),
      },
    };
  }

  return data;
}

/**
 * Get list of all module IDs
 * @returns {number[]} Array of module IDs
 */
export function getAllModuleIds() {
  return Object.keys(MODULES).map(id => parseInt(id));
}

/**
 * Get module info by ID
 * @param {number} moduleId - Module ID
 * @returns {Object|null} Module info or null
 */
export function getModuleInfo(moduleId) {
  return MODULES[moduleId] || null;
}
