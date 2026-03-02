// src/components/wizard/modules/Module10Projection.jsx
import React, { useMemo, useState } from 'react';
import html2canvas from 'html2canvas';
import { calculateProjection, extractWarnings } from '../../../logic/projection';
import ProjectionTable from '../../ProjectionTable';
import ProjectionCharts from '../../ProjectionCharts';
import HelpText from '../../ui/HelpText';
import { useAuth } from '../../../auth/AuthProvider';

export default function Module10Projection({ data, onDataChange, onNext }) {
  const { userInfo } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [showAdvice, setShowAdvice] = useState(true);

  // Handle print with chart capture
  const handlePrint = async () => {
    try {
      // Find all chart containers
      const chartContainers = document.querySelectorAll('.recharts-responsive-container');
      const capturedImages = [];

      // Capture each chart as canvas
      for (const container of chartContainers) {
        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
          logging: false,
        });

        // Convert to image
        const imgData = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = imgData;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.className = 'print-chart-image';

        // Store for cleanup
        capturedImages.push({ container, img });

        // Hide original chart and insert image
        container.style.display = 'none';
        container.parentNode.insertBefore(img, container);
      }

      // Small delay to ensure images are rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Open print dialog
      window.print();

      // Cleanup after print dialog closes
      setTimeout(() => {
        capturedImages.forEach(({ container, img }) => {
          img.remove();
          container.style.display = '';
        });
      }, 100);

    } catch (error) {
      console.error('Chart capture failed:', error);
      // Fallback to normal print
      window.print();
    }
  };

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
      taxableSavings: (atRetResults.assets.taxableAtRet || 0) + (atRetResults.assets.dcPclsCash || 0) + (atRetResults.assets.dbPclsCash || 0),
      dbPension: atRetResults.income.dbIncomeAfter || 0,
      annuityIncome: atRetResults.income.dcAnnuityIncome || 0,
      statePension: atRetResults.income.statePensionAtRetNominal || 0,
      statePensionAge: parseFloat(data.inputs?.statePensionAge || 67),
      otherIncome: atRetResults.income.otherIncomeAtRet || 0,
      annualSpend: atRetResults.desiredSpendAtRet || parseFloat(data.lifestyle?.baselineAmount || 0),
      inflation: parseFloat(data.inputs?.inflation || 2.5) / 100,
      dcGrowth: parseFloat(data.dc?.growthAssumption || 0.04),
      isaGrowth: parseFloat(data.savings?.isa?.growthRate || 3) / 100,
      savingsGrowth: parseFloat(data.savings?.taxableSavings?.growthRate || 3) / 100,
      taxRegion: data.inputs?.taxRegion === 'scotland' ? 'scotland' : 'england',
      yearsToRetirement: atRetResults.yearsToRetirement || 0,
      housingType: data.lifestyle?.housingType || 'none',
      housingCostAnnual: parseFloat(data.lifestyle?.housingCostAnnual || 0),
      ageMortgagePaidOff: data.lifestyle?.ageMortgagePaidOff ? parseFloat(data.lifestyle.ageMortgagePaidOff) : null,
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

  // Format date for print
  const printDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="p-6">
      {/* Print Header (hidden on screen, visible in print) */}
      <div className="print-only mb-6 border-b-2 border-slate-300 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <img src="/logo.png" alt="RetirePlan" className="h-16" />
          <h1 className="text-2xl font-bold text-slate-800">Retirement Planner</h1>
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          <div><strong>Printed:</strong> {printDate}</div>
          {userInfo && (
            <div>
              <strong>Account:</strong> {userInfo.name || userInfo.given_name || 'User'}
              {userInfo.email && <span className="text-slate-500"> ({userInfo.email})</span>}
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-800 mt-4">25-Year Projection - Illustration</h2>
      </div>

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
          <br /><br />
          <strong>Automatic adjustments:</strong> Your baseline spending automatically adjusts for typical
          lifestyle changes: full spending until age 75, then -15% reduction (ages 75-84), and -25%
          reduction (ages 85+). These evidence-based adjustments reflect reduced discretionary spending
          as people age. If you have specific plans at later ages, add them as Life Events in Module 8.
        </HelpText>
      </div>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="mb-6 space-y-3 print-avoid-break">

          {/* Panel A — compact red alert */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
            <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
              <span>⚠️</span>
              Asset Depletion Detected
            </h3>
            <ul className="space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-red-700 flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span><strong>{warning.message}</strong> — first occurs at age {warning.age} (Year {warning.year})</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Panel B — amber advice panel */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAdvice(!showAdvice)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-bold text-amber-800 flex items-center gap-2">
                <span>💡</span>
                How to Address This
              </span>
              <span className="text-amber-600 text-sm">{showAdvice ? '▲ Hide' : '▼ Show'}</span>
            </button>

            {showAdvice && (
              <div className="px-5 pb-5 text-sm text-amber-900 space-y-4">
                <p>
                  If your planned spend exceeds your pension and other income, the model draws down
                  from savings and investments to cover the shortfall. This is often the case when
                  your planned retirement age is earlier than your state pension age — the model uses
                  savings to bridge the gap. Don't worry — you have many options to address this, and
                  small adjustments can make a significant difference to the outcome.
                </p>

                {/* Quick win */}
                <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
                  <div className="font-semibold text-amber-800 mb-1">Try first — use the sliders in Module 7</div>
                  <p className="text-amber-800 mb-3 text-xs">
                    Retirement age, spending level, and drawdown rate can all be adjusted there
                    instantly without re-entering data — the fastest way to experiment.
                  </p>
                  <button
                    onClick={() => window.location.href = '/wizard?module=7'}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-md transition-colors"
                  >
                    Go to Module 7 →
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Pre-retirement */}
                  <div>
                    <div className="font-semibold text-amber-800 mb-2">Pre-retirement options</div>
                    <ul className="space-y-2">
                      {[
                        { label: 'Increase pension contributions', module: 3 },
                        { label: 'Increase savings', module: 5 },
                        { label: 'Delay retirement age', module: 1 },
                        { label: 'Develop other income', module: 6 },
                      ].map(({ label, module }) => (
                        <li key={module} className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded px-3 py-2">
                          <span>{label}</span>
                          <button
                            onClick={() => window.location.href = `/wizard?module=${module}`}
                            className="shrink-0 text-xs text-amber-700 font-semibold hover:text-amber-900 underline"
                          >
                            Module {module}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Post-retirement */}
                  <div>
                    <div className="font-semibold text-amber-800 mb-2">Post-retirement options</div>
                    <ul className="space-y-2">
                      {[
                        { label: 'Reduce spending', module: 2 },
                        { label: 'Review life events', module: 8 },
                        { label: 'Take 25% tax-free cash as a buffer', module: 3 },
                        { label: 'Increase pension drawdown rate', module: 9 },
                      ].map(({ label, module }) => (
                        <li key={module} className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded px-3 py-2">
                          <span>{label}</span>
                          <button
                            onClick={() => window.location.href = `/wizard?module=${module}`}
                            className="shrink-0 text-xs text-amber-700 font-semibold hover:text-amber-900 underline"
                          >
                            Module {module}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {warnings.length === 0 && (
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-6 print-avoid-break">
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
      <div className="mb-6 grid md:grid-cols-4 gap-4 no-print">
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

      {/* Print Button - Desktop only (chart capture doesn't work on mobile) */}
      <div className="mb-6 hidden md:flex justify-end no-print">
        <button
          onClick={handlePrint}
          className="px-6 py-3 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>🖨️</span>
          <span>Print Report (with charts)</span>
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
      <div className="mt-6 bg-slate-50 border border-slate-300 rounded-lg p-4 print-avoid-break">
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
