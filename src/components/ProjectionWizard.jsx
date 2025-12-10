// src/components/ProjectionWizard.jsx
// Integrated projection component for wizard mode

import React, { useMemo } from 'react';
import { calculateProjection, extractWarnings } from '../logic/projection';
import ProjectionInputs from './ProjectionInputs';
import LifeEvents from './LifeEvents';
import ProjectionTable from './ProjectionTable';
import ProjectionCharts from './ProjectionCharts';
import { formatCurrency } from '../utils/money';
import { estimateIncomeTax, TAX_2025_EWNI, TAX_2025_SCOTLAND } from '../utils/tax';
import {
  ConversationalContainer,
  ProgressIndicator,
  Question,
  HelpText,
} from './ConversationalComponents.jsx';

/**
 * ProjectionWizard - Displays 25-year projection integrated into wizard flow
 * No duplicate at-retirement summary, no duplicate drawdown slider
 */
export default function ProjectionWizard({
  openingValues,
  isaRecurringAmount,
  setIsaRecurringAmount,
  isaRecurringYears,
  setIsaRecurringYears,
  dcDrawdownPercent,
  setDcDrawdownPercent,
  lifeEvents,
  setLifeEvents,
  helpVisibility,
  setHelpVisibility,
  onBack,
  navigate,
}) {
  // Calculate correct opening tax based on actual gross income
  // Uses openingValues.dcDrawdownPercent to match at-retirement calculation exactly
  const openingTaxCorrect = useMemo(() => {
    try {
      if (!openingValues) {
        console.log('🔍 No openingValues yet');
        return 0;
      }

      // Debug: Log opening values to diagnose NaN issue
      console.log('🔍 ProjectionWizard openingValues:', {
        dcPotAfterPCLS: openingValues.dcPotAfterPCLS,
        dcDrawdownPercent: openingValues.dcDrawdownPercent,
        dbPension: openingValues.dbPension,
        annuityIncome: openingValues.annuityIncome,
        statePension: openingValues.statePension,
        otherIncome: openingValues.otherIncome,
        taxRegion: openingValues.taxRegion,
      });

      // Defensive check: ensure dcDrawdownPercent is a valid number
      const drawdownPercent = typeof openingValues.dcDrawdownPercent === 'number'
        ? openingValues.dcDrawdownPercent
        : parseFloat(openingValues.dcDrawdownPercent) || 4.0;

      console.log('🔍 Calculated drawdownPercent:', drawdownPercent);

      const dcDrawdownAmount = openingValues.dcPotAfterPCLS * (drawdownPercent / 100);
      console.log('🔍 DC Drawdown Amount:', dcDrawdownAmount);

    const statePensionAmount = openingValues.retirementAge >= openingValues.statePensionAge
      ? openingValues.statePension
      : 0;
    console.log('🔍 State Pension Amount:', statePensionAmount);

    // Calculate total pensionable income
    const pensionableIncome =
      (openingValues.dbPension || 0) +
      (openingValues.annuityIncome || 0) +
      statePensionAmount +
      (openingValues.otherIncome || 0) +
      dcDrawdownAmount;

    console.log('🔍 Total Pensionable Income:', pensionableIncome);

    // Get the correct tax configuration
    const cfg = openingValues.taxRegion === 'scotland' ? TAX_2025_SCOTLAND : TAX_2025_EWNI;
    console.log('🔍 Tax Config:', cfg ? 'Valid' : 'INVALID');

    // Calculate tax
    const taxResult = estimateIncomeTax({
      pensionableIncome,
      savingsInterest: 0,
      cfg,
    });

    console.log('🔍 Calculated Tax Result:', taxResult);

    // estimateIncomeTax returns an object {tax, personalAllowanceUsed, psaUsed}
    return taxResult.tax;
    } catch (error) {
      console.error('❌ Error calculating tax:', error);
      console.error('❌ Error stack:', error.stack);
      return 0;
    }
  }, [openingValues]);

  // Calculate projection
  const projectionResults = useMemo(() => {
    if (!openingValues) return null;

    return calculateProjection(openingValues, {
      isaRecurringAmount: parseFloat(isaRecurringAmount) || 0,
      isaRecurringYears: parseFloat(isaRecurringYears) || 0,
      dcDrawdownPercent: parseFloat(dcDrawdownPercent) || 4.0,
      lifeEvents,
    });
  }, [openingValues, isaRecurringAmount, isaRecurringYears, dcDrawdownPercent, lifeEvents]);

  const warnings = useMemo(() => {
    if (!projectionResults) return [];
    return extractWarnings(projectionResults);
  }, [projectionResults]);

  if (!openingValues) {
    return <div>Loading projection data...</div>;
  }

  return (
    <ConversationalContainer>
      <ProgressIndicator
        currentStep={6}
        totalSteps={6}
        stepTitle="25-Year Projection"
      />

      <Question>Your 25-Year Retirement Projection</Question>

      <HelpText>
        Based on your at-retirement position, let's project forward 25 years to see how your
        assets evolve and whether your income covers your spending.
      </HelpText>

      {/* Financial Summary Box */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '2px solid #bfdbfe',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
          Opening Position (Age {openingValues.retirementAge})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Total Assets</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
              {formatCurrency(
                openingValues.dcPotAfterPCLS +
                openingValues.isaSavings +
                openingValues.taxableSavings
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Gross Income</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
              {formatCurrency(
                openingValues.dbPension +
                openingValues.annuityIncome +
                (openingValues.retirementAge >= openingValues.statePensionAge ? openingValues.statePension : 0) +
                openingValues.otherIncome +
                (openingValues.dcPotAfterPCLS * ((typeof openingValues.dcDrawdownPercent === 'number' ? openingValues.dcDrawdownPercent : parseFloat(openingValues.dcDrawdownPercent) || 4.0) / 100))
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Income Tax</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
              {formatCurrency(openingTaxCorrect)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Net Income</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>
              {formatCurrency(
                openingValues.dbPension +
                openingValues.annuityIncome +
                (openingValues.retirementAge >= openingValues.statePensionAge ? openingValues.statePension : 0) +
                openingValues.otherIncome +
                (openingValues.dcPotAfterPCLS * ((typeof openingValues.dcDrawdownPercent === 'number' ? openingValues.dcDrawdownPercent : parseFloat(openingValues.dcDrawdownPercent) || 4.0) / 100)) -
                openingTaxCorrect
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projection Inputs - NO duplicate drawdown slider */}
      <div style={{
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
          Additional Savings During Retirement
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#475569',
            marginBottom: '8px',
          }}>
            ISA top-ups per year
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>
              (optional - if you plan to add to ISA during retirement)
            </span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
            <input
              type="text"
              value={isaRecurringAmount}
              onChange={(e) => setIsaRecurringAmount(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 5000"
              style={{
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                width: '160px',
              }}
            />
            <span style={{ fontSize: '16px', color: '#64748b' }}>per year for</span>
            <input
              type="text"
              value={isaRecurringYears}
              onChange={(e) => setIsaRecurringYears(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 10"
              style={{
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                width: '100px',
              }}
            />
            <span style={{ fontSize: '16px', color: '#64748b' }}>years</span>
          </div>
        </div>

        <div style={{
          fontSize: '12px',
          color: '#64748b',
          backgroundColor: '#f0f9ff',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #bae6fd',
        }}>
          💡 <strong>Note:</strong> You can adjust DC drawdown percentage using the slider in the
          "Results & Modeling" section (Step 5). The projection updates automatically.
        </div>
      </div>

      {/* Lifestyle Events */}
      <div style={{ marginBottom: '24px' }}>
        <LifeEvents
          currentAge={openingValues.retirementAge}
          retirementAge={openingValues.retirementAge + 25}
          events={lifeEvents}
          setEvents={setLifeEvents}
          helpVisibility={helpVisibility}
          setHelpVisibility={setHelpVisibility}
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #fca5a5',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#991b1b' }}>
            ⚠️ Asset Depletion Warnings
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#dc2626' }}>
            {warnings.map((w, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>
                <strong>Age {w.age}:</strong> {w.messages.join(', ')}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '16px', fontSize: '14px', color: '#991b1b' }}>
            💡 Consider: Reducing spending, adjusting drawdown %, or modifying life events
          </div>
        </div>
      )}

      {/* Results Section */}
      {projectionResults && (
        <>
          <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            backgroundColor: 'white',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                Projection Charts
              </div>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>
            <ProjectionCharts data={projectionResults} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <ProjectionTable data={projectionResults} />
          </div>
        </>
      )}

      {/* Navigation buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: '500',
            color: '#374151',
            backgroundColor: 'white',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          ← Back to Results
        </button>
        <button
          type="button"
          onClick={() => {
            if (navigate) {
              navigate('/');
            }
          }}
          style={{
            flex: 1,
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            backgroundColor: '#16a34a',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          ✓ Complete Planning Session
        </button>
      </div>
    </ConversationalContainer>
  );
}
