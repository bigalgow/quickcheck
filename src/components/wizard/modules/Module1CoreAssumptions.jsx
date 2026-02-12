// src/components/wizard/modules/Module1CoreAssumptions.jsx
import React from 'react';
import FormInput from '../../ui/FormInput';
import HelpText from '../../ui/HelpText';

/**
 * Calculate minimum pension age based on UK rules:
 * - Before 6 April 2028: minimum age 55
 * - From 6 April 2028: minimum age 57
 *
 * @param {string} dateOfBirth - DOB in YYYY-MM-DD format
 * @returns {number} Minimum pension age (55 or 57)
 */
function getMinimumPensionAge(dateOfBirth) {
  if (!dateOfBirth) return 55;

  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return 55;

  // Calculate when they would turn 55
  const age55Date = new Date(dob);
  age55Date.setFullYear(age55Date.getFullYear() + 55);

  // The rule change date: 6 April 2028
  const ruleChangeDate = new Date('2028-04-06');

  // If they turn 55 before 6 April 2028, minimum is 55; otherwise 57
  return age55Date < ruleChangeDate ? 55 : 57;
}

export default function Module1CoreAssumptions({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onDataChange({
      inputs: {
        ...data.inputs,
        [name]: value,
      },
    });
  };

  const currentAge = data.inputs.dateOfBirth
    ? Math.floor((new Date() - new Date(data.inputs.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Calculate minimum retirement age: higher of current age or minimum pension age (55/57)
  const minimumPensionAge = getMinimumPensionAge(data.inputs.dateOfBirth);
  const minRetirementAge = currentAge ? Math.max(currentAge, minimumPensionAge) : minimumPensionAge;

  // Check if retirement age is below minimum
  const retirementAge = parseInt(data.inputs.retirementAge) || 0;
  const isRetirementAgeBelowMinimum = data.inputs.retirementAge && retirementAge < minRetirementAge;

  // Form is valid only if all required fields filled AND retirement age meets minimum
  const isValid = data.inputs.dateOfBirth && data.inputs.retirementAge && !isRetirementAgeBelowMinimum;

  return (
    <div className="p-6">
      {/* Help text */}
      <div className="mb-6">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          {showHelp ? '✕ Hide Help' : '? Show Help'}
        </button>
        <HelpText isVisible={showHelp}>
          These core assumptions form the foundation of your retirement plan. Your date of birth and
          retirement age determine your planning timeline. The inflation rate adjusts all future values
          to today's money. Your tax region affects income tax calculations.
        </HelpText>
      </div>

      {/* Form inputs */}
      <div className="space-y-6">
        {/* Date of Birth */}
        <FormInput
          label="Date of Birth *"
          name="dateOfBirth"
          type="date"
          value={data.inputs.dateOfBirth}
          onChange={handleChange}
        />

        {currentAge && (
          <p className="text-sm text-slate-600 -mt-2">
            Current age: {currentAge} years
          </p>
        )}

        {/* Retirement Age */}
        <FormInput
          label="Planned Retirement Age (or current age if already retired) *"
          name="retirementAge"
          type="number"
          value={data.inputs.retirementAge}
          onChange={handleChange}
          min={minRetirementAge}
          max="100"
          placeholder="e.g., 65"
        />

        {data.inputs.dateOfBirth && !isRetirementAgeBelowMinimum && (
          <p className="text-sm text-slate-500 -mt-2">
            Minimum retirement age: {minRetirementAge}
            {minimumPensionAge === 57 && ' (UK pension age rises to 57 from April 2028)'}
          </p>
        )}

        {isRetirementAgeBelowMinimum && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 -mt-2">
            <p className="text-sm text-red-800">
              ⚠️ <strong>Retirement age must be at least {minRetirementAge}.</strong>
              {minimumPensionAge === 57
                ? ' The UK minimum pension age rises to 57 from April 2028, which applies based on your date of birth.'
                : ' This is the UK minimum pension age (55), or your current age if higher.'}
            </p>
          </div>
        )}

        {!isRetirementAgeBelowMinimum && currentAge && data.inputs.retirementAge && parseInt(data.inputs.retirementAge) <= currentAge && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 -mt-2">
            <p className="text-sm text-blue-800">
              ℹ️ You've entered a retirement age equal to or below your current age ({currentAge}). The calculator will treat you as already retired and skip future contribution projections.
            </p>
          </div>
        )}

        {/* State Pension Annual Amount */}
        <FormInput
          label="Expected State Pension (annual, £)"
          name="statePensionAnnual"
          type="number"
          value={data.inputs.statePensionAnnual}
          onChange={handleChange}
          min="0"
          max="50000"
          placeholder="11973"
        />

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            💡 <strong>Tip:</strong> The full new State Pension for 2025/26 is £11,973 per year (£230.25/week).
            Enter your expected amount - this might be lower if you have gaps in your National Insurance record.
            This is today's value, which will be inflated to your retirement date automatically.
          </p>
        </div>

        {/* Inflation Rate */}
        <FormInput
          label="Assumed Inflation Rate (%)"
          name="inflation"
          type="number"
          value={data.inputs.inflation}
          onChange={handleChange}
          min="0"
          max="20"
          placeholder="2.5"
        />

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            💡 <strong>Tip:</strong> The default inflation rate of 2.5% is based on the Bank of England's
            long-term target. This rate is used to convert future values to today's money.
          </p>
        </div>

        {/* Tax Region */}
        <div>
          <label htmlFor="taxRegion" className="block text-base font-medium text-slate-700 mb-2">
            Tax Region *
          </label>
          <select
            id="taxRegion"
            name="taxRegion"
            value={data.inputs.taxRegion}
            onChange={handleChange}
            className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="englandWalesNI">England, Wales, or Northern Ireland</option>
            <option value="scotland">Scotland</option>
          </select>
          <p className="text-sm text-slate-600 mt-2">
            Scotland has different income tax bands and rates
          </p>
        </div>
      </div>

      {/* Validation message */}
      {!isValid && !isRetirementAgeBelowMinimum && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Please complete all required fields (*) before continuing
          </p>
        </div>
      )}

      {isRetirementAgeBelowMinimum && (
        <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded-lg">
          <p className="text-sm text-red-800">
            ⚠️ Please enter a retirement age of at least {minRetirementAge} to continue
          </p>
        </div>
      )}

      {/* Continue button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-3 rounded-md font-medium transition-colors ${
            isValid
              ? 'bg-sky-500 text-white hover:bg-sky-600'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          Continue to Lifestyle Baseline →
        </button>
      </div>
    </div>
  );
}
