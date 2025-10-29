// src/components/ProjectionInputs.jsx
import React from 'react';
import FormInput from './ui/FormInput';

export default function ProjectionInputs({
  isaRecurringAmount,
  setIsaRecurringAmount,
  isaRecurringYears,
  setIsaRecurringYears,
  dcDrawdownPercent,
  setDcDrawdownPercent,
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 mb-6 overflow-hidden">
      <div className="bg-slate-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 text-left">
          Projection Inputs
        </h2>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* ISA Recurring Investment */}
        <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">ISA Recurring Investment</h3>
          <div className="space-y-4">
            <FormInput
              label="Annual Amount (£)"
              name="isaRecurringAmount"
              type="number"
              value={isaRecurringAmount}
              onChange={(e) => setIsaRecurringAmount(e.target.value)}
              min="0"
              placeholder="e.g., 10000"
            />
            <FormInput
              label="Number of Years"
              name="isaRecurringYears"
              type="number"
              value={isaRecurringYears}
              onChange={(e) => setIsaRecurringYears(e.target.value)}
              min="0"
              max="25"
              placeholder="e.g., 10"
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-3 italic">
            Transfer from taxable savings to ISA annually for tax efficiency (only if taxable savings sufficient)
          </p>
        </div>

        {/* DC Drawdown Slider */}
        <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">DC Drawdown Strategy</h3>
          <div>
            <label className="block text-sm sm:text-base font-medium text-slate-700 mb-3">
              Initial Drawdown Percentage: <span className="text-lg sm:text-xl font-bold text-sky-600">{dcDrawdownPercent.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={dcDrawdownPercent}
              onChange={(e) => setDcDrawdownPercent(parseFloat(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0%</span>
              <span>2.5%</span>
              <span>5%</span>
              <span>7.5%</span>
              <span>10%</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-3 italic">
            Year 1 drawdown as % of DC pot. Subsequent years: inflate cash amount (4% rule)
          </p>
        </div>
      </div>
    </div>
  );
}
