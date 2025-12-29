// src/components/AtRetirementResults.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, TotalLine, MiniHelp, Section } from "./common";
import { calculateProjection, extractWarnings } from '../logic/projection';
import ProjectionTable from './ProjectionTable';
import ProjectionCharts from './ProjectionCharts';
import LifeEvents from './LifeEvents';
import { formatCurrency } from '../utils/money';

/**
 * AtRetirementResults - Displays the calculated at-retirement summary,
 * assets, real terms, projection button, and quick modelling sliders
 */
export default function AtRetirementResults({
  // Calculation results
  yearsToRetirement,
  income,
  assets,
  assetsTotal,
  incomeGrossTotal,
  estTax,
  netIncome,
  surplusDeficit,
  real,
  spaWarning,

  // Form state
  form,
  inputsNum,
  dbSchemes,

  // Quick modelling
  model,
  setModel,
  applyModelToForm,
  resetModel,
  open,
  toggle,

  // Projection state (passed from parent)
  isaRecurringAmount,
  setIsaRecurringAmount,
  isaRecurringYears,
  setIsaRecurringYears,
  dcDrawdownPercent,
  setDcDrawdownPercent,
  lifeEvents,
  setLifeEvents,

  // Utilities
  fmt,
  N,
  saveAutosave,
  loadAutosave,
}) {
  const navigate = useNavigate();

  // Local projection UI state
  const [showProjection, setShowProjection] = useState(false);
  const [helpVisibility, setHelpVisibility] = useState({});

  // Build opening values for projection
  const openingValues = useMemo(() => ({
    retirementAge: inputsNum.retirementAge,
    dcPotAfterPCLS: assets.dcPotForDrawdown,
    isaSavings: assets.isaAtRet,
    taxableSavings: assets.taxableAtRet + assets.dcPclsCash + assets.dbPclsCash,
    dbPension: income.dbIncomeAfter,
    annuityIncome: income.dcAnnuityIncome,
    statePension: income.statePensionAtRetNominal,
    statePensionAge: inputsNum.statePensionAge,
    propertyIncome: income.propertyIncomeAtRet,
    dividendIncome: income.dividendIncomeAtRet,
    anyOtherIncome: income.anyOtherIncomeAtRet,
    otherIncome: income.otherIncomeAtRet,
    annualSpend: inputsNum.desiredSpendAnnual,
    incomeTax: estTax,
    inflation: inputsNum.inflationAssumption * 100,
    dcGrowth: inputsNum.growthAssumption * 100,
    isaGrowth: inputsNum.isaRate * 100,
    savingsGrowth: inputsNum.taxableSavingsRate * 100,
    taxRegion: inputsNum.region === 'Scotland' ? 'scotland' : 'england',
    dcDrawdownPercent: inputsNum.drawdownRate * 100,
    yearsToRetirement,
  }), [inputsNum, income, assets, estTax, yearsToRetirement]);

  // Calculate projection when shown
  const projectionResults = useMemo(() => {
    if (!showProjection) return null;

    return calculateProjection(openingValues, {
      isaRecurringAmount: parseFloat(isaRecurringAmount) || 0,
      isaRecurringYears: parseFloat(isaRecurringYears) || 0,
      dcDrawdownPercent: parseFloat(dcDrawdownPercent) || 4.0,
      lifeEvents,
    });
  }, [showProjection, openingValues, isaRecurringAmount, isaRecurringYears, dcDrawdownPercent, lifeEvents]);

  const warnings = useMemo(() => {
    if (!projectionResults) return [];
    return extractWarnings(projectionResults);
  }, [projectionResults]);

  return (
    <div className="print-page">
      <section>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1e293b", marginBottom: 16 }}>
          {form.alreadyRetired ? "Current Position" : "At-Retirement Summary"}
        </h2>
        {!form.alreadyRetired && (
          <div style={{ marginBottom: 8, fontSize: "16px" }}>
            Years to retirement: <strong>{yearsToRetirement.toFixed(2)}</strong>
          </div>
        )}

        <div className="grid-2">
          {/* Income card */}
          <Card title={form.alreadyRetired ? "Current Annual Income" : "Retirement Income (first year)"}>
            {/* Show blended DC income breakdown if using both strategies */}
            {income.dcAnnuityIncome > 0 && income.dcDrawdownIncome > 0 ? (
              <>
                <div>
                  DC Annuity income:{" "}
                  <strong>£{fmt(income.dcAnnuityIncome)}</strong>
                  <span style={{ fontSize: "13px", color: "#64748b", marginLeft: 6 }}>
                    ({inputsNum.dcAnnuityPct}% of pot)
                  </span>
                </div>
                <div>
                  DC Drawdown income:{" "}
                  <strong>£{fmt(income.dcDrawdownIncome)}</strong>
                  <span style={{ fontSize: "13px", color: "#64748b", marginLeft: 6 }}>
                    ({(100 - inputsNum.dcAnnuityPct).toFixed(0)}% of pot)
                  </span>
                </div>
                <div style={{ marginLeft: 16, fontSize: "14px", color: "#64748b" }}>
                  Total DC: £{fmt(income.dcIncome)}
                </div>
              </>
            ) : (
              <div>
                DC income ({income.dcAnnuityIncome > 0 ? "annuity" : "drawdown"}):{" "}
                <strong>£{fmt(income.dcIncome)}</strong>
              </div>
            )}
            <div>
              DB income {form.takeDBTaxFree25 ? "(after PCLS)" : ""}:{" "}
              <strong>£{fmt(income.dbIncomeAfter)}</strong>
            </div>
            {/* Other Income: Show breakdown if any category has value */}
            {income.propertyIncomeAtRet > 0 || income.dividendIncomeAtRet > 0 || income.anyOtherIncomeAtRet > 0 ? (
              <>
                {income.propertyIncomeAtRet > 0 && (
                  <div style={{ fontSize: "14px" }}>
                    Property income: <strong>£{fmt(income.propertyIncomeAtRet)}</strong>
                  </div>
                )}
                {income.dividendIncomeAtRet > 0 && (
                  <div style={{ fontSize: "14px" }}>
                    Dividend income: <strong>£{fmt(income.dividendIncomeAtRet)}</strong>
                  </div>
                )}
                {income.anyOtherIncomeAtRet > 0 && (
                  <div style={{ fontSize: "14px" }}>
                    Any other income: <strong>£{fmt(income.anyOtherIncomeAtRet)}</strong>
                  </div>
                )}
                {income.otherIncomeAtRet > 0 && (
                  <div style={{ marginLeft: 16, fontSize: "14px", color: "#64748b" }}>
                    Total other income: £{fmt(income.otherIncomeAtRet)}
                  </div>
                )}
              </>
            ) : (
              <div>
                Other income: <strong>£{fmt(income.otherIncomeAtRet)}</strong>
              </div>
            )}
            <div>
              State Pension (inflated):{" "}
              <strong>£{fmt(income.statePensionAtRetNominal)}</strong>
              {spaWarning && (
                <>
                  {" "}
                  <em>— not included in totals until SPA {inputsNum.statePensionAge}</em>
                </>
              )}
            </div>
            <div
              style={{
                borderTop: "1px solid #e7e7e7",
                paddingTop: 8,
                marginTop: 8,
                fontWeight: 700,
              }}
            >
              Gross income total: £{fmt(incomeGrossTotal)}
            </div>
            <div style={{ marginTop: 6 }}>
              Estimated income tax: <strong>£{fmt(estTax)}</strong>
            </div>
            <div
              style={{
                borderTop: "1px solid #e7e7e7",
                paddingTop: 8,
                marginTop: 8,
                fontWeight: 700,
              }}
            >
              Net income: £{fmt(netIncome)}
            </div>
            <div
              style={{
                borderTop: "1px solid #e7e7e7",
                paddingTop: 8,
                marginTop: 8,
                fontWeight: 700,
              }}
            >
              Surplus / Deficit vs spend: £{fmt(surplusDeficit)}
            </div>
            {surplusDeficit < 0 && (
              <MiniHelp>
                Any initial deficit will be funded from savings if available
              </MiniHelp>
            )}
          </Card>

          {/* Assets + Real terms */}
          <div className="grid" style={{ gap: 16 }}>
            <Card title={form.alreadyRetired ? "Current Assets" : "Retirement Assets (at retirement)"}>
              <div>
                {form.alreadyRetired ? "Current DC pot" : "DC pot (after PCLS & annuity purchase)"}:{" "}
                <strong>£{fmt(assets.dcPotForDrawdown)}</strong>
                {assets.dcPotForAnnuity > 0 && (
                  <span style={{ fontSize: "13px", color: "#64748b", marginLeft: 6 }}>
                    (£{fmt(assets.dcPotForAnnuity)} used to purchase annuity)
                  </span>
                )}
              </div>
              {!form.alreadyRetired && assets.dcPclsCash > 0 && (
                <div>
                  DC tax-free cash: <strong>£{fmt(assets.dcPclsCash)}</strong>
                </div>
              )}
              {!form.alreadyRetired && assets.dbPclsCash > 0 && (
                <div>
                  DB tax-free cash: <strong>£{fmt(assets.dbPclsCash)}</strong>
                </div>
              )}
              <div>
                ISA balance: <strong>£{fmt(assets.isaAtRet)}</strong>
              </div>
              <div>
                Taxable savings balance:{" "}
                <strong>£{fmt(assets.taxableAtRet)}</strong>
              </div>
              <TotalLine label="Total assets" value={assetsTotal} fmt={fmt} />
            </Card>

            <Card title="Real terms (today's prices)">
              <div>
                Gross income total (real):{" "}
                <strong>£{fmt(real.incomeGrossTotal)}</strong>
              </div>
              <div>
                After-tax income (real):{" "}
                <strong>£{fmt(real.netIncome)}</strong>
              </div>
              <div>
                Surplus/Deficit (real):{" "}
                <strong>£{fmt(real.surplusDeficit)}</strong>
              </div>
              <TotalLine label="Assets total (real)" value={real.assetsTotal} fmt={fmt} />
              {!form.alreadyRetired && (
                <MiniHelp>
                  Deflated {yearsToRetirement.toFixed(2)} year(s) at{" "}
                  {(inputsNum.inflationAssumption * 100).toFixed(1)}% p.a.
                </MiniHelp>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* PROJECTION SECTION */}
      <section className="card" style={{ marginTop: 24, marginBottom: 12 }}>
        <div
          className="card-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>25-Year Retirement Projection</div>
          <button
            type="button"
            onClick={() => setShowProjection(!showProjection)}
            className="no-print"
          >
            {showProjection ? "Hide" : "Show"}
          </button>
        </div>

        {showProjection && (
          <div className="card-body">
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
                      (openingValues.dcPotAfterPCLS * (openingValues.dcDrawdownPercent / 100))
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Income Tax</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                    {formatCurrency(openingValues.incomeTax)}
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
                      (openingValues.dcPotAfterPCLS * (openingValues.dcDrawdownPercent / 100)) -
                      openingValues.incomeTax
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Projection Inputs */}
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
                Note: DC drawdown percentage uses the value from Quick Modelling section above. The projection updates automatically when you adjust the slider.
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
                  Asset Depletion Warnings
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#dc2626' }}>
                  {warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: '8px' }}>
                      <strong>Age {w.age}:</strong> {w.messages.join(', ')}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '16px', fontSize: '14px', color: '#991b1b' }}>
                  Consider: Reducing spending, adjusting drawdown %, or modifying life events
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
                      Print / Save PDF
                    </button>
                  </div>
                  <ProjectionCharts data={projectionResults} />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <ProjectionTable data={projectionResults} />
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* QUICK MODELLING (live sliders) - Content moved from AtRetirement.jsx */}
      <QuickModellingSection
        form={form}
        model={model}
        setModel={setModel}
        applyModelToForm={applyModelToForm}
        resetModel={resetModel}
        open={open}
        toggle={toggle}
      />
    </div>
  );
}

