// src/components/wizard/modules/Module9DrawdownSequencing.jsx
import React from 'react';
import HelpText from '../../ui/HelpText';
import FormInput from '../../ui/FormInput';

export default function Module9DrawdownSequencing({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);

  const handleChange = (field, value) => {
    onDataChange({
      postRetirement: {
        ...(data.postRetirement || {}),
        [field]: value,
      },
    });
  };

  // Get current DC drawdown rate from Module 3 as reference
  const atRetirementDrawdownRate = parseFloat(data.dc?.drawdownRate || 0.04) * 100;

  // Convert decimal to percentage for display
  const toPercent = (decimal) => {
    const num = parseFloat(decimal);
    return isNaN(num) ? '' : String(num * 100);
  };

  // Convert percentage to decimal for storage
  const fromPercent = (percent) => {
    const num = parseFloat(percent);
    return isNaN(num) ? '' : String(num / 100);
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
          Configure how your retirement income will be sequenced and managed. The system
          automatically draws from different sources in a tax-efficient order: DC pensions first
          (at your chosen rate), then taxable savings to bridge any gaps, and finally ISA savings
          only if needed. You can also build up ISA savings during retirement from surplus income
          for tax-efficient growth.
        </HelpText>
      </div>

      <div className="space-y-8">
        {/* Strategy Overview */}
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">
            Automatic Drawdown Sequencing
          </h3>
          <p className="text-slate-700 mb-4">
            Your retirement income follows this intelligent, tax-efficient sequence:
          </p>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">DC Pension Drawdown</h4>
                <p className="text-sm text-slate-600">
                  Drawn at your chosen rate (adjustable below). Provides steady income stream.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Fixed Income Streams</h4>
                <p className="text-sm text-slate-600">
                  DB pension, annuity, state pension (from SPA), and other income automatically
                  added.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Taxable Savings (Buffer)</h4>
                <p className="text-sm text-slate-600">
                  Absorbs surpluses and deficits. Automatically bridges income gaps before State
                  Pension Age. Can go negative (overdraft/borrowing).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">ISA Savings (Last Resort)</h4>
                <p className="text-sm text-slate-600">
                  Only tapped if taxable savings exhausted. Tax-free growth and withdrawals preserved
                  as long as possible.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-sky-300 rounded-lg p-4 mt-4">
            <p className="text-sm text-slate-700">
              <strong>💡 Automatic SPA Bridging:</strong> If your retirement age is below State
              Pension Age, taxable savings automatically bridge any income deficit until SPA. When
              state pension starts, the automatic draw reduces or stops.
            </p>
          </div>
        </div>

        {/* ISA Investment During Retirement */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            ISA Investment During Retirement
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            If you have surplus income, you can contribute to ISAs during retirement for tax-efficient
            growth. Contributions only occur if taxable savings balance is sufficient.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Annual ISA contribution (£)"
              name="isaInvestmentAnnual"
              type="number"
              value={data.postRetirement?.isaInvestmentAnnual || ''}
              onChange={(e) => handleChange('isaInvestmentAnnual', e.target.value)}
              min="0"
              placeholder="0"
            />
            <div className="flex items-center text-sm text-slate-600">
              <p>
                Contributions will continue each year as long as taxable savings remain positive.
              </p>
            </div>
          </div>
        </div>

        {/* DC Drawdown Rate Adjustment */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            DC Drawdown Rate Adjustment
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Override the DC drawdown rate for your post-retirement years. Leave blank to use the
            rate from Module 3 ({atRetirementDrawdownRate.toFixed(1)}%).
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-slate-700 mb-2">
                DC drawdown rate during retirement (%)
              </label>
              <input
                type="number"
                value={toPercent(data.postRetirement?.dcDrawdownRate || '')}
                onChange={(e) => handleChange('dcDrawdownRate', fromPercent(e.target.value))}
                min="0"
                max="100"
                step="0.1"
                placeholder={atRetirementDrawdownRate.toFixed(1)}
                className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Defaults to {atRetirementDrawdownRate.toFixed(1)}% if left blank
              </p>
            </div>

            <div className="flex items-center text-sm text-slate-600">
              <p>
                This rate applies to all projection years. Future updates will allow year-by-year
                adjustments for phased strategies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 mb-2">
          💡 <strong>How it works:</strong> The projection calculator automatically manages your
          income sources. DC drawdown and fixed income streams provide baseline income. Any surplus
          builds taxable savings (and optionally ISA). Any deficit draws from taxable savings first,
          then ISA if needed.
        </p>
        <p className="text-sm text-blue-800">
          🚀 <strong>Coming soon:</strong> Year-by-year strategy adjustments, multiple retirement
          phases, and tax optimization suggestions.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Continue to 25-Year Projection →
        </button>
      </div>
    </div>
  );
}
