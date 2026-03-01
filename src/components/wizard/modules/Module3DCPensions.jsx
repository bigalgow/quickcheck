// src/components/wizard/modules/Module3DCPensions.jsx
import React from 'react';
import HelpText from '../../ui/HelpText';
import DCPotWizard from '../../DCPotWizard.jsx';

export default function Module3DCPensions({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);

  // Calculate if already retired
  const currentAge = data.inputs?.dateOfBirth
    ? Math.floor((new Date() - new Date(data.inputs.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const retirementAge = parseInt(data.inputs?.retirementAge);
  const alreadyRetired = currentAge && retirementAge && retirementAge <= currentAge;

  // Simple update handler - updates parent state directly
  const handleChange = (field, value) => {
    onDataChange({
      dc: {
        ...(data.dc || {}),
        [field]: value,
      },
    });
  };

  // Convert to percentage for display
  const toPercent = (decimal) => {
    const num = parseFloat(decimal);
    return isNaN(num) ? '' : String(num * 100);
  };

  // Convert from percentage to decimal
  const fromPercent = (percent) => {
    const num = parseFloat(percent);
    return isNaN(num) ? '0' : String(num / 100);
  };

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
          DC (Defined Contribution) pensions are pots you've built up, either through workplace schemes
          or personal pensions. The pot grows with contributions and investment returns. You can take
          25% tax-free at retirement (up to £268,275 total across all pensions). The rest provides
          income via drawdown, annuity, or a mix of both.
        </HelpText>
      </div>

      <div className="space-y-8">
        {/* Current DC Pension Pot */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Current DC Pension Pot</h3>

          {/* DC Pot Wizard */}
          <DCPotWizard
            totalValue={data.dc?.potNow || ''}
            onTotalChange={(total) => handleChange('potNow', total.toString())}
          />

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-base font-medium text-slate-700 mb-2">
                DC pot total (£)
              </label>
              <input
                type="number"
                value={data.dc?.potNow || ''}
                onChange={(e) => handleChange('potNow', e.target.value)}
                min="0"
                placeholder="0"
                className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              />
            </div>
            {!alreadyRetired && (
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-base font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={data.dc?.takeTaxFree25 || false}
                    onChange={(e) => handleChange('takeTaxFree25', e.target.checked)}
                    className="w-5 h-5"
                  />
                  Take 25% tax-free from DC?
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Future Contributions - Hidden if already retired */}
        {!alreadyRetired && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Future Contributions</h3>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-base font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={data.dc?.isContributing || false}
                  onChange={(e) => handleChange('isContributing', e.target.checked)}
                  className="w-5 h-5"
                />
                Still contributing to a DC pension?
              </label>
            </div>

            {data.dc?.isContributing && (
              <>
                {/* Contribution Type */}
                <div className="mb-4">
                  <label className="block text-base font-medium text-slate-700 mb-2">
                    Contribution type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dcType"
                        value="employer"
                        checked={(data.dc?.contributionType || 'employer') === 'employer'}
                        onChange={(e) => handleChange('contributionType', e.target.value)}
                      />
                      Employer scheme
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dcType"
                        value="personal"
                        checked={(data.dc?.contributionType || 'employer') === 'personal'}
                        onChange={(e) => handleChange('contributionType', e.target.value)}
                      />
                      Personal / SIPP
                    </label>
                  </div>
                </div>

                {/* Employer scheme path */}
                {(data.dc?.contributionType || 'employer') === 'employer' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-base font-medium text-slate-700 mb-2">
                        Salary now (£)
                      </label>
                      <input
                        type="number"
                        value={data.dc?.salaryNow || ''}
                        onChange={(e) => handleChange('salaryNow', e.target.value)}
                        min="0"
                        placeholder="0"
                        className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-base font-medium text-slate-700 mb-2">
                          Your contribution (%)
                        </label>
                        <input
                          type="number"
                          value={toPercent(data.dc?.employeePct || '0.05')}
                          onChange={(e) => handleChange('employeePct', fromPercent(e.target.value))}
                          min="0"
                          max="100"
                          placeholder="5"
                          className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-medium text-slate-700 mb-2">
                          Employer contribution (%)
                        </label>
                        <input
                          type="number"
                          value={toPercent(data.dc?.employerPct || '0.05')}
                          onChange={(e) => handleChange('employerPct', fromPercent(e.target.value))}
                          min="0"
                          max="100"
                          placeholder="5"
                          className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal scheme path */}
                {(data.dc?.contributionType || 'employer') === 'personal' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-base font-medium text-slate-700 mb-2">
                        Annual contribution (£)
                      </label>
                      <input
                        type="number"
                        value={data.dc?.personalAnnualContrib || ''}
                        onChange={(e) => handleChange('personalAnnualContrib', e.target.value)}
                        min="0"
                        placeholder="0"
                        className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                      />
                    </div>
                    <p className="text-sm text-slate-600">
                      Personal contributions escalate with inflation (uses your inflation assumption)
                    </p>
                  </div>
                )}

                {/* Career Break Section */}
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => handleChange('hasCareerBreak', !data.dc?.hasCareerBreak)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                  >
                    <span className={`transition-transform ${data.dc?.hasCareerBreak ? 'rotate-90' : ''}`}>▶</span>
                    Planning a career break? (e.g., childcare, travel, sabbatical)
                  </button>

                  {data.dc?.hasCareerBreak && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800 mb-4">
                        If you're planning a break from work, contributions will pause during this period.
                        Your existing pot continues to grow, and contributions resume when you return.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Break starts at age
                          </label>
                          <input
                            type="number"
                            value={data.dc?.breakStartAge || ''}
                            onChange={(e) => handleChange('breakStartAge', e.target.value)}
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
                            value={data.dc?.breakEndAge || ''}
                            onChange={(e) => handleChange('breakEndAge', e.target.value)}
                            min={data.dc?.breakStartAge || currentAge || 18}
                            max={retirementAge || 70}
                            placeholder={data.dc?.breakStartAge ? String(parseInt(data.dc.breakStartAge) + 2) : '37'}
                            className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                          />
                        </div>
                      </div>
                      {data.dc?.breakStartAge && data.dc?.breakEndAge && (
                        <p className="text-sm text-amber-700 mt-3">
                          {parseInt(data.dc.breakEndAge) - parseInt(data.dc.breakStartAge)} year break:
                          no contributions from age {data.dc.breakStartAge} to {data.dc.breakEndAge}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Withdrawal Method */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Withdrawal Method</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-base font-medium text-slate-700 mb-2">
                Drawdown rate (%)
              </label>
              <input
                type="number"
                value={toPercent(data.dc?.drawdownRate || '0.04')}
                onChange={(e) => handleChange('drawdownRate', fromPercent(e.target.value))}
                min="0"
                max="100"
                placeholder="4"
                className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-slate-700 mb-2">
                Annuity rate (%)
              </label>
              <input
                type="number"
                value={toPercent(data.dc?.annuityRate || '0.06')}
                onChange={(e) => handleChange('annuityRate', fromPercent(e.target.value))}
                min="0"
                max="100"
                placeholder="6"
                className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-slate-700 mb-2">
                % of pot to annuitize
              </label>
              <input
                type="number"
                value={data.dc?.annuityPct || ''}
                onChange={(e) => handleChange('annuityPct', e.target.value)}
                min="0"
                max="100"
                placeholder="0"
                className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              />
              <p className="text-sm text-slate-600 mt-1">
                (0 = all drawdown, 100 = all annuity)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Note:</strong> DC pot is projected with contributions using start-of-year timing.
          25% PCLS applies, but total DC+DB PCLS is capped at £268,275 (DB PCLS restricted after DC).
          Employer contributions use start-of-year salary; personal contributions escalate with inflation.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Continue to DB Pensions →
        </button>
      </div>
    </div>
  );
}
