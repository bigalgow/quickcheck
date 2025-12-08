// src/components/AtRetirementResults.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, TotalLine, MiniHelp, Section } from "./common";

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

  // Utilities
  fmt,
  N,
  saveAutosave,
  loadAutosave,
}) {
  const navigate = useNavigate();

  return (
    <div className="print-page">
      <section>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1e293b", marginBottom: 16 }}>
          At-Retirement Summary
        </h2>
        <div style={{ marginBottom: 8, fontSize: "16px" }}>
          Years to retirement: <strong>{yearsToRetirement.toFixed(2)}</strong>
        </div>

        <div className="grid-2">
          {/* Income card */}
          <Card title="Retirement Income (first year)">
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
            <Card title="Retirement Assets (at retirement)">
              <div>
                DC pot (after PCLS & annuity purchase):{" "}
                <strong>£{fmt(assets.dcPotForDrawdown)}</strong>
                {assets.dcPotForAnnuity > 0 && (
                  <span style={{ fontSize: "13px", color: "#64748b", marginLeft: 6 }}>
                    (£{fmt(assets.dcPotForAnnuity)} used to purchase annuity)
                  </span>
                )}
              </div>
              {assets.dcPclsCash > 0 && (
                <div>
                  DC tax-free cash: <strong>£{fmt(assets.dcPclsCash)}</strong>
                </div>
              )}
              {assets.dbPclsCash > 0 && (
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
              <MiniHelp>
                Deflated {yearsToRetirement.toFixed(2)} year(s) at{" "}
                {(inputsNum.inflationAssumption * 100).toFixed(1)}% p.a.
              </MiniHelp>
            </Card>
          </div>
        </div>
      </section>

      {/* PROJECTION BUTTON */}
      <div style={{ textAlign: 'center', margin: '24px 0' }} className="no-print">
        <button
          onClick={() => {
            // Save immediately before navigating (don't wait for debounce)
            saveAutosave({
              form,
              dbSchemes,
              model,
              atRetirement: {
                yearsToRetirement,
                netIncome,
                incomeGrossTotal,
                assetsTotal,
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
                  dcPotAfterPCLS: assets.dcPotForDrawdown, // Only drawdown pot (after annuity purchase)
                  isaSavings: assets.isaAtRet,
                  taxableSavings: assets.taxableAtRet + assets.dcPclsCash + assets.dbPclsCash,
                  dbPension: income.dbIncomeAfter,
                  annuityIncome: income.dcAnnuityIncome, // Annuity income from annuitized portion
                  statePension: income.statePensionAtRetNominal,
                  statePensionAge: inputsNum.statePensionAge,
                  propertyIncome: income.propertyIncomeAtRet, // Property income (separate for future tax differentiation)
                  dividendIncome: income.dividendIncomeAtRet, // Dividend income (separate for future tax differentiation)
                  anyOtherIncome: income.anyOtherIncomeAtRet, // Any other income (separate for future tax differentiation)
                  otherIncome: income.otherIncomeAtRet, // Total other income (for backward compatibility)
                  annualSpend: latestSpend, // Use latest value from sessionStorage
                  incomeTax: estTax,
                  inflation: inputsNum.inflationAssumption * 100,
                  dcGrowth: inputsNum.growthAssumption * 100,
                  isaGrowth: inputsNum.isaRate * 100,
                  savingsGrowth: inputsNum.taxableSavingsRate * 100,
                  taxRegion: inputsNum.region === 'Scotland' ? 'scotland' : 'england',
                  dcDrawdownPercent: inputsNum.drawdownRate * 100,
                  yearsToRetirement: yearsToRetirement,
                }
              }
            });
          }}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          View 25-Year Projection →
        </button>
      </div>

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

          {/* Retirement age */}
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

          {/* DC pot */}
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

          {/* Growth */}
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
