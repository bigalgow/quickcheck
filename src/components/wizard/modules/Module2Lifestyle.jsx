// src/components/wizard/modules/Module2Lifestyle.jsx
import React from 'react';
import FormInput from '../../ui/FormInput';
import HelpText from '../../ui/HelpText';
import { PLSA_VALUES, getPLSAValue } from '../../../utils/lifestyleProfile';
import { formatCurrency } from '../../../utils/money';

export default function Module2Lifestyle({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);
  const [showAboutPLSA, setShowAboutPLSA] = React.useState(false);

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
    const plsaAmount = getPLSAValue(tier, householdType);
    const housingCost = parseFloat(data.lifestyle.housingCostAnnual) || 0;
    const newBaselineAmount = plsaAmount + housingCost;

    onDataChange({
      lifestyle: {
        ...data.lifestyle,
        plsaTier: tier,
        baselineAmount: newBaselineAmount,
      },
    });
  };

  const handleHousingCostChange = (e) => {
    const housingCost = parseFloat(e.target.value) || 0;
    const tier = data.lifestyle.plsaTier || 'comfortable';
    const householdType = data.lifestyle.householdType || 'solo';
    const plsaAmount = getPLSAValue(tier, householdType);
    const newBaselineAmount = plsaAmount + housingCost;

    onDataChange({
      lifestyle: {
        ...data.lifestyle,
        housingCostAnnual: e.target.value,
        baselineAmount: newBaselineAmount,
      },
    });
  };

  const handleHousingTypeChange = (type) => {
    const tier = data.lifestyle.plsaTier || 'comfortable';
    const householdType = data.lifestyle.householdType || 'solo';
    const plsaAmount = getPLSAValue(tier, householdType);

    // If switching to "none", clear housing cost fields and reset baseline to PLSA only
    if (type === 'none') {
      onDataChange({
        lifestyle: {
          ...data.lifestyle,
          housingType: type,
          housingCostAnnual: '',
          ageMortgagePaidOff: '',
          baselineAmount: plsaAmount,
        },
      });
    } else {
      onDataChange({
        lifestyle: {
          ...data.lifestyle,
          housingType: type,
        },
      });
    }
  };

  const handleMortgagePaidOffAgeChange = (e) => {
    onDataChange({
      lifestyle: {
        ...data.lifestyle,
        ageMortgagePaidOff: e.target.value,
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

      {/* About PLSA Standards */}
      <div className="mb-6">
        <button
          onClick={() => setShowAboutPLSA(!showAboutPLSA)}
          className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-lg hover:from-sky-100 hover:to-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div className="text-left">
              <div className="font-semibold text-slate-800">About PLSA Retirement Living Standards</div>
              <div className="text-sm text-slate-600">Click to learn about these benchmarks and how to use them</div>
            </div>
          </div>
          <span className="text-2xl text-sky-600">{showAboutPLSA ? '▲' : '▼'}</span>
        </button>

        {showAboutPLSA && (
          <div className="mt-4 border-2 border-sky-200 rounded-lg overflow-hidden bg-white">
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">What are PLSA Retirement Living Standards?</h4>
                <p className="text-sm text-slate-700">
                  The Pension and Lifetime Savings Association (PLSA) publishes widely-recognised benchmarks
                  for retirement spending across three lifestyle levels. These are based on extensive research
                  into actual retirement costs and are updated annually.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-2">2025/26 Annual Amounts</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="font-bold text-slate-800 mb-2">Minimum</div>
                    <div className="text-sm text-slate-700 mb-2">
                      Single: <span className="font-semibold">{formatCurrency(13400)}</span><br />
                      Couple: <span className="font-semibold">{formatCurrency(21600)}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Covers all essentials with some luxuries like one-week UK holiday, eating out monthly.
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="font-bold text-slate-800 mb-2">Moderate</div>
                    <div className="text-sm text-slate-700 mb-2">
                      Single: <span className="font-semibold">{formatCurrency(31700)}</span><br />
                      Couple: <span className="font-semibold">{formatCurrency(43900)}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      More financial flexibility including two-week European holiday, eating out regularly,
                      some hobbies.
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="font-bold text-slate-800 mb-2">Comfortable</div>
                    <div className="text-sm text-slate-700 mb-2">
                      Single: <span className="font-semibold">{formatCurrency(43900)}</span><br />
                      Couple: <span className="font-semibold">{formatCurrency(60600)}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      More luxuries including three-week European holiday, eating out frequently, regular
                      beauty treatments, theatre trips.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Important: Housing Costs</span>
                </h4>
                <p className="text-sm text-amber-800 mb-2">
                  <strong>These PLSA figures assume you own your home outright with no rent or mortgage payments.</strong>
                  If you're still paying rent or a mortgage in retirement, you must add those costs separately below.
                </p>
                <p className="text-sm text-amber-800">
                  <strong>How to use:</strong> Step 1 - Select your PLSA lifestyle level. Step 2 - Add your annual
                  rent/mortgage costs in the Housing Costs section below. The calculator will combine both to give
                  your total annual spending requirement.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-2">London Supplement</h4>
                <p className="text-sm text-slate-700">
                  For those living in London, costs are typically higher. The PLSA minimum for a single person in
                  London is {formatCurrency(15800)} (vs {formatCurrency(13400)} nationally). If you live in London,
                  consider using the Custom Amount option and adjusting figures upward accordingly.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Age-Based Spending Adjustments</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Research shows that discretionary spending typically declines as people age. The projection
                  calculator automatically applies these evidence-based adjustments:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-slate-700">
                    <strong>Ages 65-74 ("Go-go years"):</strong> Full spending (100%) - active travel, hobbies,
                    social activities
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Ages 75-84 ("Slow-go years"):</strong> Reduced spending (85%) - less travel and
                    physical activities
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Ages 85+ ("No-go years"):</strong> Lower spending (75%) - more home-based lifestyle
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  These adjustments are automatically built into your 25-year projection. If you have specific plans
                  at later ages (e.g., regular care costs, specific gifts), you can always add them as Life Events
                  in Module 8.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> These are guides, not rules. Your actual needs may be higher or lower
                  depending on your lifestyle choices, location, and personal circumstances. You can always adjust
                  these figures or use a custom amount.
                </p>
              </div>
            </div>
          </div>
        )}
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

          {/* Housing Costs Section (only for PLSA method) */}
          {data.lifestyle.householdType && data.lifestyle.plsaTier && (
            <div className="mt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span>🏠</span>
                  <span>Housing Costs (Rent or Mortgage)</span>
                </h3>
                <p className="text-sm text-slate-700 mb-4">
                  The PLSA figure you selected assumes home ownership with no ongoing housing costs.
                  If you pay rent or have a mortgage, add those costs here.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-base font-medium text-slate-700 block mb-2">
                      Do you pay rent or have a mortgage?
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleHousingTypeChange('none')}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          (data.lifestyle.housingType || 'none') === 'none'
                            ? 'border-sky-600 bg-sky-50 font-semibold'
                            : 'border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        No (Own outright)
                      </button>
                      <button
                        onClick={() => handleHousingTypeChange('rent')}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          data.lifestyle.housingType === 'rent'
                            ? 'border-sky-600 bg-sky-50 font-semibold'
                            : 'border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        Rent
                      </button>
                      <button
                        onClick={() => handleHousingTypeChange('mortgage')}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          data.lifestyle.housingType === 'mortgage'
                            ? 'border-sky-600 bg-sky-50 font-semibold'
                            : 'border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        Mortgage
                      </button>
                    </div>
                  </div>

                  {(data.lifestyle.housingType === 'rent' || data.lifestyle.housingType === 'mortgage') && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormInput
                        label={`Annual ${data.lifestyle.housingType === 'rent' ? 'Rent' : 'Mortgage'} Payment (£)`}
                        name="housingCostAnnual"
                        type="number"
                        value={data.lifestyle.housingCostAnnual || ''}
                        onChange={handleHousingCostChange}
                        min="0"
                        placeholder="e.g., 12000"
                      />
                      {data.lifestyle.housingType === 'mortgage' && (
                        <div>
                          <FormInput
                            label="Age when mortgage paid off"
                            name="ageMortgagePaidOff"
                            type="number"
                            value={data.lifestyle.ageMortgagePaidOff || ''}
                            onChange={handleMortgagePaidOffAgeChange}
                            min="0"
                            placeholder="e.g., 70"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Your spending will automatically reduce by the mortgage amount at this age
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(data.lifestyle.housingType === 'rent' || data.lifestyle.housingType === 'mortgage') &&
                   data.lifestyle.housingCostAnnual && parseFloat(data.lifestyle.housingCostAnnual) > 0 && (
                    <div className="bg-white border border-amber-300 rounded-lg p-4">
                      <p className="text-sm text-slate-700">
                        <strong>Your total annual spending:</strong>
                      </p>
                      <div className="mt-2 text-sm text-slate-600 space-y-1">
                        <div>PLSA {data.lifestyle.plsaTier}: {formatCurrency(getPLSAValue(data.lifestyle.plsaTier, data.lifestyle.householdType))}</div>
                        <div>+ Housing costs: {formatCurrency(parseFloat(data.lifestyle.housingCostAnnual))}</div>
                        <div className="border-t border-slate-300 pt-1 mt-1 font-semibold text-slate-800">
                          = Total: {formatCurrency(data.lifestyle.baselineAmount)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
