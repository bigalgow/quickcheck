// src/components/wizard/modules/Module5Savings.jsx
import React from 'react';
import FormInput from '../../ui/FormInput';
import HelpText from '../../ui/HelpText';

export default function Module5Savings({ data, onDataChange, onNext, onPrevious }) {
  const [showHelp, setShowHelp] = React.useState(false);

  const handleChange = (category, field, value) => {
    onDataChange({
      savings: {
        ...data.savings,
        [category]: {
          ...data.savings[category],
          [field]: value,
        },
      },
    });
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
          Add your liquid savings and investments. Don't include property equity as it's not liquid.
          ISA balance grows at the specified rate, plus any annual contributions you add until retirement.
          Taxable savings interest is subject to income tax (after Personal Savings Allowance).
        </HelpText>
      </div>

      <div className="space-y-8">
        {/* ISA */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">💰 ISA</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <FormInput
              label="Current Balance (£)"
              name="isa-currentValue"
              type="number"
              value={data.savings.isa?.currentValue || ''}
              onChange={(e) => handleChange('isa', 'currentValue', e.target.value)}
              min="0"
              placeholder="0"
            />
            <FormInput
              label="Add per year (£)"
              name="isa-addPerYear"
              type="number"
              value={data.savings.isa?.addPerYear || ''}
              onChange={(e) => handleChange('isa', 'addPerYear', e.target.value)}
              min="0"
              placeholder="0"
            />
            <FormInput
              label="Growth Rate (% per year)"
              name="isa-growthRate"
              type="number"
              value={data.savings.isa?.growthRate || ''}
              onChange={(e) => handleChange('isa', 'growthRate', e.target.value)}
              min="0"
              max="20"
              placeholder="3"
            />
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Annual contributions continue until retirement
          </p>
        </div>

        {/* Taxable Savings */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">🏦 Taxable Savings</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <FormInput
              label="Current Balance (£)"
              name="taxableSavings-currentValue"
              type="number"
              value={data.savings.taxableSavings?.currentValue || ''}
              onChange={(e) => handleChange('taxableSavings', 'currentValue', e.target.value)}
              min="0"
              placeholder="0"
            />
            <FormInput
              label="Add per year (£)"
              name="taxableSavings-addPerYear"
              type="number"
              value={data.savings.taxableSavings?.addPerYear || ''}
              onChange={(e) => handleChange('taxableSavings', 'addPerYear', e.target.value)}
              min="0"
              placeholder="0"
            />
            <FormInput
              label="Growth Rate (% per year)"
              name="taxableSavings-growthRate"
              type="number"
              value={data.savings.taxableSavings?.growthRate || ''}
              onChange={(e) => handleChange('taxableSavings', 'growthRate', e.target.value)}
              min="0"
              max="20"
              placeholder="3"
            />
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Interest on taxable savings is subject to income tax (after Personal Savings Allowance).
            Annual contributions continue until retirement.
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Note:</strong> You don't need to have all types of savings. Leave fields blank
          if you don't have that type of account.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Continue to Other Income →
        </button>
      </div>
    </div>
  );
}
