// src/components/wizard/modules/Module7Results.jsx
import React from 'react';
import { atRetirement } from '../../../logic/atRetirement';
import { estimateIncomeTax, TAX_2025_EWNI, TAX_2025_SCOTLAND } from '../../../utils/tax';
import { calculateStatePensionAge } from '../../../utils/statePensionAge';
import { useAuth } from '../../../auth/AuthProvider';
import HelpText from '../../ui/HelpText';

export default function Module7Results({ data, onDataChange, onNext }) {
  const { userInfo } = useAuth();
  const [showHelp, setShowHelp] = React.useState(false);
  const [model, setModel] = React.useState({});

  // Transform wizard data into atRetirement input format
  const buildInputs = (wizardData, modelOverrides = {}) => {
    // Use model overrides if present, otherwise use form values
    const getValue = (key, defaultVal = 0) => {
      if (modelOverrides[key] !== undefined) return parseFloat(modelOverrides[key]);
      const wizardPath = key.split('.').reduce((obj, path) => obj?.[path], wizardData);
      return parseFloat(wizardPath) || defaultVal;
    };

    // Calculate state pension age
    const statePensionAge = calculateStatePensionAge(wizardData.inputs?.dateOfBirth || '');

    // Other income: aggregate from otherIncome array
    const otherIncomeItems = wizardData.otherIncome || [];
    const propertyIncomeNow = otherIncomeItems
      .filter(item => item.type === 'property')
      .reduce((sum, item) => sum + (parseFloat(item.annualAmount) || 0), 0);
    const dividendIncomeNow = otherIncomeItems
      .filter(item => item.type === 'dividend')
      .reduce((sum, item) => sum + (parseFloat(item.annualAmount) || 0), 0);
    const anyOtherIncomeNow = otherIncomeItems
      .filter(item => item.type === 'other')
      .reduce((sum, item) => sum + (parseFloat(item.annualAmount) || 0), 0);

    return {
      // Core
      dateOfBirth: wizardData.inputs?.dateOfBirth || '',
      retirementAge: getValue('inputs.retirementAge', 65),
      inflationAssumption: getValue('inputs.inflation', 2.5) / 100,
      region: wizardData.inputs?.taxRegion === 'scotland' ? 'Scotland' : 'England',
      statePensionAge,
      statePensionAnnual: getValue('inputs.statePensionAnnual', 11973), // 2025/26 full new state pension default

      // DC
      dcPotNow: getValue('dc.potNow', 0),
      takeDCTaxFree25: wizardData.dc?.takeTaxFree25 || false,
      growthAssumption: getValue('dc.growthAssumption', 0.04),
      drawdownRate: getValue('dc.drawdownRate', 0.04),
      annuityRate: getValue('dc.annuityRate', 0.06),
      dcAnnuityPct: getValue('dc.annuityPct', 0),
      dcIsContributing: wizardData.dc?.isContributing || false,
      dcContributionType: wizardData.dc?.contributionType || 'employer',
      salaryNow: getValue('dc.salaryNow', 0),
      eePct: getValue('dc.employeePct', 0.05),
      erPct: getValue('dc.employerPct', 0.05),
      personalAnnualContrib: getValue('dc.personalAnnualContrib', 0),
      // DC Career break
      dcHasCareerBreak: wizardData.dc?.hasCareerBreak || false,
      dcBreakStartAge: wizardData.dc?.breakStartAge ? parseFloat(wizardData.dc.breakStartAge) : null,
      dcBreakEndAge: wizardData.dc?.breakEndAge ? parseFloat(wizardData.dc.breakEndAge) : null,

      // DB
      takeDBTaxFree25: wizardData.db?.takeTaxFree25 || false,
      dbSchemes: (wizardData.db?.schemes || []).map(scheme => ({
        ...scheme,
        // Parse all numeric fields to prevent type coercion bugs
        accrualDenominator: parseFloat(scheme.accrualDenominator) || 60,
        serviceYearsToDate: parseFloat(scheme.serviceYearsToDate) || 0,
        maxServiceYears: scheme.maxServiceYears ? parseFloat(scheme.maxServiceYears) : undefined,
        pensionableSalaryNow: parseFloat(scheme.pensionableSalaryNow) || 0,
        preservedPensionNow: parseFloat(scheme.preservedPensionNow) || 0,
        revaluationAssumption: parseFloat(scheme.revaluationAssumption) || 0.025,
        // Career break fields
        hasCareerBreak: scheme.hasCareerBreak || false,
        breakStartAge: scheme.breakStartAge ? parseFloat(scheme.breakStartAge) : null,
        breakEndAge: scheme.breakEndAge ? parseFloat(scheme.breakEndAge) : null,
      })),

      // Savings
      isaBalance: getValue('savings.isa.currentValue', 0),
      isaAddPerYear: getValue('savings.isa.addPerYear', 0),
      isaRate: getValue('savings.isa.growthRate', 3) / 100,
      taxableSavingsBalance: getValue('savings.taxableSavings.currentValue', 0),
      taxableSavingsAddPerYear: getValue('savings.taxableSavings.addPerYear', 0),
      taxableSavingsRate: getValue('savings.taxableSavings.growthRate', 3) / 100,

      // Other income
      propertyIncomeNow,
      dividendIncomeNow,
      anyOtherIncomeNow,

      // Lifestyle
      desiredSpendAnnual: getValue('lifestyle.baselineAmount', 0),
    };
  };

  // Tax functions
  const taxFns = {
    taxEWNI: (args) => estimateIncomeTax({ ...args, cfg: TAX_2025_EWNI }),
    taxScot: (args) => estimateIncomeTax({ ...args, cfg: TAX_2025_SCOTLAND }),
  };

  // Calculate results (with model overrides if present)
  const inputs = buildInputs(data, model);
  const results = atRetirement(inputs, taxFns);

  // Apply model changes to form
  const applyModelToForm = () => {
    const updates = {};

    if (model['inputs.retirementAge'] !== undefined) {
      updates.inputs = { ...data.inputs, retirementAge: model['inputs.retirementAge'] };
    }
    if (model['dc.potNow'] !== undefined) {
      updates.dc = { ...data.dc, potNow: model['dc.potNow'] };
    }
    if (model['dc.drawdownRate'] !== undefined) {
      updates.dc = { ...updates.dc || data.dc, drawdownRate: model['dc.drawdownRate'] };
    }
    if (model['inputs.inflation'] !== undefined) {
      updates.inputs = { ...updates.inputs || data.inputs, inflation: model['inputs.inflation'] };
    }
    if (model['dc.growthAssumption'] !== undefined) {
      updates.dc = { ...updates.dc || data.dc, growthAssumption: model['dc.growthAssumption'] };
    }
    if (model['lifestyle.baselineAmount'] !== undefined) {
      updates.lifestyle = { ...data.lifestyle, baselineAmount: model['lifestyle.baselineAmount'] };
    }

    if (Object.keys(updates).length > 0) {
      onDataChange(updates);
      setModel({});
    }
  };

  // Reset model
  const resetModel = () => setModel({});

  // Helper for formatting
  const fmt = (num) => {
    if (num == null || isNaN(num)) return '0';
    return Math.round(num).toLocaleString('en-GB');
  };

  // Save results to data
  React.useEffect(() => {
    onDataChange({
      atRetirementResults: {
        yearsToRetirement: results.yearsToRetirement,
        income: results.income,
        assets: results.assets,
        assetsTotal: results.assetsTotal,
        incomeGrossTotal: results.incomeGrossTotal,
        estTax: results.estTax,
        netIncome: results.netIncome,
        surplusDeficit: results.surplusDeficit,
        real: results.real,
        spaWarning: results.spaWarning,
      },
    });
  }, [JSON.stringify(results)]);

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
          This summary shows your projected position at retirement, combining all your pensions,
          savings, and income sources. Values are shown in both nominal (at-retirement) and real
          (today's money) terms. Use the Quick Modelling sliders below to explore different scenarios.
        </HelpText>
      </div>

      {/* Results Summary */}
      <div className="mb-6 print-avoid-break">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">At-Retirement Summary - Illustration</h2>
        <div className="mb-4 text-lg space-y-1">
          <div>
            Age at retirement: <strong>{Math.round(inputs.retirementAge)}</strong>
          </div>
          {results.yearsToRetirement > 0 ? (
            <div>
              Years to retirement: <strong>{Math.round(results.yearsToRetirement)}</strong>
            </div>
          ) : (
            <div className="text-blue-700 font-semibold">
              Status: Already Retired
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Income Card */}
          <div className="bg-white border-2 border-slate-200 rounded-lg p-6 print-avoid-break">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
              Retirement Income (first year)
            </h3>

            {/* DC Income breakdown if blended */}
            {results.income.dcAnnuityIncome > 0 && results.income.dcDrawdownIncome > 0 ? (
              <>
                <div className="mb-2">
                  DC Annuity income:{" "}
                  <strong className="text-green-700">£{fmt(results.income.dcAnnuityIncome)}</strong>
                  <span className="text-sm text-slate-600 ml-2">
                    ({inputs.dcAnnuityPct}% of pot)
                  </span>
                </div>
                <div className="mb-2">
                  DC Drawdown income:{" "}
                  <strong className="text-green-700">£{fmt(results.income.dcDrawdownIncome)}</strong>
                  <span className="text-sm text-slate-600 ml-2">
                    ({(100 - inputs.dcAnnuityPct).toFixed(0)}% of pot)
                  </span>
                </div>
                <div className="ml-4 text-sm text-slate-600 mb-3">
                  Total DC: £{fmt(results.income.dcIncome)}
                </div>
              </>
            ) : (
              <div className="mb-2">
                DC income ({results.income.dcAnnuityIncome > 0 ? "annuity" : "drawdown"}):{" "}
                <strong className="text-green-700">£{fmt(results.income.dcIncome)}</strong>
              </div>
            )}

            {/* DB Income breakdown if both active and deferred */}
            {results.income.dbActiveIncome > 0 && results.income.dbDeferredIncome > 0 ? (
              <>
                <div className="mb-1">
                  Active DB income:{" "}
                  <strong className="text-green-700">£{fmt(results.income.dbActiveIncome)}</strong>
                </div>
                <div className="mb-1">
                  Deferred DB income:{" "}
                  <strong className="text-green-700">£{fmt(results.income.dbDeferredIncome)}</strong>
                </div>
                <div className="ml-4 text-sm text-slate-600 mb-1">
                  Total DB (before PCLS): £{fmt(results.income.dbActiveIncome + results.income.dbDeferredIncome)}
                </div>
                {inputs.takeDBTaxFree25 && (
                  <div className="ml-4 text-sm text-slate-600 mb-2">
                    After 25% PCLS commutation: <strong className="text-green-700">£{fmt(results.income.dbIncomeAfter)}</strong>
                  </div>
                )}
                {!inputs.takeDBTaxFree25 && (
                  <div className="mb-2"></div>
                )}
              </>
            ) : (
              <div className="mb-2">
                DB income {inputs.takeDBTaxFree25 ? "(after PCLS)" : ""}:{" "}
                <strong className="text-green-700">£{fmt(results.income.dbIncomeAfter)}</strong>
                {results.income.dbActiveIncome > 0 && (
                  <span className="text-sm text-slate-600 ml-2">(Active)</span>
                )}
                {results.income.dbDeferredIncome > 0 && (
                  <span className="text-sm text-slate-600 ml-2">(Deferred)</span>
                )}
              </div>
            )}

            {/* Other income breakdown */}
            {results.income.propertyIncomeAtRet > 0 && (
              <div className="mb-2">
                Property rental income:{" "}
                <strong className="text-green-700">£{fmt(results.income.propertyIncomeAtRet)}</strong>
              </div>
            )}
            {results.income.dividendIncomeAtRet > 0 && (
              <div className="mb-2">
                Dividend income:{" "}
                <strong className="text-green-700">£{fmt(results.income.dividendIncomeAtRet)}</strong>
              </div>
            )}
            {results.income.anyOtherIncomeAtRet > 0 && (
              <div className="mb-2">
                Other income:{" "}
                <strong className="text-green-700">£{fmt(results.income.anyOtherIncomeAtRet)}</strong>
              </div>
            )}

            <div className="mb-2">
              State Pension (inflated):{" "}
              <strong className="text-green-700">£{fmt(results.income.statePensionAtRetNominal)}</strong>
              {results.spaWarning && (
                <div className="text-sm text-amber-600 italic ml-2">
                  Not included until age {Math.round(inputs.statePensionAge)}
                </div>
              )}
            </div>

            <div className="border-t-2 border-slate-300 pt-3 mt-3 font-bold text-lg">
              Gross income total: £{fmt(results.incomeGrossTotal)}
            </div>

            <div className="mt-3 text-red-700">
              Estimated income tax: <strong>£{fmt(results.estTax)}</strong>
            </div>

            <div className="border-t-2 border-slate-300 pt-3 mt-3 font-bold text-lg text-green-700">
              Net income: £{fmt(results.netIncome)}
            </div>

            <div className="border-t-2 border-slate-300 pt-3 mt-3 font-bold text-lg">
              Surplus / Deficit vs spend:{" "}
              <span className={results.surplusDeficit >= 0 ? "text-green-700" : "text-red-700"}>
                £{fmt(results.surplusDeficit)}
              </span>
            </div>

            {results.surplusDeficit < 0 && (
              <div className="mt-2 text-sm text-amber-700 bg-amber-50 p-3 rounded">
                Deficit will be funded from savings if available
              </div>
            )}
          </div>

          {/* Assets + Real Terms */}
          <div className="space-y-6">
            {/* Assets Card */}
            <div className="bg-white border-2 border-slate-200 rounded-lg p-6 print-avoid-break">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">
                Retirement Assets
              </h3>

              <div className="mb-2">
                DC pot (after PCLS & annuity):{" "}
                <strong className="text-blue-700">£{fmt(results.assets.dcPotForDrawdown)}</strong>
                {results.assets.dcPotForAnnuity > 0 && (
                  <div className="text-sm text-slate-600 ml-2">
                    (£{fmt(results.assets.dcPotForAnnuity)} used for annuity)
                  </div>
                )}
              </div>

              {results.assets.dcPclsCash > 0 && (
                <div className="mb-2">
                  DC tax-free cash:{" "}
                  <strong className="text-blue-700">£{fmt(results.assets.dcPclsCash)}</strong>
                </div>
              )}

              {results.assets.dbPclsCash > 0 && (
                <div className="mb-2">
                  DB tax-free cash:{" "}
                  <strong className="text-blue-700">£{fmt(results.assets.dbPclsCash)}</strong>
                </div>
              )}

              <div className="mb-2">
                ISA balance:{" "}
                <strong className="text-blue-700">£{fmt(results.assets.isaAtRet)}</strong>
              </div>

              <div className="mb-2">
                Taxable savings:{" "}
                <strong className="text-blue-700">£{fmt(results.assets.taxableAtRet)}</strong>
              </div>

              <div className="border-t-2 border-slate-300 pt-3 mt-3 font-bold text-lg text-blue-700">
                Total assets: £{fmt(results.assetsTotal)}
              </div>
            </div>

            {/* Real Terms Card */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-6 print-avoid-break">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">
                Real Terms (today's prices)
              </h3>

              <div className="mb-2">
                Gross income total (real):{" "}
                <strong>£{fmt(results.real.incomeGrossTotal)}</strong>
              </div>

              <div className="mb-2">
                After-tax income (real):{" "}
                <strong>£{fmt(results.real.netIncome)}</strong>
              </div>

              <div className="mb-2">
                Surplus/Deficit (real):{" "}
                <strong className={results.real.surplusDeficit >= 0 ? "text-green-700" : "text-red-700"}>
                  £{fmt(results.real.surplusDeficit)}
                </strong>
              </div>

              <div className="border-t-2 border-slate-300 pt-3 mt-3 font-bold text-lg">
                Total assets (real): £{fmt(results.real.assetsTotal)}
              </div>

              {results.yearsToRetirement > 0 && (
                <div className="mt-3 text-sm text-slate-600">
                  Deflated {results.yearsToRetirement.toFixed(2)} years at{" "}
                  {(inputs.inflationAssumption * 100).toFixed(1)}% p.a.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="mb-6 flex justify-end no-print">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>🖨️</span>
          <span>Print Summary Report</span>
        </button>
      </div>

      {/* Quick Modelling Sliders */}
      <div className="bg-white border-2 border-sky-200 rounded-lg p-6 mb-6 no-print">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Quick Modelling - Illustration</h3>
        <p className="text-sm text-slate-600 mb-4">
          Adjust the sliders below to preview how changes affect your results. Click "Apply to inputs"
          to save changes, or "Reset" to undo.
        </p>

        <div className="space-y-4">
          {results.yearsToRetirement > 0 && (
            <ModelRow
              label="Retirement age"
              fieldKey="inputs.retirementAge"
              currentValue={parseFloat(data.inputs?.retirementAge || 65)}
              min={55}
              max={75}
              step={1}
              model={model}
              setModel={setModel}
            />
          )}

          {results.yearsToRetirement > 0 && (
            <ModelRow
              label="DC pot (now)"
              fieldKey="dc.potNow"
              currentValue={parseFloat(data.dc?.potNow || 0)}
              min={0}
              max={500000}
              step={5000}
              model={model}
              setModel={setModel}
              prefix="£"
            />
          )}

          <ModelRow
            label="Drawdown rate"
            fieldKey="dc.drawdownRate"
            currentValue={parseFloat(data.dc?.drawdownRate || 0.04)}
            min={0}
            max={0.10}
            step={0.0025}
            model={model}
            setModel={setModel}
            suffix="%"
            displayMultiplier={100}
          />

          <ModelRow
            label="Inflation"
            fieldKey="inputs.inflation"
            currentValue={parseFloat(data.inputs?.inflation || 2.5)}
            min={0}
            max={10}
            step={0.5}
            model={model}
            setModel={setModel}
            suffix="%"
            decimalPlaces={1}
          />

          {results.yearsToRetirement > 0 && (
            <ModelRow
              label="DC growth"
              fieldKey="dc.growthAssumption"
              currentValue={parseFloat(data.dc?.growthAssumption || 0.04)}
              min={0}
              max={0.15}
              step={0.0025}
              model={model}
              setModel={setModel}
              suffix="%"
              displayMultiplier={100}
            />
          )}

          <ModelRow
            label="Desired spend"
            fieldKey="lifestyle.baselineAmount"
            currentValue={parseFloat(data.lifestyle?.baselineAmount || 0)}
            min={0}
            max={100000}
            step={1000}
            model={model}
            setModel={setModel}
            prefix="£"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={applyModelToForm}
            className="px-4 py-2 rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors font-medium"
          >
            Apply to inputs
          </button>
          <button
            type="button"
            onClick={resetModel}
            className="px-4 py-2 rounded-md border border-slate-400 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Reset all sliders
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
        <p className="text-sm text-blue-800">
          💡 <strong>Next steps:</strong> Continue to configure your post-retirement savings strategy
          and life events to see a detailed 25-year projection.
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
      <div className="mt-8 flex justify-end no-print">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Continue to Post-Retirement Events →
        </button>
      </div>
    </div>
  );
}

/**
 * ModelRow - Single row in the quick modelling slider section
 * Mobile-friendly with +/- buttons and responsive layout
 */
function ModelRow({
  label,
  fieldKey,
  currentValue,
  min,
  max,
  step,
  model,
  setModel,
  prefix = "",
  suffix = "",
  displayMultiplier = 1,
  decimalPlaces = null,
}) {
  const modelValue = model[fieldKey] !== undefined ? parseFloat(model[fieldKey]) : currentValue;

  const formatValue = (val) => {
    const num = val * displayMultiplier;
    // Determine decimal places: explicit prop, or auto-detect based on displayMultiplier
    const decimals = decimalPlaces !== null
      ? decimalPlaces
      : (displayMultiplier === 100 ? 2 : 0);
    return prefix + num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
  };

  const handleIncrement = () => {
    const newValue = Math.min(parseFloat(modelValue) + parseFloat(step), parseFloat(max));
    setModel((prev) => ({ ...prev, [fieldKey]: newValue.toString() }));
  };

  const handleDecrement = () => {
    const newValue = Math.max(parseFloat(modelValue) - parseFloat(step), parseFloat(min));
    setModel((prev) => ({ ...prev, [fieldKey]: newValue.toString() }));
  };

  const handleReset = () => {
    setModel((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  return (
    <div className="border-b border-slate-200 pb-4 mb-4 last:border-b-0">
      {/* Header: Label and values */}
      <div className="flex justify-between items-baseline mb-2">
        <div className="font-medium text-slate-700">{label}</div>
        <div className="text-sm text-slate-600">
          Current: <span className="font-medium">{formatValue(currentValue)}</span>
        </div>
      </div>

      {/* Desktop: Slider with +/- buttons */}
      <div className="hidden md:flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={modelValue <= min}
          className="px-3 py-2 text-lg font-bold rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease"
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={modelValue}
          onChange={(e) =>
            setModel((prev) => ({ ...prev, [fieldKey]: e.target.value }))
          }
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={modelValue >= max}
          className="px-3 py-2 text-lg font-bold rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase"
        >
          +
        </button>
        <div className="font-medium text-sky-700 w-32 text-right">{formatValue(modelValue)}</div>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 text-sm rounded-md border border-slate-400 text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Mobile: Large +/- buttons without slider */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={modelValue <= min}
            className="flex-1 px-4 py-3 text-2xl font-bold rounded-md border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <div className="font-bold text-xl text-sky-700">{formatValue(modelValue)}</div>
          </div>
          <button
            type="button"
            onClick={handleIncrement}
            disabled={modelValue >= max}
            className="flex-1 px-4 py-3 text-2xl font-bold rounded-md border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Increase"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="w-full px-3 py-2 text-sm rounded-md border border-slate-400 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          Reset to {formatValue(currentValue)}
        </button>
      </div>
    </div>
  );
}