/**
 * QuickModellingSection - Interactive sliders for previewing changes
 * Extracted as sub-component to keep file organized
 */
function QuickModellingSection({ form, model, setModel, applyModelToForm, resetModel, open, toggle }) {
  return (
    <div className="quick-modelling-section">
      <Section
        title="Quick Modelling"
        sectionKey="results"
        openFlag={open.modelling}
        onToggle={() => toggle("modelling")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "210px 130px 1fr 130px 120px",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div>
            <strong>Field</strong>
          </div>
          <div>
            <strong>Current</strong>
          </div>
          <div>
            <strong>Adjust</strong>
          </div>
          <div>
            <strong>Preview</strong>
          </div>
          <div></div>

          {/* Retirement age - hide if already retired */}
          {!form.alreadyRetired && (
            <ModelRow
              label="Retirement age"
              fieldKey="retirementAge"
              currentValue={form.retirementAge}
              min={55}
              max={75}
              step={0.5}
              model={model}
              setModel={setModel}
            />
          )}

          {/* DC pot - hide if already retired */}
          {!form.alreadyRetired && (
            <ModelRow
              label="DC pot (now)"
              fieldKey="dcPotNow"
              currentValue={form.dcPotNow}
              min={0}
              max={500000}
              step={5000}
              model={model}
              setModel={setModel}
              prefix="£"
            />
          )}

          {/* Drawdown rate */}
          <ModelRow
            label="Drawdown rate"
            fieldKey="drawdownRate"
            currentValue={form.drawdownRate}
            min={0}
            max={0.10}
            step={0.0025}
            model={model}
            setModel={setModel}
            suffix="%"
            displayMultiplier={100}
          />

          {/* Inflation */}
          <ModelRow
            label="Inflation"
            fieldKey="inflationAssumption"
            currentValue={form.inflationAssumption}
            min={0}
            max={0.10}
            step={0.0025}
            model={model}
            setModel={setModel}
            suffix="%"
            displayMultiplier={100}
          />

          {/* Growth - hide if already retired */}
          {!form.alreadyRetired && (
            <ModelRow
              label="DC growth"
              fieldKey="growthAssumption"
              currentValue={form.growthAssumption}
              min={0}
              max={0.15}
              step={0.0025}
              model={model}
              setModel={setModel}
              suffix="%"
              displayMultiplier={100}
            />
          )}

          {/* Desired spend */}
          <ModelRow
            label="Desired spend"
            fieldKey="desiredSpendAnnual"
            currentValue={form.desiredSpendAnnual}
            min={0}
            max={100000}
            step={1000}
            model={model}
            setModel={setModel}
            prefix="£"
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          <button type="button" onClick={applyModelToForm} className="no-print">
            Apply to inputs
          </button>
          <button type="button" onClick={resetModel} className="no-print">
            Reset all sliders
          </button>
        </div>

        <MiniHelp>
          Sliders preview results instantly without changing inputs. Apply to
          save; Reset to undo a row; Reset all to clear every override.
        </MiniHelp>
      </Section>

      {/* Print Summary Button */}
      <div style={{ marginTop: "24px", textAlign: "center" }} className="no-print">
        <button
          onClick={window.print}
          style={{
            padding: "12px 32px",
            fontSize: "16px",
            fontWeight: "600",
            backgroundColor: "#0ea5e9",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          🖨️ Print Summary
        </button>
      </div>
    </div>
  );
}

/**
 * ModelRow - Single row in the quick modelling slider grid
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
}) {
  const modelValue = model[fieldKey] ?? currentValue;
  const displayCurrent = prefix + (parseFloat(currentValue) * displayMultiplier).toFixed(displayMultiplier === 100 ? 2 : 0) + suffix;
  const displayModel = prefix + (parseFloat(modelValue) * displayMultiplier).toFixed(displayMultiplier === 100 ? 2 : 0) + suffix;

  return (
    <>
      <div>{label}</div>
      <div>{displayCurrent}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={modelValue}
        onChange={(e) =>
          setModel((prev) => ({ ...prev, [fieldKey]: e.target.value }))
        }
      />
      <div>{displayModel}</div>
      <button
        type="button"
        onClick={() => {
          setModel((prev) => {
            const next = { ...prev };
            delete next[fieldKey];
            return next;
          });
        }}
        className="no-print"
      >
        Reset
      </button>
    </>
  );
}
