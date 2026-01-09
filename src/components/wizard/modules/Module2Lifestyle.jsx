// src/components/wizard/modules/Module2Lifestyle.jsx
import React from 'react';
import FormInput from '../../ui/FormInput';
import HelpText from '../../ui/HelpText';
import { PLSA_VALUES, getPLSAValue } from '../../../utils/lifestyleProfile';
import { formatCurrency } from '../../../utils/money';

export default function Module2Lifestyle({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);

  const handleMethodChange = (method) => {
    onDataChange({
      lifestyle: {
        ...data.lifestyle,
        method,
      },
    });
  };

  const handleHouseholdChange = (householdType) => {
    const currentTier = data.lifestyle.plsaTier || 'comfortable';
    const newBaselineAmount = getPLSAValue(currentTier, householdType);

    onDataChange({
      lifestyle: {
        ...data.lifestyle,
        householdType,
        baselineAmount: newBaselineAmount,
      },
    });
  };

  const handleTierChange = (tier) => {
    const householdType = data.lifestyle.householdType || 'solo';
    const newBaselineAmount = getPLSAValue(tier, householdType);

    onDataChange({
      lifestyle: {
        ...data.lifestyle,
        plsaTier: tier,
        baselineAmount: newBaselineAmount,
      },
    });
  };

  const handleCustomAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    onDataChange({
      lifestyle: {
        ...data.lifestyle,
        baselineAmount: value,
      },
    });
  };

  const isValid = data.lifestyle.baselineAmount > 0;
  const method = data.lifestyle.method || 'plsa';

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
          Define your desired annual spending in retirement. You can use PLSA (Pension and Lifetime
          Savings Association) benchmarks which provide realistic lifestyle standards, or enter your
          own custom amount.
        </HelpText>
      </div>

      {/* Method selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">
          How would you like to set your baseline?
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => handleMethodChange('plsa')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              method === 'plsa'
                ? 'border-sky-600 bg-sky-50'
                : 'border-slate-200 hover:border-sky-300'
            }`}
          >
            <div className="font-semibold text-slate-800 mb-1">PLSA Benchmarks</div>
            <div className="text-sm text-slate-600">
              Choose from established lifestyle standards (Minimum/Moderate/Comfortable)
            </div>
          </button>

          <button
            onClick={() => handleMethodChange('custom')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              method === 'custom'
                ? 'border-sky-600 bg-sky-50'
                : 'border-slate-200 hover:border-sky-300'
            }`}
          >
            <div className="font-semibold text-slate-800 mb-1">Custom Amount</div>
            <div className="text-sm text-slate-600">
              Enter your own annual spending target
            </div>
          </button>
        </div>
      </div>

      {/* PLSA Method */}
      {method === 'plsa' && (
        <div className="space-y-6">
          {/* Household Type */}
          <div>
            <h3 className="text-base font-semibold text-slate-700 mb-3">
              Household Type *
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleHouseholdChange('solo')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  data.lifestyle.householdType === 'solo'
                    ? 'border-sky-600 bg-sky-50'
                    : 'border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="text-3xl mb-2">👤</div>
                <div className="font-semibold text-slate-800">Single Person</div>
              </button>

              <button
                onClick={() => handleHouseholdChange('couple')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  data.lifestyle.householdType === 'couple'
                    ? 'border-sky-600 bg-sky-50'
                    : 'border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="text-3xl mb-2">👥</div>
                <div className="font-semibold text-slate-800">Couple</div>
              </button>
            </div>
          </div>

          {/* PLSA Tier Selection */}
          {data.lifestyle.householdType && (
            <div>
              <h3 className="text-base font-semibold text-slate-700 mb-3">
                Choose Your Lifestyle Level *
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {['minimum', 'moderate', 'comfortable'].map((tier) => {
                  const amount = getPLSAValue(tier, data.lifestyle.householdType);
                  const descriptions = {
                    minimum: 'Covers essential needs with some social participation',
                    moderate: 'Comfortable standard with regular leisure activities',
                    comfortable: 'Higher standard with more luxuries and flexibility',
                  };

                  return (
                    <button
                      key={tier}
                      onClick={() => handleTierChange(tier)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        data.lifestyle.plsaTier === tier
                          ? 'border-sky-600 bg-sky-50'
                          : 'border-slate-200 hover:border-sky-300'
                      }`}
                    >
                      <div className="font-bold text-lg text-slate-800 capitalize mb-1">
                        {tier}
                      </div>
                      <div className="text-2xl font-bold text-sky-600 mb-2">
                        {formatCurrency(amount)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {descriptions[tier]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Method */}
      {method === 'custom' && (
        <div>
          <FormInput
            label="Annual Spending Target (£) *"
            name="baselineAmount"
            type="number"
            value={data.lifestyle.baselineAmount || ''}
            onChange={handleCustomAmountChange}
            min="0"
            placeholder="e.g., 40000"
          />
          <p className="text-sm text-slate-600 mt-2">
            Enter your desired annual spending in today's money (before inflation)
          </p>
        </div>
      )}

      {/* Summary */}
      {isValid && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm font-semibold text-green-800 mb-1">
            ✓ Your Baseline Spending
          </div>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(data.lifestyle.baselineAmount)} per year
          </div>
          {method === 'plsa' && (
            <div className="text-xs text-green-600 mt-1">
              PLSA {data.lifestyle.plsaTier} level for {data.lifestyle.householdType === 'couple' ? 'a couple' : 'a single person'}
            </div>
          )}
        </div>
      )}

      {/* Validation message */}
      {!isValid && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Please select a lifestyle level or enter a custom amount
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
          Continue to DC Pensions →
        </button>
      </div>
    </div>
  );
}
