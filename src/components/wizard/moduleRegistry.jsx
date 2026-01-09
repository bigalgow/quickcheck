// src/components/wizard/moduleRegistry.jsx
// Registry of all wizard modules

import React from 'react';
import Module1CoreAssumptions from './modules/Module1CoreAssumptions.jsx';
import Module2Lifestyle from './modules/Module2Lifestyle.jsx';
import Module3DCPensions from './modules/Module3DCPensions.jsx';
import Module4DBPensions from './modules/Module4DBPensions.jsx';
import Module5Savings from './modules/Module5Savings.jsx';
import Module6OtherIncome from './modules/Module6OtherIncome.jsx';
import Module7Results from './modules/Module7Results.jsx';
import Module8LifeEvents from './modules/Module8LifeEvents.jsx';
import Module9DrawdownSequencing from './modules/Module9DrawdownSequencing.jsx';
import Module10Projection from './modules/Module10Projection.jsx';

/**
 * Placeholder component for modules not yet implemented
 */
function PlaceholderModule({ data, onDataChange, onNext, moduleId, title }) {
  return (
    <div className="p-8 text-center">
      <div className="max-w-2xl mx-auto">
        <div className="text-6xl mb-4">🚧</div>
        <h3 className="text-2xl font-bold text-slate-800 mb-3">
          Module {moduleId}: {title}
        </h3>
        <p className="text-slate-600 mb-6">
          This module is under construction and will be implemented in the next phase.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-slate-700 mb-3">What will be here:</h4>
          <p className="text-slate-600 text-left">
            {getModuleDescription(moduleId)}
          </p>
        </div>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-sky-500 text-white rounded-md hover:bg-sky-600 font-medium"
        >
          Continue to Next Module →
        </button>
      </div>
    </div>
  );
}

function getModuleDescription(moduleId) {
  const descriptions = {
    1: "Enter your date of birth, retirement age, life expectancy, inflation rate, and tax region. These core assumptions will be used throughout your retirement plan.",
    2: "Choose your desired retirement lifestyle using PLSA benchmarks (Minimum/Moderate/Comfortable) or enter a custom annual spending amount.",
    3: "Add all your Defined Contribution (DC) pension pots with current values, contribution rates, and growth assumptions.",
    4: "Add all your Defined Benefit (DB) pension schemes, including active and deferred schemes.",
    5: "Enter your Cash ISAs, Stocks & Shares ISAs, and other taxable savings with current values and growth rates.",
    6: "Add any other income sources such as property rental income, dividends, or other income.",
    7: "View your complete financial position at retirement, including total income, expenditure, and surplus/shortfall. Adjust assumptions with interactive sliders.",
    8: "Add lifestyle events such as travel, major purchases, inheritances, and other income/expense items throughout retirement.",
    9: "Configure your drawdown sequencing strategy including ISA investments during retirement and DC drawdown rate adjustments.",
    10: "View a detailed 25-year projection of your retirement finances with year-by-year breakdown, charts, and depletion warnings.",
  };
  return descriptions[moduleId] || "Details coming soon.";
}

/**
 * Module component registry
 * Maps module ID to React component
 */
export const MODULE_COMPONENTS = {
  1: Module1CoreAssumptions,
  2: Module2Lifestyle,
  3: Module3DCPensions,
  4: Module4DBPensions,
  5: Module5Savings,
  6: Module6OtherIncome,
  7: Module7Results,
  8: Module8LifeEvents,
  9: Module9DrawdownSequencing,
  10: Module10Projection,
};
