// src/components/wizard/modules/Module10Projection.jsx
import React, { useMemo } from 'react';
import { calculateProjection, extractWarnings } from '../../../logic/projection';
import ProjectionTable from '../../ProjectionTable';
import ProjectionCharts from '../../ProjectionCharts';
import HelpText from '../../ui/HelpText';

export default function Module10Projection({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = React.useState(false);

  // Build opening values from Module 7 results
  const openingValues = useMemo(() => {
    const atRetResults = data.atRetirementResults;
    if (!atRetResults) {
      return null;
    }

    return {
      retirementAge: parseFloat(data.inputs?.retirementAge || 65),
      dcPotAfterPCLS: atRetResults.assets.dcPotForDrawdown || 0,
      isaSavings: atRetResults.assets.isaAtRet || 0,
      taxableSavings: atRetResults.assets.taxableAtRet || 0,
      dbPension: atRetResults.income.dbIncomeAfter || 0,
      annuityIncome: atRetResults.income.dcAnnuityIncome || 0,
      statePension: atRetResults.income.statePensionAtRetNominal || 0,
      statePensionAge: parseFloat(data.inputs?.statePensionAge || 67),
      otherIncome: atRetResults.income.otherIncomeAtRet || 0,
      annualSpend: parseFloat(data.lifestyle?.baselineAmount || 0),
      inflation: parseFloat(data.inputs?.inflation || 2.5) / 100,
      dcGrowth: parseFloat(data.dc?.growthAssumption || 0.04),
      isaGrowth: parseFloat(data.savings?.isa?.growthRate || 3) / 100,
      savingsGrowth: parseFloat(data.savings?.taxableSavings?.growthRate || 3) / 100,
      taxRegion: data.inputs?.taxRegion === 'scotland' ? 'scotland' : 'england',
      yearsToRetirement: atRetResults.yearsToRetirement || 0,
    };
  }, [data]);

  // Build projection inputs from Modules 8 and 9
  const projectionInputs = useMemo(() => {
    // DC drawdown rate: use Module 9 override if present, else Module 3 rate
    const dcDrawdownPercent = data.postRetirement?.dcDrawdownRate
      ? parseFloat(data.postRetirement.dcDrawdownRate) * 100
      : parseFloat(data.dc?.drawdownRate || 0.04) * 100;

    return {
      isaRecurringAmount: parseFloat(data.postRetirement?.isaInvestmentAnnual || 0),
      isaRecurringYears: 25, // Fixed for now - all 25 years
      dcDrawdownPercent,
      lifeEvents: data.lifeEvents || [],
    };
  }, [data]);

  // Calculate projection
  const projectionData = useMemo(() => {
    if (!openingValues) return null;
    return calculateProjection(openingValues, projectionInputs);
  }, [openingValues, projectionInputs]);

  // Extract warnings
  const warnings = useMemo(() => {
    if (!projectionData) return [];
    return extractWarnings(projectionData);
  }, [projectionData]);

  // Note: We don't save projection results to wizard data to avoid infinite loops
  // The projection is calculated on-the-fly whenever Module 10 is viewed

  if (!openingValues) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <h3 className="text-xl font-bold text-amber-800 mb-3">Missing At-Retirement Results</h3>
          <p className="text-amber-700 mb-4">
            Please complete Module 7 (At Retirement Results) first. The projection requires your
            retirement position as a starting point.
          </p>
          <button
            onClick={() => window.location.href = '/wizard?module=7'}
            className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
          >
            Go to Module 7
          </button>
        </div>
      </div>
    );
  }

  if (!projectionData || projectionData.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-600">Calculating projection...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Help text */}
      <div className="mb-6 no-print">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          {showHelp ? '✕ Hide Help' : '? Show Help'}
        </button>
        <HelpText isVisible={showHelp}>
          This 25-year projection shows how your retirement finances evolve year by year. The table
          includes all income sources, growth, drawdowns, life events, tax calculations, and closing
          balances. Red highlighting indicates potential issues (negative balances, depletion
          warnings). Use the charts below for visual analysis. You can export the full table to CSV
          for deeper analysis in Excel.
        </HelpText>
      </div>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-800 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            Depletion Warnings
          </h3>
          <ul className="space-y-2">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-red-700 flex items-start gap-2">
                <span className="text-red-600">•</span>
                <span>
                  <strong>Age {warning.age} (Year {warning.year}):</strong> {warning.messages.join(', ')}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-red-600">
            💡 <strong>Recommendation:</strong> Consider adjusting your retirement age, spending,
            DC drawdown rate, or increasing pre-retirement savings to avoid running out of funds.
          </p>
        </div>
      )}

      {/* Success Message */}
      {warnings.length === 0 && (
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <h3 className="text-xl font-bold text-green-800 mb-2 flex items-center gap-2">
            <span>✓</span>
            Projection Looks Good
          </h3>
          <p className="text-green-700">
            Your retirement finances appear sustainable over the 25-year projection period based on
            your current assumptions. All asset pots remain positive throughout.
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mb-6 grid md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-600 mb-1">Starting Age</h4>
          <p className="text-2xl font-bold text-slate-800">{projectionData[0]?.age}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-600 mb-1">Ending Age</h4>
          <p className="text-2xl font-bold text-slate-800">{projectionData[projectionData.length - 1]?.age}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-600 mb-1">Total Assets (Year 1)</h4>
          <p className="text-2xl font-bold text-green-700">
            £{Math.round(projectionData[0]?.totalNominal || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-600 mb-1">Total Assets (Year 25)</h4>
          <p className={`text-2xl font-bold ${projectionData[projectionData.length - 1]?.totalNominal < 0 ? 'text-red-700' : 'text-green-700'}`}>
            £{Math.round(projectionData[projectionData.length - 1]?.totalNominal || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Print Button */}
      <div className="mb-6 flex justify-end no-print">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>🖨️</span>
          <span>Print / Download PDF</span>
        </button>
      </div>

      {/* Charts */}
      <div className="mb-6">
        <ProjectionCharts data={projectionData} />
      </div>

      {/* Projection Table */}
      <div className="mb-6 no-print">
        <ProjectionTable data={projectionData} />
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
        <p className="text-sm text-blue-800">
          💡 <strong>Understanding the projection:</strong> This model uses the "4% rule" style
          drawdown where the cash amount is calculated in year 1 and inflated each year. Taxable
          savings act as a buffer, absorbing surpluses and deficits. ISA is only tapped if taxable
          savings are exhausted. All values are shown in nominal (future) terms, with real (today's
          prices) terms shown in the final column.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 bg-slate-50 border border-slate-300 rounded-lg p-4">
        <p className="text-xs text-slate-600">
          <strong>Important Disclaimer:</strong> These projections are estimates based on the assumptions
          you have provided, including inflation rates, investment growth, pension values, and life expectancy.
          Actual outcomes may differ significantly due to market fluctuations, changes in personal circumstances,
          tax law changes, and other unforeseen factors. This calculator is for illustrative purposes only and
          does not constitute financial advice. You should consult with a qualified financial adviser before
          making any retirement planning decisions.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center no-print">
        <button
          onClick={() => window.location.href = '/wizard?module=1'}
          className="px-6 py-3 rounded-md font-medium bg-slate-500 text-white hover:bg-slate-600 transition-colors"
        >
          ← Back to Module 1
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-green-700 mb-2">
            ✓ Wizard Complete!
          </p>
          <p className="text-sm text-slate-600">
            You've completed all 10 modules of the retirement planning wizard.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Exit to Welcome →
        </button>
      </div>
    </div>
  );
}
