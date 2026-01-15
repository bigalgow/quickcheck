// src/components/wizard/modules/Module4DBPensions.jsx
import React from 'react';
import FormInput from '../../ui/FormInput';
import HelpText from '../../ui/HelpText';

export default function Module4DBPensions({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);

  // Calculate if already retired
  const currentAge = data.inputs?.dateOfBirth
    ? Math.floor((new Date() - new Date(data.inputs.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const retirementAge = parseInt(data.inputs?.retirementAge);
  const alreadyRetired = currentAge && retirementAge && retirementAge <= currentAge;

  const handleDBChange = (field, value) => {
    onDataChange({
      db: {
        ...data.db,
        [field]: value,
      },
    });
  };

  const updateScheme = (id, updates) => {
    const schemes = data.db?.schemes || [];
    const updated = schemes.map(s => s.id === id ? { ...s, ...updates } : s);
    handleDBChange('schemes', updated);
  };

  const addActiveScheme = () => {
    const schemes = data.db?.schemes || [];
    const newScheme = {
      id: `active-${Date.now()}`,
      kind: 'active',
      accrualDenominator: '60',
      serviceYearsToDate: '',
      maxServiceYears: '',
      pensionableSalaryNow: '',
    };
    handleDBChange('schemes', [...schemes, newScheme]);
  };

  const addDeferredScheme = () => {
    const schemes = data.db?.schemes || [];
    const newScheme = {
      id: `deferred-${Date.now()}`,
      kind: 'deferred',
      preservedPensionNow: '',
      revaluationAssumption: '0.025',
    };
    handleDBChange('schemes', [...schemes, newScheme]);
  };

  const removeScheme = (id) => {
    const schemes = data.db?.schemes || [];
    handleDBChange('schemes', schemes.filter(s => s.id !== id));
  };

  const schemes = data.db?.schemes || [];
  const activeSchemes = schemes.filter(s => s.kind === 'active');
  const deferredSchemes = schemes.filter(s => s.kind === 'deferred');

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
          DB (Defined Benefit) pensions promise a set income based on your salary and years of service.
          Active schemes are those you're currently contributing to (accruing benefits). Deferred schemes
          are from previous employers - you'll receive the preserved pension at retirement. You can
          commute up to 25% for tax-free cash (20× model), but total PCLS across all pensions is capped
          at £268,275.
        </HelpText>
      </div>

      <div className="space-y-8">
        {/* Add Active Scheme Button - only show if none exist AND not already retired */}
        {!alreadyRetired && activeSchemes.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Active DB Pension</h3>
            <p className="text-sm text-slate-600 mb-4">
              Do you currently have an active Defined Benefit pension scheme with an employer? These
              are typically final salary or career average schemes where you're still accruing benefits.
            </p>
            <button
              onClick={addActiveScheme}
              className="px-4 py-2 rounded-md border border-sky-600 bg-sky-500 text-white hover:bg-sky-600 transition-colors"
            >
              + Add Active DB Scheme
            </button>

            {/* CARE scheme tip */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Have a Career Average (CARE) scheme?</strong> Check your Annual Benefit Statement
                for the "projected pension at retirement" figure. Enter this as a <strong>Deferred scheme</strong> below
                instead of Active — the projection already includes your future accrual.
              </p>
            </div>
          </div>
        )}

        {/* Active Schemes - Hidden if already retired */}
        {!alreadyRetired && activeSchemes.map((scheme, index) => (
          <div key={scheme.id} className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Active Final-Salary Scheme {activeSchemes.length > 1 ? `${index + 1}` : ''}
              </h3>
              <button
                onClick={() => removeScheme(scheme.id)}
                className="px-3 py-1 text-sm rounded-md border border-red-500 bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Accrual denominator (e.g., 60)"
                  name={`${scheme.id}-accrualDenominator`}
                  type="number"
                  value={scheme.accrualDenominator || ''}
                  onChange={(e) => updateScheme(scheme.id, { accrualDenominator: e.target.value })}
                  min="0"
                  placeholder="60"
                />
                <FormInput
                  label="Service years to date"
                  name={`${scheme.id}-serviceYearsToDate`}
                  type="number"
                  value={scheme.serviceYearsToDate || ''}
                  onChange={(e) => updateScheme(scheme.id, { serviceYearsToDate: e.target.value })}
                  min="0"
                  placeholder="10"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Max service years (optional)"
                  name={`${scheme.id}-maxServiceYears`}
                  type="number"
                  value={scheme.maxServiceYears || ''}
                  onChange={(e) => updateScheme(scheme.id, { maxServiceYears: e.target.value })}
                  min="0"
                  placeholder="40"
                />
                <FormInput
                  label="Pensionable salary now (£)"
                  name={`${scheme.id}-pensionableSalaryNow`}
                  type="number"
                  value={scheme.pensionableSalaryNow || ''}
                  onChange={(e) => updateScheme(scheme.id, { pensionableSalaryNow: e.target.value })}
                  min="0"
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-600">
              <p>
                <strong>Example:</strong> If you have 10 years service in a 1/60th scheme with £50,000
                pensionable salary, your accrued annual pension would be: £50,000 × 10 / 60 = £8,333/year
              </p>
            </div>

            {/* Career Break Section for Active DB */}
            <div className="mt-4 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => updateScheme(scheme.id, { hasCareerBreak: !scheme.hasCareerBreak })}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                <span className={`transition-transform ${scheme.hasCareerBreak ? 'rotate-90' : ''}`}>▶</span>
                Planning a career break?
              </button>

              {scheme.hasCareerBreak && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 mb-4">
                    A career break reduces the service years you'll accrue. Your final salary at retirement
                    is unaffected (it's based on your salary when you retire, not during the break).
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Break starts at age
                      </label>
                      <input
                        type="number"
                        value={scheme.breakStartAge || ''}
                        onChange={(e) => updateScheme(scheme.id, { breakStartAge: e.target.value })}
                        min={currentAge || 18}
                        max={retirementAge || 70}
                        placeholder={currentAge ? String(currentAge + 1) : '35'}
                        className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Return to work at age
                      </label>
                      <input
                        type="number"
                        value={scheme.breakEndAge || ''}
                        onChange={(e) => updateScheme(scheme.id, { breakEndAge: e.target.value })}
                        min={scheme.breakStartAge || currentAge || 18}
                        max={retirementAge || 70}
                        placeholder={scheme.breakStartAge ? String(parseInt(scheme.breakStartAge) + 2) : '37'}
                        className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                      />
                    </div>
                  </div>
                  {scheme.breakStartAge && scheme.breakEndAge && (
                    <p className="text-sm text-amber-700 mt-3">
                      {parseInt(scheme.breakEndAge) - parseInt(scheme.breakStartAge)} year break:
                      no service accrual from age {scheme.breakStartAge} to {scheme.breakEndAge}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Deferred Schemes */}
        {deferredSchemes.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-slate-600">
              If you have left a previous employer Defined Benefit scheme, you will be entitled to a
              Deferred DB pension. Enter the "projected income" figure from your Annual Benefit Statement.
            </p>
          </div>
        )}

        {deferredSchemes.map((scheme, index) => (
          <div key={scheme.id} className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Deferred Pension {index + 1}
              </h3>
              <button
                onClick={() => removeScheme(scheme.id)}
                className="px-3 py-1 text-sm rounded-md border border-red-500 bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>

            <FormInput
              label="Projected pension income (annual amount payable at retirement)"
              name={`${scheme.id}-preservedPensionNow`}
              type="number"
              value={scheme.preservedPensionNow || ''}
              onChange={(e) => updateScheme(scheme.id, { preservedPensionNow: e.target.value })}
              min="0"
              placeholder="5000"
            />

            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Help:</strong> You should receive an Annual Benefit Statement (ABS) showing
                the 'projected income'. This is the annual pension amount you'll receive, calculated based
                on scheme rules when you left. The figure assumes inflation protection up to normal pension
                age (typically 60). Contact your former employer's HR or scheme administrator if you don't
                have this figure.
              </p>
            </div>
          </div>
        ))}

        {/* Add Deferred Scheme Button */}
        <div>
          <button
            onClick={addDeferredScheme}
            className="px-4 py-2 rounded-md border border-sky-600 bg-sky-500 text-white hover:bg-sky-600 transition-colors"
          >
            + Add Deferred DB Scheme
          </button>
        </div>

        {/* Tax-Free Cash Option - Hidden if already retired */}
        {!alreadyRetired && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <label className="flex items-center gap-3 text-base font-medium text-slate-700">
              <input
                type="checkbox"
                checked={data.db?.takeTaxFree25 || false}
                onChange={(e) => handleDBChange('takeTaxFree25', e.target.checked)}
                className="w-5 h-5"
              />
              Take 25% tax-free from total DB (20× model; overall cap enforced)
            </label>
            <p className="text-sm text-slate-600 mt-2">
              For every £1 of annual pension you give up, you receive £20 as a tax-free lump sum.
              Total PCLS across all pensions (DC + DB) is capped at £268,275.
            </p>
          </div>
        )}
      </div>

      {/* Info box */}
      {schemes.length === 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ℹ️ <strong>Note:</strong> If you don't have any DB pensions, you can skip to the next module.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Continue to Savings →
        </button>
      </div>
    </div>
  );
}
