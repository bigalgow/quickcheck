// src/components/wizard/modules/Module6OtherIncome.jsx
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import FormInput from '../../ui/FormInput';
import HelpText from '../../ui/HelpText';
import { formatCurrency } from '../../../utils/money';

export default function Module6OtherIncome({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);
  const [newIncome, setNewIncome] = React.useState({
    type: 'property',
    description: '',
    annualAmount: '',
  });

  const handleAddIncome = () => {
    if (!newIncome.description || !newIncome.annualAmount) {
      alert('Please fill in all fields');
      return;
    }

    const incomeItem = {
      id: uuidv4(),
      type: newIncome.type,
      description: newIncome.description,
      annualAmount: parseFloat(newIncome.annualAmount),
    };

    onDataChange({
      otherIncome: [...(data.otherIncome || []), incomeItem],
    });

    // Reset form
    setNewIncome({
      type: 'property',
      description: '',
      annualAmount: '',
    });
  };

  const handleDeleteIncome = (id) => {
    onDataChange({
      otherIncome: data.otherIncome.filter((item) => item.id !== id),
    });
  };

  const incomeList = data.otherIncome || [];

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
          Add any other income sources you'll have in retirement besides pensions. Property rental
          income, dividends, and other income all have different tax treatments. Enter gross amounts
          (before tax).
        </HelpText>
      </div>

      {/* Add new income form */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Income Source</h3>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label htmlFor="incomeType" className="block text-base font-medium text-slate-700 mb-2">
              Income Type
            </label>
            <select
              id="incomeType"
              value={newIncome.type}
              onChange={(e) => setNewIncome({ ...newIncome, type: e.target.value })}
              className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="property">Property Rental Income</option>
              <option value="dividend">Dividend Income</option>
              <option value="other">Other Income</option>
            </select>
          </div>

          {/* Description */}
          <FormInput
            label="Description"
            name="description"
            type="text"
            value={newIncome.description}
            onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
            placeholder="e.g., Rental from buy-to-let property"
          />

          {/* Amount */}
          <FormInput
            label="Annual Amount (£)"
            name="annualAmount"
            type="number"
            value={newIncome.annualAmount}
            onChange={(e) => setNewIncome({ ...newIncome, annualAmount: e.target.value })}
            min="0"
            placeholder="e.g., 12000"
          />

          {/* Add button */}
          <button
            onClick={handleAddIncome}
            className="w-full py-2 mt-2 rounded-md border border-sky-600 bg-sky-500 text-white hover:bg-sky-600 transition-colors"
          >
            + Add Income Source
          </button>
        </div>
      </div>

      {/* Income list */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Your Other Income Sources</h3>
        {incomeList.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-slate-500">No other income sources added yet</p>
            <p className="text-sm text-slate-400 mt-1">Add income sources above if you have any</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {incomeList.map((item) => {
              const typeLabels = {
                property: '🏠 Property Rental',
                dividend: '📊 Dividend',
                other: '💼 Other',
              };

              return (
                <li
                  key={item.id}
                  className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-base text-slate-800">
                      {typeLabels[item.type]} - {item.description}
                    </div>
                    <div className="text-base text-green-600 font-mono font-medium">
                      {formatCurrency(item.annualAmount)} per year
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteIncome(item.id)}
                    className="px-3 py-2 text-base rounded-md border border-red-500 bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Note:</strong> This module is optional. If you have no other income sources
          besides pensions, you can skip to the next module.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Continue to Results →
        </button>
      </div>
    </div>
  );
}
