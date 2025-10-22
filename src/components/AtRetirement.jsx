// src/components/AtRetirement.jsx
import React, { useMemo, useState, useEffect } from "react";
import { atRetirement } from "../logic/atRetirement.js";
import {
  estimateIncomeTax,
  TAX_2025_EWNI,
  TAX_2025_SCOTLAND,
} from "../utils/tax.js";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const N = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

/** Buffered text input: type freely; commit on blur or Enter */
function Txt({ value, onCommit, style, placeholder, disabled, inputMode }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  const onKeyDown = (e) => { if (e.key === "Enter") { onCommit?.(v); e.currentTarget.blur(); } };
  return (
    <input
      type="text"
      inputMode={inputMode}
      value={v}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit?.(v)}
      onKeyDown={onKeyDown}
      style={style}
    />
  );
}

export default function AtRetirement() {
  // ===== Core form (strings) =====
  const [form, setForm] = useState({
    region: "EWNI",
    dateOfBirth: "1965-01-01",  // NEW: replaces age + months
    alreadyRetired: false,
    inflationAssumption: "0.025",
    retirementAge: "65",        // years only now
    hasDbPension: true,
    desiredSpendAnnual: "45000",

    // DC pot + returns & method
    dcPotNow: "250000",
    takeDCTaxFree25: false,
    growthAssumption: "0.04",
    drawdownRate: "0.04",
    useAnnuity: false,
    annuityRate: "0.06",

    // DC contributions module (timing parity + inflation escalation in logic)
    dcIsContributing: false,
    dcContributionType: "employer", // "employer" | "personal"
    salaryNow: "60000",
    eePct: "0.05",
    erPct: "0.05",
    // removed salaryGrowthAssumption (always = inflation)
    personalAnnualContrib: "6000",
    // removed personalEscalation (always = inflation)

    // DB (no salary growth input fields; always = inflation)
    takeDBTaxFree25: false,

    // State Pension & Other
    statePensionAnnual: String(Math.round(230.25 * 52)),
    statePensionAge: "67",
    otherIncomeNow: "0",

    // Savings
    isaBalance: "50000",
    isaAddPerYear: "0",
    isaRate: "0.03",

    taxableSavingsBalance: "40000",
    taxableSavingsAddPerYear: "0",
    taxableSavingsRate: "0.03",

    additionalSavingsToRetirementPerYear: "0",
  });

  // ===== DB Schemes =====
  const [dbSchemes, setDbSchemes] = useState([
    {
      id: "active-1",
      kind: "active",
      accrualDenominator: "60",
      serviceYearsToDate: "15",
      maxServiceYears: "40",
      pensionableSalaryNow: "60000",
      // removed salaryGrowthAssumption (always = inflation)
    },
  ]);
  const addDeferred = () =>
    setDbSchemes((arr) => [
      ...arr,
      {
        id: `deferred-${Date.now()}`,
        kind: "deferred",
        preservedPensionNow: "5000",
        revaluationAssumption: "0.025",
        accrualDenominator: "",
        serviceYearsToDate: "",
        salaryAtLeaving: "",
      },
    ]);
  const removeScheme = (id) => setDbSchemes((arr) => arr.filter((s) => s.id !== id));
  const updateScheme = (id, patch) => setDbSchemes((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  // ===== Collapsible sections =====
  const [open, setOpen] = useState({ core: true, dc: true, db: true, savings: true, modelling: true });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // ===== Quick Modelling sliders (live preview) =====
  const [model, setModel] = useState({
    retirementAge: null,
    growthAssumption: null,
    drawdownOrAnnuityRate: null,
    desiredSpendAnnual: null,
  });
  const applyModelToForm = () => {
    setForm((f) => ({
      ...f,
      retirementAge: model.retirementAge != null ? String(model.retirementAge) : f.retirementAge,
      growthAssumption: model.growthAssumption != null ? String(model.growthAssumption) : f.growthAssumption,
      ...(model.drawdownOrAnnuityRate != null
        ? (f.useAnnuity ? { annuityRate: String(model.drawdownOrAnnuityRate) }
                        : { drawdownRate: String(model.drawdownOrAnnuityRate) })
        : {}),
      desiredSpendAnnual: model.desiredSpendAnnual != null ? String(model.desiredSpendAnnual) : f.desiredSpendAnnual,
    }));
  };
  const resetModel = () => setModel({ retirementAge: null, growthAssumption: null, drawdownOrAnnuityRate: null, desiredSpendAnnual: null });

  // Lock retirement age if already retired
  useEffect(() => {
    setForm((f) => (f.alreadyRetired ? { ...f, retirementAge: f.retirementAge } : f));
  }, [form.alreadyRetired, form.retirementAge]);

  // ===== Build numeric payload for logic (with LIVE slider overrides) =====
  const inputsNum = useMemo(() => {
    const effRetAge = model.retirementAge ?? N(form.retirementAge);
    const effGrowth = model.growthAssumption ?? N(form.growthAssumption);
    const baseDraw = N(form.drawdownRate);
    const baseAnnu = N(form.annuityRate);
    const effRate = model.drawdownOrAnnuityRate ?? (form.useAnnuity ? baseAnnu : baseDraw);
    const effDraw = form.useAnnuity ? baseDraw : effRate;
    const effAnnu = form.useAnnuity ? effRate : baseAnnu;
    const effSpend = model.desiredSpendAnnual ?? N(form.desiredSpendAnnual);

    // DB schemes numeric (no salary growth inputs)
    const dbSchemesNum = form.hasDbPension
      ? dbSchemes.map((s) =>
          s.kind === "active"
            ? {
                id: s.id, kind: "active",
                accrualDenominator: N(s.accrualDenominator),
                serviceYearsToDate: N(s.serviceYearsToDate),
                maxServiceYears: N(s.maxServiceYears || 0) || undefined,
                pensionableSalaryNow: N(s.pensionableSalaryNow),
                salaryGrowthAssumption: undefined, // not used; logic uses inflation
              }
            : {
                id: s.id, kind: "deferred",
                preservedPensionNow: s.preservedPensionNow === "" ? null : N(s.preservedPensionNow),
                revaluationAssumption: N(s.revaluationAssumption),
                accrualDenominator: s.accrualDenominator === "" ? undefined : N(s.accrualDenominator),
                serviceYearsToDate: s.serviceYearsToDate === "" ? undefined : N(s.serviceYearsToDate),
                salaryAtLeaving: s.salaryAtLeaving === "" ? undefined : N(s.salaryAtLeaving),
              }
        )
      : [];

    return {
      region: form.region,
      dateOfBirth: form.dateOfBirth,
      alreadyRetired: !!form.alreadyRetired,
      inflationAssumption: N(form.inflationAssumption),

      // years only
      retirementAge: effRetAge,

      // DC pot & returns/method
      dcPotNow: N(form.dcPotNow),
      takeDCTaxFree25: !!form.takeDCTaxFree25,
      growthAssumption: effGrowth,
      drawdownRate: effDraw,
      useAnnuity: !!form.useAnnuity,
      annuityRate: effAnnu,

      // DC contributions
      dcIsContributing: !!form.dcIsContributing,
      dcContributionType: form.dcContributionType,
      salaryNow: N(form.salaryNow),
      eePct: N(form.eePct),
      erPct: N(form.erPct),
      // salaryGrowthAssumption removed (inflation used in logic)
      personalAnnualContrib: N(form.personalAnnualContrib),
      personalEscalation: undefined, // not used; inflation used in logic

      // DB
      dbSchemes: dbSchemesNum,
      takeDBTaxFree25: !!form.takeDBTaxFree25,

      // State Pension / other
      statePensionAnnual: N(form.statePensionAnnual),
      statePensionAge: N(form.statePensionAge),
      otherIncomeNow: N(form.otherIncomeNow),

      // Savings
      isaBalance: N(form.isaBalance),
      isaAddPerYear: N(form.isaAddPerYear),
      isaRate: N(form.isaRate),

      taxableSavingsBalance: N(form.taxableSavingsBalance),
      taxableSavingsAddPerYear: N(form.taxableSavingsAddPerYear),
      taxableSavingsRate: N(form.taxableSavingsRate),

      // Spend
      desiredSpendAnnual: effSpend,

      additionalSavingsToRetirementPerYear: N(form.additionalSavingsToRetirementPerYear),
    };
  }, [form, dbSchemes, model]);

  // ===== Calculate =====
  const out = useMemo(() => {
    const taxFns = {
      taxEWNI: (args) => estimateIncomeTax({ ...args, cfg: TAX_2025_EWNI }),
      taxScot: (args) => estimateIncomeTax({ ...args, cfg: TAX_2025_SCOTLAND }),
    };
    return atRetirement(inputsNum, taxFns);
  }, [inputsNum]);

  // ===== HMR guards =====
  const assets = out?.assets ?? { dcAtRetAfterPCLS: 0, dcPclsCash: 0, dbPclsCash: 0, isaAtRet: 0, taxableAtRet: 0 };
  const income = out?.income ?? { dcIncome: 0, dbIncomeAfter: 0, otherIncomeAtRet: 0, statePensionAtRetNominal: 0, taxableInterest: 0 };
  const assetsTotal = out?.assetsTotal ?? 0;
  const incomeGrossTotal = out?.incomeGrossTotal ?? 0;
  const estTax = out?.estTax ?? 0;
  const netIncome = out?.netIncome ?? 0;
  const surplusDeficit = out?.surplusDeficit ?? 0;
  const yearsToRetirement = out?.yearsToRetirement ?? 0;
  const spaWarning = !!out?.spaWarning;
  const real = out?.real ?? { assetsTotal: 0, incomeGrossTotal: 0, netIncome: 0, surplusDeficit: 0 };

  // ===== Helpers / layout =====
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const Section = ({ title, openFlag, onToggle, children }) => (
    <section style={{ padding: 14, border: "1px solid #eee", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        <button type="button" onClick={onToggle}>{openFlag ? "Hide" : "Show"}</button>
      </div>
      {openFlag && <div style={{ marginTop: 10 }}>{children}</div>}
    </section>
  );
  const FieldRow = ({ label, children }) => (
    <div style={{
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      gap: 8,
      alignItems: "baseline",
      marginBottom: 6
    }}>
      <div style={{ opacity: 0.9 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
  const TwoCol = ({ left, right }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{left}{right}</div>
  );
  const MiniHelp = ({ children }) => <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{children}</div>;
  const Card = ({ title, children }) => (
    <div style={{ border: "1px solid #e7e7e7", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "#f7f7fb", padding: "8px 12px", fontWeight: 600 }}>{title}</div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
  const TotalLine = ({ label, value }) => (
    <div style={{ borderTop: "1px solid #e7e7e7", paddingTop: 8, marginTop: 8, fontWeight: 700 }}>
      <span>{label}: </span><span>£{fmt(value)}</span>
    </div>
  );

  // ===== UI =====
  return (
    <div className="grid gap-8 max-w-5xl mx-auto">

      {/* CORE */}
      <Section title="CORE" openFlag={open.core} onToggle={() => toggle("core")}>
        <TwoCol
          left={
            <>
              <FieldRow label="Region">
                <select value={form.region} onChange={(e) => set({ region: e.target.value })}>
                  <option value="EWNI">England/Wales/Northern Ireland</option>
                  <option value="Scotland">Scotland</option>
                </select>
              </FieldRow>

              <FieldRow label="Date of birth">
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set({ dateOfBirth: e.target.value })}
                  style={{ width: 170 }}
                />
              </FieldRow>

              <FieldRow label={`Retirement age (years) ${form.alreadyRetired ? "(locked)" : ""}`}>
                <Txt value={form.retirementAge} onCommit={(v) => set({ retirementAge: v })} disabled={form.alreadyRetired} style={{ width: 100 }} inputMode="numeric" />
              </FieldRow>
            </>
          }
          right={
            <>
              <FieldRow label="Inflation assumption">
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Txt value={form.inflationAssumption} onCommit={(v) => set({ inflationAssumption: v })} style={{ width: 100 }} inputMode="decimal" />
                  <span>%</span>
                </div>
              </FieldRow>

              <FieldRow label="Spend target (annual) (£)">
                <Txt value={form.desiredSpendAnnual} onCommit={(v) => set({ desiredSpendAnnual: v })} style={{ width: 140 }} inputMode="numeric" />
              </FieldRow>

              <TwoCol
                left={
                  <FieldRow label="Already retired?">
                    <label><input type="checkbox" checked={form.alreadyRetired} onChange={(e) => set({ alreadyRetired: e.target.checked })} /> Yes</label>
                  </FieldRow>
                }
                right={
                  <FieldRow label="I have a DB pension">
                    <label><input type="checkbox" checked={form.hasDbPension} onChange={(e) => set({ hasDbPension: e.target.checked })} /> Yes</label>
                  </FieldRow>
                }
              />
            </>
          }
        />
      </Section>

      {/* DC PENSIONS */}
      <Section title="DC PENSIONS" openFlag={open.dc} onToggle={() => toggle("dc")}>
        <TwoCol
          left={
            <FieldRow label="DC pot now (£)">
              <Txt value={form.dcPotNow} onCommit={(v) => set({ dcPotNow: v })} style={{ width: 160 }} inputMode="numeric" />
            </FieldRow>
          }
          right={
            <FieldRow label="Take 25% tax-free from DC?">
              <label><input type="checkbox" checked={form.takeDCTaxFree25} onChange={(e) => set({ takeDCTaxFree25: e.target.checked })} /> Yes</label>
            </FieldRow>
          }
        />

        <FieldRow label="Still contributing to a DC pension?">
          <label><input type="checkbox" checked={form.dcIsContributing} onChange={(e) => set({ dcIsContributing: e.target.checked })} /> Yes</label>
        </FieldRow>

        {form.dcIsContributing && (
          <>
            <FieldRow label="Contribution type">
              <label><input type="radio" name="dcType" value="employer" checked={form.dcContributionType === "employer"} onChange={(e) => set({ dcContributionType: e.target.value })} /> Employer scheme</label>
              <label style={{ marginLeft: 16 }}><input type="radio" name="dcType" value="personal" checked={form.dcContributionType === "personal"} onChange={(e) => set({ dcContributionType: e.target.value })} /> Personal / SIPP</label>
            </FieldRow>

            {form.dcContributionType === "employer" ? (
              <>
                <TwoCol
                  left={<FieldRow label="Salary now (£)"><Txt value={form.salaryNow} onCommit={(v) => set({ salaryNow: v })} style={{ width: 140 }} inputMode="numeric" /></FieldRow>}
                  right={
                    <TwoCol
                      left={<FieldRow label="Your contribution (%)"><Txt value={form.eePct} onCommit={(v) => set({ eePct: v })} style={{ width: 90 }} inputMode="decimal" /></FieldRow>}
                      right={<FieldRow label="Employer contribution (%)"><Txt value={form.erPct} onCommit={(v) => set({ erPct: v })} style={{ width: 90 }} inputMode="decimal" /></FieldRow>}
                    />
                  }
                />
              </>
            ) : (
              <FieldRow label="Annual contribution (£)">
                <Txt value={form.personalAnnualContrib} onCommit={(v) => set({ personalAnnualContrib: v })} style={{ width: 140 }} inputMode="numeric" />
              </FieldRow>
            )}
          </>
        )}

        <TwoCol
          left={
            <FieldRow label="Growth assumption">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Txt value={form.growthAssumption} onCommit={(v) => set({ growthAssumption: v })} style={{ width: 90 }} inputMode="decimal" />
                <span>%</span>
              </div>
            </FieldRow>
          }
          right={
            <FieldRow label={form.useAnnuity ? "Annuity rate" : "Drawdown rate"}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Txt value={form.useAnnuity ? form.annuityRate : form.drawdownRate} onCommit={(v) => set(form.useAnnuity ? { annuityRate: v } : { drawdownRate: v })} style={{ width: 90 }} inputMode="decimal" />
                <span>%</span>
              </div>
            </FieldRow>
          }
        />
        <FieldRow label="">
          <label><input type="checkbox" checked={form.useAnnuity} onChange={(e) => set({ useAnnuity: e.target.checked })} /> Use annuity (instead of drawdown)</label>
        </FieldRow>

        <MiniHelp>
          Contributions are treated as <b>start-of-year</b> payments. Employer contributions rise with <b>inflation</b> via salary; personal contributions also <b>inflate</b>.
          25% PCLS is capped across DC+DB at <b>£268,275</b> (DC has priority).
        </MiniHelp>
      </Section>

      {/* DB PENSIONS */}
      {form.hasDbPension && (
        <Section title="DB PENSIONS" openFlag={open.db} onToggle={() => toggle("db")}>
          {dbSchemes.filter((s) => s.kind === "active").map((s) => (
            <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <strong>Active final-salary scheme</strong>
              <TwoCol
                left={<FieldRow label="Accrual denominator (e.g., 60)"><Txt value={s.accrualDenominator} onCommit={(v) => updateScheme(s.id, { accrualDenominator: v })} style={{ width: 100 }} inputMode="numeric" /></FieldRow>}
                right={<FieldRow label="Service years to date"><Txt value={s.serviceYearsToDate} onCommit={(v) => updateScheme(s.id, { serviceYearsToDate: v })} style={{ width: 100 }} inputMode="numeric" /></FieldRow>}
              />
              <TwoCol
                left={<FieldRow label="Max service years (optional)"><Txt value={s.maxServiceYears} onCommit={(v) => updateScheme(s.id, { maxServiceYears: v })} style={{ width: 100 }} inputMode="numeric" /></FieldRow>}
                right={<FieldRow label="Pensionable salary now (£)"><Txt value={s.pensionableSalaryNow} onCommit={(v) => updateScheme(s.id, { pensionableSalaryNow: v })} style={{ width: 140 }} inputMode="numeric" /></FieldRow>}
              />
            </div>
          ))}

          {dbSchemes.filter((s) => s.kind === "deferred").map((s) => (
            <div key={s.id} style={{ border: "1px dashed #ddd", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <strong>Deferred scheme</strong>
              <TwoCol
                left={<FieldRow label="Preserved pension now (annual)"><Txt value={s.preservedPensionNow} onCommit={(v) => updateScheme(s.id, { preservedPensionNow: v })} style={{ width: 140 }} inputMode="numeric" /></FieldRow>}
                right={<FieldRow label="Revaluation assumption (%)"><Txt value={s.revaluationAssumption} onCommit={(v) => updateScheme(s.id, { revaluationAssumption: v })} style={{ width: 100 }} inputMode="decimal" /></FieldRow>}
              />
              <div style={{ marginTop: 6, marginBottom: 6, fontWeight: 600 }}>Or derive preserved:</div>
              <TwoCol
                left={<FieldRow label="Accrual denominator (e.g., 60)"><Txt value={s.accrualDenominator} onCommit={(v) => updateScheme(s.id, { accrualDenominator: v })} style={{ width: 100 }} inputMode="numeric" /></FieldRow>}
                right={<FieldRow label="Service years to date"><Txt value={s.serviceYearsToDate} onCommit={(v) => updateScheme(s.id, { serviceYearsToDate: v })} style={{ width: 100 }} inputMode="numeric" /></FieldRow>}
              />
              <FieldRow label="Salary at leaving (£)"><Txt value={s.salaryAtLeaving} onCommit={(v) => updateScheme(s.id, { salaryAtLeaving: v })} style={{ width: 140 }} inputMode="numeric" /></FieldRow>
              <div><button type="button" onClick={() => removeScheme(s.id)}>Remove deferred scheme</button></div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label><input type="checkbox" checked={form.takeDBTaxFree25} onChange={(e) => set({ takeDBTaxFree25: e.target.checked })} /> Take 25% tax-free from total DB (20× model; overall cap enforced)</label>
            <button type="button" onClick={addDeferred}>Add deferred DB scheme</button>
          </div>
        </Section>
      )}

      {/* SAVINGS & OTHER — tidy rows */}
      <Section title="SAVINGS & OTHER" openFlag={open.savings} onToggle={() => toggle("savings")}>
        <FieldRow label="ISA">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
            <span>Balance £</span>
            <Txt value={form.isaBalance} onCommit={(v) => set({ isaBalance: v })} style={{ width: 110 }} inputMode="numeric" />
            <span>Add/yr £</span>
            <Txt value={form.isaAddPerYear} onCommit={(v) => set({ isaAddPerYear: v })} style={{ width: 110 }} inputMode="numeric" />
            <span>Rate %</span>
            <Txt value={form.isaRate} onCommit={(v) => set({ isaRate: v })} style={{ width: 80 }} inputMode="decimal" />
          </div>
        </FieldRow>

        <FieldRow label="Taxable savings">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
            <span>Balance £</span>
            <Txt value={form.taxableSavingsBalance} onCommit={(v) => set({ taxableSavingsBalance: v })} style={{ width: 110 }} inputMode="numeric" />
            <span>Add/yr £</span>
            <Txt value={form.taxableSavingsAddPerYear} onCommit={(v) => set({ taxableSavingsAddPerYear: v })} style={{ width: 110 }} inputMode="numeric" />
            <span>Rate %</span>
            <Txt value={form.taxableSavingsRate} onCommit={(v) => set({ taxableSavingsRate: v })} style={{ width: 80 }} inputMode="decimal" />
          </div>
        </FieldRow>

        <FieldRow label="Other income (now)">
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span>Annual £</span>
            <Txt value={form.otherIncomeNow} onCommit={(v) => set({ otherIncomeNow: v })} style={{ width: 140 }} inputMode="numeric" />
          </div>
        </FieldRow>
      </Section>

      {/* SUMMARY — responsive two columns */}
      <section>
        <h2 style={{ marginBottom: 10 }}>At-Retirement Summary</h2>
        <div style={{ marginBottom: 8 }}>Years to retirement: <strong>{yearsToRetirement.toFixed(2)}</strong></div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}
        >
          <Card title="Retirement Income (first year)">
            <div>DC income ({inputsNum.useAnnuity ? "annuity" : "drawdown"}): <strong>£{fmt(income.dcIncome)}</strong></div>
            <div>DB income {form.takeDBTaxFree25 ? "(after PCLS)" : ""}: <strong>£{fmt(income.dbIncomeAfter)}</strong></div>
            <div>Other income: <strong>£{fmt(income.otherIncomeAtRet)}</strong></div>
            <div>State Pension (inflated): <strong>£{fmt(income.statePensionAtRetNominal)}</strong>{spaWarning && <> <em>— included but only from SPA {inputsNum.statePensionAge}</em></>}</div>
            <div>Taxable savings interest: <strong>£{fmt(income.taxableInterest)}</strong></div>
            <TotalLine label="Gross income total" value={incomeGrossTotal} />
            <div style={{ marginTop: 6 }}>Estimated income tax: <strong>£{fmt(estTax)}</strong></div>
            <TotalLine label="Net income" value={netIncome} />
            <TotalLine label="Surplus / Deficit vs spend" value={surplusDeficit} />
          </Card>

          <div className="stack" style={{ display: "grid", gap: 16 }}>
            <Card title="Retirement Assets (at retirement)">
              <div>DC pot (after PCLS): <strong>£{fmt(assets.dcAtRetAfterPCLS)}</strong></div>
              {assets.dcPclsCash > 0 && <div>DC tax-free cash: <strong>£{fmt(assets.dcPclsCash)}</strong></div>}
              {assets.dbPclsCash > 0 && <div>DB tax-free cash: <strong>£{fmt(assets.dbPclsCash)}</strong></div>}
              <div>ISA balance: <strong>£{fmt(assets.isaAtRet)}</strong></div>
              <div>Taxable savings balance: <strong>£{fmt(assets.taxableAtRet)}</strong></div>
              <TotalLine label="Total assets" value={assetsTotal} />
            </Card>

            <Card title="Real terms (today’s prices)">
              <div>Gross income total (real): <strong>£{fmt(real.incomeGrossTotal)}</strong></div>
              <div>After-tax income (real): <strong>£{fmt(real.netIncome)}</strong></div>
              <div>Surplus/Deficit (real): <strong>£{fmt(real.surplusDeficit)}</strong></div>
              <TotalLine label="Assets total (real)" value={real.assetsTotal} />
              <MiniHelp>Deflated {yearsToRetirement.toFixed(2)} year(s) at {(inputsNum.inflationAssumption * 100).toFixed(1)}% p.a.</MiniHelp>
            </Card>
          </div>
        </div>
      </section>

      {/* QUICK MODELLING (live sliders) */}
      <Section title="Quick Modelling" openFlag={open.modelling} onToggle={() => toggle("modelling")}>
        <div style={{ display: "grid", gridTemplateColumns: "210px 130px 1fr 130px 120px", gap: 10, alignItems: "center" }}>
          <div><strong>Field</strong></div><div><strong>Current</strong></div><div><strong>Adjust</strong></div><div><strong>Preview</strong></div><div></div>

          <div>Retirement age</div>
          <div>{form.retirementAge}</div>
          <input type="range" min={55} max={75} value={model.retirementAge ?? N(form.retirementAge)} onChange={(e) => setModel((m) => ({ ...m, retirementAge: Number(e.target.value) }))} />
          <div>{model.retirementAge ?? form.retirementAge}</div>
          <button type="button" onClick={() => setModel((m) => ({ ...m, retirementAge: null }))}>Reset</button>

          <div>Growth assumption (%)</div>
          <div>{(N(form.growthAssumption) * 100).toFixed(1)}</div>
          <input type="range" min={0.00} max={0.10} step={0.0025} value={model.growthAssumption ?? N(form.growthAssumption)} onChange={(e) => setModel((m) => ({ ...m, growthAssumption: Number(e.target.value) }))} />
          <div>{((model.growthAssumption ?? N(form.growthAssumption)) * 100).toFixed(1)}</div>
          <button type="button" onClick={() => setModel((m) => ({ ...m, growthAssumption: null }))}>Reset</button>

          <div>{form.useAnnuity ? "Annuity rate (%)" : "Drawdown rate (%)"}</div>
          <div>{((form.useAnnuity ? N(form.annuityRate) : N(form.drawdownRate)) * 100).toFixed(1)}</div>
          <input type="range" min={0.03} max={form.useAnnuity ? 0.08 : 0.06} step={0.0025}
            value={model.drawdownOrAnnuityRate ?? (form.useAnnuity ? N(form.annuityRate) : N(form.drawdownRate))}
            onChange={(e) => setModel((m) => ({ ...m, drawdownOrAnnuityRate: Number(e.target.value) }))} />
          <div>{((model.drawdownOrAnnuityRate ?? (form.useAnnuity ? N(form.annuityRate) : N(form.drawdownRate))) * 100).toFixed(1)}</div>
          <button type="button" onClick={() => setModel((m) => ({ ...m, drawdownOrAnnuityRate: null }))}>Reset</button>

          <div>Spend target (£/yr)</div>
          <div>{fmt(form.desiredSpendAnnual)}</div>
          <input type="range" min={20000} max={120000} step={1000}
            value={model.desiredSpendAnnual ?? N(form.desiredSpendAnnual)}
            onChange={(e) => setModel((m) => ({ ...m, desiredSpendAnnual: Number(e.target.value) }))} />
          <div>{fmt(model.desiredSpendAnnual ?? form.desiredSpendAnnual)}</div>
          <button type="button" onClick={() => setModel((m) => ({ ...m, desiredSpendAnnual: null }))}>Reset</button>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          <button type="button" onClick={applyModelToForm}>Apply to inputs</button>
          <button type="button" onClick={resetModel}>Reset all sliders</button>
        </div>

        <MiniHelp>Sliders preview results instantly without changing inputs. Apply to save; Reset to undo a row; Reset all to clear every override.</MiniHelp>
      </Section>
    </div>
  );
}
