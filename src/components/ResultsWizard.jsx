// src/components/ResultsWizard.jsx
// Conversational wizard for Results & Modelling section

import React, { useState } from "react";
import {
  ConversationalContainer,
  Question,
  HelpText,
  SummaryCard,
} from "./ConversationalComponents.jsx";

/**
 * ResultsWizard - Conversational display of at-retirement results with interactive modeling
 */
export default function ResultsWizard({
  results, // From atRetirement() calculation
  form,
  dbSchemes,
  model,
  setModel,
  applyModelToForm, // Function to apply slider changes permanently
  inputsNum,
  navigate,
  saveAutosave,
  loadAutosave,
  onEditSection, // Function to navigate to specific wizard step
  fmt,
  N,
}) {
  const [showIncome, setShowIncome] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);

  // Traffic light color based on surplus/deficit
  const getStatusColor = (surplus) => {
    if (surplus >= 5000) return { bg: '#d1fae5', border: '#10b981', text: '#065f46' }; // Green
    if (surplus >= 0) return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }; // Amber
    return { bg: '#fff7ed', border: '#f97316', text: '#9a3412' }; // Softer orange instead of red
  };

  const getStatusMessage = (surplus) => {
    if (surplus >= 5000) return '✓ You\'re on track for a comfortable retirement';
    if (surplus >= 0) return '⚠ Your income covers your spending, but there\'s little buffer';
    return 'Let\'s explore some options to improve your retirement position';
  };

  // Generate contextual suggestions for deficit situations
  const getSuggestions = () => {
    const suggestions = [];
    const deficit = Math.abs(results.surplusDeficit);
    const retirementAge = N(getModelValue('retirementAge'));
    const statePensionAge = N(form.statePensionAge);
    const hasStatePension = results.income.statePensionAtRetNominal > 0;
    const hasSavings = results.assetsTotal > 0;
    const spending = N(getModelValue('desiredSpendAnnual'));

    // Suggestion 1: Retire at SPA if currently before it
    if (results.spaWarning && hasStatePension) {
      const statePensionAmount = results.income.statePensionAtRetNominal;
      suggestions.push({
        icon: '📅',
        title: 'Retire at your State Pension Age',
        description: `Moving your retirement to age ${statePensionAge} would add £${fmt(statePensionAmount)} annual state pension to your income, potentially covering the £${fmt(deficit)} shortfall.`,
        action: 'Adjust retirement age slider below',
      });
    }

    // Suggestion 2: Use savings to bridge the gap
    if (hasSavings && deficit > 0) {
      suggestions.push({
        icon: '💰',
        title: 'Bridge with savings',
        description: `Your £${fmt(results.assetsTotal)} in assets could help bridge the £${fmt(deficit)} annual shortfall${results.spaWarning ? ' until state pension begins' : ' in early retirement'}.`,
        action: results.spaWarning ? 'Consider retiring closer to State Pension Age' : 'Monitor spending carefully',
      });
    }

    // Suggestion 3: Reduce spending target
    if (spending > 20000) {
      const reducedSpending = spending - deficit;
      suggestions.push({
        icon: '🎯',
        title: 'Adjust your spending target',
        description: `Reducing your target from £${fmt(spending)} to £${fmt(reducedSpending)} per year would balance your budget.`,
        action: 'Use the spending slider below to explore',
      });
    }

    // Suggestion 4: Increase DC contributions (if still contributing)
    if (form.dcIsContributing && results.yearsToRetirement > 5) {
      suggestions.push({
        icon: '📈',
        title: 'Boost your pension savings',
        description: `You have ${results.yearsToRetirement.toFixed(1)} years until retirement. Increasing contributions now could significantly improve your position.`,
        action: 'Use "Edit Your Details" menu below to adjust your contributions',
      });
    }

    // Suggestion 5: Delay retirement
    if (results.yearsToRetirement < 15) {
      suggestions.push({
        icon: '⏰',
        title: 'Delay retirement by 1-2 years',
        description: 'Working longer gives your pension more time to grow and reduces the number of years you need to fund.',
        action: 'Try adjusting retirement age in the slider below',
      });
    }

    return suggestions;
  };

  // Use model values if set, otherwise use form values (must be defined before getSuggestions)
  const getModelValue = (key) => model[key] ?? form[key];

  const statusColors = getStatusColor(results.surplusDeficit);
  const statusMessage = getStatusMessage(results.surplusDeficit);
  const suggestions = results.surplusDeficit < 0 ? getSuggestions() : [];

  return (
    <ConversationalContainer>
      <Question>Your retirement snapshot</Question>

      <HelpText>
        Here's what your retirement looks like based on the information you've provided.
        Use the modeling sliders below to explore different scenarios.
      </HelpText>

      {/* Income vs Expenditure Visual Bar */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
          Annual Income vs Spending
        </div>

        {/* Bars */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
            Net income: £{fmt(results.netIncome)}
          </div>
          <div style={{
            width: '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            height: '32px',
          }}>
            <div style={{
              width: `${Math.min(100, (results.netIncome / Math.max(results.netIncome, N(getModelValue('desiredSpendAnnual')))) * 100)}%`,
              height: '100%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              {results.netIncome > 0 && `£${fmt(results.netIncome)}`}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
            Desired spending: £{fmt(N(getModelValue('desiredSpendAnnual')))}
          </div>
          <div style={{
            width: '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            height: '32px',
          }}>
            <div style={{
              width: `${Math.min(100, (N(getModelValue('desiredSpendAnnual')) / Math.max(results.netIncome, N(getModelValue('desiredSpendAnnual')))) * 100)}%`,
              height: '100%',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              {N(getModelValue('desiredSpendAnnual')) > 0 && `£${fmt(N(getModelValue('desiredSpendAnnual')))}`}
            </div>
          </div>
        </div>

        {/* Surplus/Deficit */}
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '16px',
          fontWeight: '600',
          color: results.surplusDeficit >= 0 ? '#10b981' : '#f97316',
        }}>
          {results.surplusDeficit >= 0 ? 'Surplus' : 'Deficit'}: £{fmt(Math.abs(results.surplusDeficit))}
        </div>
      </div>

      {/* Collapsible Income Breakdown */}
      <CollapsibleCard
        title="Income Breakdown (first year of retirement)"
        isExpanded={showIncome}
        onToggle={() => setShowIncome(!showIncome)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DetailRow label="DC pension income" value={`£${fmt(results.income.dcIncome)}`} />
          {results.income.dcAnnuityIncome > 0 && results.income.dcDrawdownIncome > 0 && (
            <>
              <DetailRow label="  └─ Annuity income" value={`£${fmt(results.income.dcAnnuityIncome)}`} indent />
              <DetailRow label="  └─ Drawdown income" value={`£${fmt(results.income.dcDrawdownIncome)}`} indent />
            </>
          )}
          <DetailRow label="DB pension income" value={`£${fmt(results.income.dbIncomeAfter)}`} />
          {results.income.statePensionForIncome > 0 && (
            <DetailRow label="State pension" value={`£${fmt(results.income.statePensionAtRetNominal)}`} />
          )}
          {results.spaWarning && (
            <DetailRow
              label="State pension"
              value={`£${fmt(results.income.statePensionAtRetNominal)} (not yet at SPA)`}
              muted
            />
          )}
          {results.income.otherIncomeAtRet > 0 && (
            <DetailRow label="Other income" value={`£${fmt(results.income.otherIncomeAtRet)}`} />
          )}
          <DetailRow label="Gross income total" value={`£${fmt(results.incomeGrossTotal)}`} bold />
          <DetailRow label="Income tax" value={`£${fmt(results.estTax)}`} />
          <DetailRow label="Net income" value={`£${fmt(results.netIncome)}`} bold highlight />
        </div>
      </CollapsibleCard>

      {/* Collapsible Assets Breakdown */}
      <CollapsibleCard
        title="Assets at Retirement"
        isExpanded={showAssets}
        onToggle={() => setShowAssets(!showAssets)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DetailRow label="DC pot (after tax-free cash)" value={`£${fmt(results.assets.dcPotForDrawdown)}`} />
          {results.assets.dcPotForAnnuity > 0 && (
            <DetailRow
              label="  (Annuity purchase)"
              value={`£${fmt(results.assets.dcPotForAnnuity)}`}
              indent
              muted
            />
          )}
          {results.assets.dcPclsCash > 0 && (
            <DetailRow label="DC tax-free cash" value={`£${fmt(results.assets.dcPclsCash)}`} />
          )}
          {results.assets.dbPclsCash > 0 && (
            <DetailRow label="DB tax-free cash" value={`£${fmt(results.assets.dbPclsCash)}`} />
          )}
          <DetailRow label="ISA balance" value={`£${fmt(results.assets.isaAtRet)}`} />
          <DetailRow label="Taxable savings" value={`£${fmt(results.assets.taxableAtRet)}`} />
          <DetailRow label="Total assets" value={`£${fmt(results.assetsTotal)}`} bold highlight />
        </div>
      </CollapsibleCard>

      {/* Real Terms Card */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '2px solid #bfdbfe',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#1e40af' }}>
          In Today's Money
        </div>
        <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '16px' }}>
          Adjusted for {(N(getModelValue('inflationAssumption')) * 100).toFixed(1)}% annual inflation over {results.yearsToRetirement.toFixed(1)} years
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px', color: '#1e40af' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Net income:</span>
            <strong>£{fmt(results.real.netIncome)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total assets:</span>
            <strong>£{fmt(results.real.assetsTotal)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Surplus/Deficit:</span>
            <strong>£{fmt(results.real.surplusDeficit)}</strong>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div style={{
        backgroundColor: statusColors.bg,
        border: `3px solid ${statusColors.border}`,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: statusColors.text,
          marginBottom: '12px',
        }}>
          {statusMessage}
        </div>
        <div style={{
          fontSize: '16px',
          color: statusColors.text,
          lineHeight: '1.6',
        }}>
          In {results.yearsToRetirement.toFixed(1)} years, at age {N(getModelValue('retirementAge'))},
          you'll have £{fmt(results.assetsTotal)} in total assets and
          £{fmt(results.netIncome)} annual income after tax.
        </div>
      </div>

      {/* Suggestions (only show if deficit) */}
      {suggestions.length > 0 && (
        <div style={{
          backgroundColor: '#fefce8',
          border: '2px solid #fde047',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#854d0e',
          }}>
            💡 Ways to improve your position
          </div>
          {suggestions.map((suggestion, idx) => (
            <div key={idx} style={{
              marginBottom: idx < suggestions.length - 1 ? '16px' : '0',
              paddingBottom: idx < suggestions.length - 1 ? '16px' : '0',
              borderBottom: idx < suggestions.length - 1 ? '1px solid #fde047' : 'none',
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#713f12', marginBottom: '4px' }}>
                {suggestion.icon} {suggestion.title}
              </div>
              <div style={{ fontSize: '14px', color: '#854d0e', marginBottom: '4px' }}>
                {suggestion.description}
              </div>
              <div style={{ fontSize: '13px', color: '#a16207', fontStyle: 'italic' }}>
                → {suggestion.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Modeling Sliders */}
      <ModelingSliders
        form={form}
        model={model}
        setModel={setModel}
        applyModelToForm={applyModelToForm}
        fmt={fmt}
        N={N}
      />

      {/* Save Message */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '2px solid #0284c7',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        fontSize: '15px',
        color: '#0369a1',
        textAlign: 'center',
      }}>
        💾 <strong>Save your progress</strong> - see top menu bar
      </div>

      {/* Navigation with Section Selector */}
      <div style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
      }}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowEditMenu(!showEditMenu)}
            style={{
              width: '100%',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'white',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            ✏️ Edit Your Details
            <span style={{ fontSize: '20px' }}>{showEditMenu ? '▲' : '▼'}</span>
          </button>

          {showEditMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: '8px',
              backgroundColor: 'white',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}>
              <EditMenuItem
                label="Core Assumptions"
                description="Age, retirement date, tax region"
                onClick={() => onEditSection(0)}
              />
              <EditMenuItem
                label="DC Pensions"
                description="Pension pots, contributions, withdrawal"
                onClick={() => onEditSection(1)}
              />
              <EditMenuItem
                label="DB Pensions"
                description="Final salary schemes"
                onClick={() => onEditSection(2)}
              />
              <EditMenuItem
                label="Savings & Other Income"
                description="ISAs, savings, rental income"
                onClick={() => onEditSection(3)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Next Step Button - 25-Year Projection */}
      <div style={{
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
      }}>
        <button
          type="button"
          onClick={() => {
            // Save immediately before navigating (don't wait for debounce)
            saveAutosave({
              form,
              dbSchemes,
              model,
              atRetirement: {
                yearsToRetirement: results.yearsToRetirement,
                netIncome: results.netIncome,
                incomeGrossTotal: results.incomeGrossTotal,
                assetsTotal: results.assetsTotal,
              },
            });

            // Check sessionStorage for the latest desiredSpendAnnual (may have been updated by lifestyle calculator)
            const latestData = loadAutosave();
            const latestSpend = latestData?.form?.desiredSpendAnnual
              ? N(latestData.form.desiredSpendAnnual)
              : inputsNum.desiredSpendAnnual;

            navigate('/projection', {
              state: {
                openingValues: {
                  retirementAge: inputsNum.retirementAge,
                  dcPotAfterPCLS: results.assets.dcPotForDrawdown, // Only drawdown pot (after annuity purchase)
                  isaSavings: results.assets.isaAtRet,
                  taxableSavings: results.assets.taxableAtRet + results.assets.dcPclsCash + results.assets.dbPclsCash,
                  dbPension: results.income.dbIncomeAfter,
                  annuityIncome: results.income.dcAnnuityIncome, // Annuity income from annuitized portion
                  statePension: results.income.statePensionAtRetNominal,
                  statePensionAge: inputsNum.statePensionAge,
                  propertyIncome: results.income.propertyIncomeAtRet, // Property income (separate for future tax differentiation)
                  dividendIncome: results.income.dividendIncomeAtRet, // Dividend income (separate for future tax differentiation)
                  anyOtherIncome: results.income.anyOtherIncomeAtRet, // Any other income (separate for future tax differentiation)
                  otherIncome: results.income.otherIncomeAtRet, // Total other income (for backward compatibility)
                  annualSpend: latestSpend, // Use latest value from sessionStorage
                  incomeTax: results.estTax,
                  inflation: inputsNum.inflationAssumption * 100,
                  dcGrowth: inputsNum.growthAssumption * 100,
                  isaGrowth: inputsNum.isaRate * 100,
                  savingsGrowth: inputsNum.taxableSavingsRate * 100,
                  taxRegion: inputsNum.region === 'Scotland' ? 'scotland' : 'england',
                  dcDrawdownPercent: inputsNum.drawdownRate * 100,
                  yearsToRetirement: results.yearsToRetirement,
                }
              }
            });
          }}
          style={{
            width: '100%',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            backgroundColor: '#0284c7',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Continue to 25-Year Projection →
        </button>
      </div>
    </ConversationalContainer>
  );
}

/**
 * CollapsibleCard - Expandable card for detailed breakdowns
 */
function CollapsibleCard({ title, isExpanded, onToggle, children }) {
  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: isExpanded ? '16px' : '0',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '24px', color: '#64748b' }}>
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {isExpanded && children}
    </div>
  );
}

/**
 * DetailRow - Single row in breakdown
 */
function DetailRow({ label, value, bold, highlight, indent, muted }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '15px',
      color: muted ? '#94a3b8' : '#374151',
      fontWeight: bold ? '600' : '400',
      ...(highlight ? {
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
      } : {}),
    }}>
      <span style={{ paddingLeft: indent ? '16px' : '0' }}>{label}</span>
      <span style={{ fontWeight: bold ? '600' : '500' }}>{value}</span>
    </div>
  );
}

/**
 * EditMenuItem - Single item in edit section menu
 */
function EditMenuItem({ label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px',
        border: 'none',
        borderBottom: '1px solid #e5e7eb',
        background: 'white',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.2s ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
    >
      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        {description}
      </div>
    </button>
  );
}

/**
 * ModelingSliders - Interactive sliders for exploring scenarios
 */
function ModelingSliders({ form, model, setModel, applyModelToForm, fmt, N }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getModelValue = (key) => model[key] ?? form[key];

  const sliders = [
    {
      label: 'Retirement age',
      key: 'retirementAge',
      min: 55,
      max: 75,
      step: 0.5,
      format: (v) => `${v}`,
    },
    {
      label: 'Investment growth',
      key: 'growthAssumption',
      min: 0,
      max: 0.15,
      step: 0.0025,
      format: (v) => `${(v * 100).toFixed(2)}%`,
    },
    {
      label: 'Inflation',
      key: 'inflationAssumption',
      min: 0,
      max: 0.10,
      step: 0.0025,
      format: (v) => `${(v * 100).toFixed(2)}%`,
    },
    {
      label: 'Drawdown rate',
      key: 'drawdownRate',
      min: 0,
      max: 0.10,
      step: 0.0025,
      format: (v) => `${(v * 100).toFixed(2)}%`,
    },
    {
      label: 'Desired spending',
      key: 'desiredSpendAnnual',
      min: 0,
      max: 100000,
      step: 1000,
      format: (v) => `£${fmt(v)}`,
    },
  ];

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    }}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e293b',
        }}
      >
        <span>🎛️ Explore Different Scenarios</span>
        <span style={{ fontSize: '24px', color: '#64748b' }}>
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {isExpanded && (
        <>
          <div style={{
            fontSize: '14px',
            color: '#64748b',
            marginTop: '12px',
            marginBottom: '20px',
          }}>
            Adjust the sliders below to see how changes affect your retirement.
            Changes update immediately and show in the results above.
          </div>

          {sliders.map(slider => (
            <div key={slider.key} style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '15px',
              }}>
                <span style={{ color: '#374151', fontWeight: '500' }}>
                  {slider.label}
                </span>
                <span style={{ color: '#0284c7', fontWeight: '600' }}>
                  {slider.format(N(getModelValue(slider.key)))}
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={N(getModelValue(slider.key))}
                onChange={(e) => setModel(prev => ({ ...prev, [slider.key]: e.target.value }))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setModel({})}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#64748b',
                backgroundColor: 'white',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Reset All
            </button>
            <button
              type="button"
              onClick={() => {
                applyModelToForm();
                setIsExpanded(false);
              }}
              style={{
                flex: 1,
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: '#10b981',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Apply Changes
            </button>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#1e40af',
          }}>
            <strong>Tip:</strong> Use sliders to explore scenarios. Click "Apply Changes" to make them permanent, or continue exploring.
          </div>
        </>
      )}
    </div>
  );
}
