// src/components/AtRetirement.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { atRetirement } from "../logic/atRetirement.js";
import {
  estimateIncomeTax,
  TAX_2025_EWNI,
  TAX_2025_SCOTLAND,
} from "../utils/tax.js";
import { calculateStatePensionAge, formatStatePensionAge } from "../utils/statePensionAge.js";
import "./AtRetirement.css";

import SaveBar from "./SaveBar.jsx";
import HeaderLayout from "./HeaderLayout.jsx";
import AtRetirementResults from "./AtRetirementResults.jsx";
import { loadAutosave, saveAutosave, clearAutosave, getLastCloudSave, setLastCloudSave } from "../utils/persist.js";
import { useAuth } from "../auth/AuthProvider";

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const N = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

/** Buffered text input: type freely; commit on blur or Enter */
function Txt({ value, onCommit, style, placeholder, disabled, inputMode }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => {
    setV(value ?? "");
  }, [value]);
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      onCommit?.(v);
      e.currentTarget.blur();
    }
  };

  // Default styling to make inputs visually distinct
  const defaultStyle = {
    padding: "6px 10px",
    fontSize: "16px",
    border: "2px solid #cbd5e1",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const focusStyle = {
    borderColor: "#0284c7",
  };

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={v}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={(e) => {
        onCommit?.(v);
        e.currentTarget.style.borderColor = defaultStyle.border.split(' ')[2];
      }}
      onKeyDown={onKeyDown}
      style={{ ...defaultStyle, ...style }}
      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
    />
  );
}

export default function AtRetirement() {
  const navigate = useNavigate();
  const { isAuthenticated, getAccessToken } = useAuth();

  // ===== Lifestyle Profile Integration =====
  const [lifestyleProfile, setLifestyleProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ===== Core form (strings) =====
  const [form, setForm] = useState({
    region: "EWNI",
    dateOfBirth: "1965-01-01", // DOB replaces age + months
    alreadyRetired: false,
    inflationAssumption: "0.025",
    retirementAge: "65", // years only now
    hasDbPension: true,
    desiredSpendAnnual: "",

    // DC
    dcPotNow: "",
    takeDCTaxFree25: false,
    growthAssumption: "0.04",
    drawdownRate: "0.04",
    useAnnuity: false,
    annuityRate: "0.06",
    dcAnnuityPct: "0", // NEW: % of post-PCLS DC pot to annuitize (0-100)

    // DC contributions module (start-of-year contributions + inflate personal)
    dcIsContributing: false,
    dcContributionType: "employer", // "employer" | "personal"
    salaryNow: "",
    eePct: "0.05",
    erPct: "0.05",
    // salary growth inputs removed (we use inflation in logic)
    personalAnnualContrib: "",
    // personal escalation input removed (we use inflation in logic)

    // DB
    takeDBTaxFree25: false,

    // State Pension & Other
    statePensionAnnual: String(Math.round(230.25 * 52)),
    statePensionAge: "67",
    propertyIncomeNow: "",
    dividendIncomeNow: "",
    anyOtherIncomeNow: "",

    // Savings
    isaBalance: "",
    isaAddPerYear: "",
    isaRate: "0.03",

    taxableSavingsBalance: "",
    taxableSavingsAddPerYear: "",
    taxableSavingsRate: "0.03",

    // Other
    additionalSavingsToRetirementPerYear: "",
  });

  // ===== DB Schemes =====
  const [dbSchemes, setDbSchemes] = useState([
    {
      id: "active-1",
      kind: "active",
      accrualDenominator: "60",
      serviceYearsToDate: "",
      maxServiceYears: "40",
      pensionableSalaryNow: "",
      // salary growth inputs removed; we use inflation
    },
  ]);
  const addDeferred = () =>
    setDbSchemes((arr) => [
      ...arr,
      {
        id: `deferred-${Date.now()}`,
        kind: "deferred",
        preservedPensionNow: "",
        revaluationAssumption: "0.025",
        accrualDenominator: "",
        serviceYearsToDate: "",
        salaryAtLeaving: "",
      },
    ]);
  const removeScheme = (id) =>
    setDbSchemes((arr) => arr.filter((s) => s.id !== id));
  const updateScheme = (id, patch) =>
    setDbSchemes((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  // ===== Wizard Mode =====
  const [wizardMode, setWizardMode] = useState(true); // Default to wizard mode
  const [currentStep, setCurrentStep] = useState(-1); // -1 = start screen, 0-4 = steps

  const steps = [
    { key: 'core', title: 'CORE ASSUMPTIONS' },
    { key: 'dc', title: 'DC PENSIONS' },
    { key: 'db', title: 'DB PENSIONS' },
    { key: 'savings', title: 'SAVINGS & OTHER' },
    { key: 'results', title: 'RESULTS & MODELLING' },
  ];

  const startWizard = () => {
    setWizardMode(true);
    setCurrentStep(0);
  };

  const exitWizard = () => {
    setWizardMode(false);
    setCurrentStep(-1);
    // Open all sections in classic mode
    setOpen({ core: true, dc: true, db: true, savings: true, modelling: true });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [open, setOpen] = useState({
    core: true,
    dc: true,
    db: true,
    savings: true,
    modelling: true,
  });
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
      retirementAge:
        model.retirementAge != null ? String(model.retirementAge) : f.retirementAge,
      growthAssumption:
        model.growthAssumption != null
          ? String(model.growthAssumption)
          : f.growthAssumption,
      ...(model.drawdownOrAnnuityRate != null
        ? f.useAnnuity
          ? { annuityRate: String(model.drawdownOrAnnuityRate) }
          : { drawdownRate: String(model.drawdownOrAnnuityRate) }
        : {}),
      desiredSpendAnnual:
        model.desiredSpendAnnual != null
          ? String(model.desiredSpendAnnual)
          : f.desiredSpendAnnual,
    }));
  };
  const resetModel = () =>
    setModel({
      retirementAge: null,
      growthAssumption: null,
      drawdownOrAnnuityRate: null,
      desiredSpendAnnual: null,
    });

  // Lock retirement age if already retired (using DOB)
  useEffect(() => {
    setForm((f) => {
      if (!f.alreadyRetired) return f;
      // Compute integer age now from DOB
      const dob = new Date(f.dateOfBirth);
      const now = new Date();
      const ms = now.getTime() - dob.getTime();
      const ageYears = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.2425));
      if (String(ageYears) !== f.retirementAge) return { ...f, retirementAge: String(ageYears) };
      return f;
    });
  }, [form.alreadyRetired, form.dateOfBirth, form.retirementAge]);

  // ===== Build numeric payload (with LIVE slider overrides) =====
  const inputsNum = useMemo(() => {
    const infl = N(form.inflationAssumption);
    const effRetAge = model.retirementAge ?? N(form.retirementAge);
    const effGrowth = model.growthAssumption ?? N(form.growthAssumption);
    const baseDraw = N(form.drawdownRate);
    const baseAnnu = N(form.annuityRate);
    const effRate =
      model.drawdownOrAnnuityRate ?? (form.useAnnuity ? baseAnnu : baseDraw);
    const effDraw = form.useAnnuity ? baseDraw : effRate;
    const effAnnu = form.useAnnuity ? effRate : baseAnnu;
    const effSpend = model.desiredSpendAnnual ?? N(form.desiredSpendAnnual);

    const dob = new Date(form.dateOfBirth);
    const now = new Date();
    const yearsBetween = (d1, d2) =>
      (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 365.2425);
    const currentAgeYears = yearsBetween(dob, now);
    const yearsToRet = Math.max(0, effRetAge - currentAgeYears);

    const dbSchemesNum = form.hasDbPension
      ? dbSchemes.map((s) =>
          s.kind === "active"
            ? {
                id: s.id,
                kind: "active",
                accrualDenominator: N(s.accrualDenominator),
                serviceYearsToDate: N(s.serviceYearsToDate),
                maxServiceYears: N(s.maxServiceYears || 0) || undefined,
                pensionableSalaryNow: N(s.pensionableSalaryNow),
                salaryGrowthAssumption: infl, // force to inflation
              }
            : {
                id: s.id,
                kind: "deferred",
                preservedPensionNow: s.preservedPensionNow === "" ? null : N(s.preservedPensionNow),
                revaluationAssumption: N(s.revaluationAssumption),
                accrualDenominator: s.accrualDenominator === "" ? undefined : N(s.accrualDenominator),
                serviceYearsToDate: s.serviceYearsToDate === "" ? undefined : N(s.serviceYearsToDate),
                salaryAtLeaving: s.salaryAtLeaving === "" ? undefined : N(s.salaryAtLeaving),
              }
        )
      : [];

    return {
      // region/tax
      region: form.region,
      alreadyRetired: !!form.alreadyRetired,
      inflationAssumption: infl,

      // DOB-driven ages
      currentAge: currentAgeYears,
      retirementAge: effRetAge,
      yearsToRetExplicit: yearsToRet,

      // DC
      dcPotNow: N(form.dcPotNow),
      takeDCTaxFree25: !!form.takeDCTaxFree25,
      growthAssumption: effGrowth,
      drawdownRate: effDraw,
      useAnnuity: !!form.useAnnuity,
      annuityRate: effAnnu,
      dcAnnuityPct: N(form.dcAnnuityPct), // NEW: % to annuitize

      // DC contributions
      dcIsContributing: !!form.dcIsContributing,
      dcContributionType: form.dcContributionType,
      salaryNow: N(form.salaryNow),
      eePct: N(form.eePct),
      erPct: N(form.erPct),
      // salary growth forced to inflation in logic
      personalAnnualContrib: N(form.personalAnnualContrib),
      // personal escalation forced to inflation in logic

      // DB
      dbSchemes: dbSchemesNum,
      takeDBTaxFree25: !!form.takeDBTaxFree25,

      // State Pension & Other
      statePensionAnnual: N(form.statePensionAnnual),
      statePensionAge: N(form.statePensionAge),
      propertyIncomeNow: N(form.propertyIncomeNow),
      dividendIncomeNow: N(form.dividendIncomeNow),
      anyOtherIncomeNow: N(form.anyOtherIncomeNow),

      // Savings
      isaBalance: N(form.isaBalance),
      isaAddPerYear: N(form.isaAddPerYear),
      isaRate: N(form.isaRate),

      taxableSavingsBalance: N(form.taxableSavingsBalance),
      taxableSavingsAddPerYear: N(form.taxableSavingsAddPerYear),
      taxableSavingsRate: N(form.taxableSavingsRate),

      // Spend
      desiredSpendAnnual: effSpend,

      additionalSavingsToRetirementPerYear: N(
        form.additionalSavingsToRetirementPerYear
      ),
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
  const assets =
    out?.assets ?? {
      dcAtRetAfterPCLS: 0,
      dcPclsCash: 0,
      dbPclsCash: 0,
      isaAtRet: 0,
      taxableAtRet: 0,
    };
  const income =
    out?.income ?? {
      dcIncome: 0,
      dbIncomeAfter: 0,
      propertyIncomeAtRet: 0,
      dividendIncomeAtRet: 0,
      anyOtherIncomeAtRet: 0,
      otherIncomeAtRet: 0, // Total of above three categories
      statePensionAtRetNominal: 0,
      taxableInterest: 0,
    };
  const assetsTotal = out?.assetsTotal ?? 0;
  const incomeGrossTotal = out?.incomeGrossTotal ?? 0;
  const estTax = out?.estTax ?? 0;
  const netIncome = out?.netIncome ?? 0;
  const surplusDeficit = out?.surplusDeficit ?? 0;
  const yearsToRetirement =
    out?.yearsToRetirement ?? inputsNum.yearsToRetExplicit ?? 0;
  const spaWarning = !!out?.spaWarning;
  const real =
    out?.real ?? {
      assetsTotal: 0,
      incomeGrossTotal: 0,
      netIncome: 0,
      surplusDeficit: 0,
    };

  // ---- Track unsaved changes ----
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isInitialLoadRef = useRef(true); // Track if we're in initial load phase
  const cloudLoadPendingRef = useRef(false); // Track if cloud load is in progress

  // ---- Autosave restore (automatic) ----
  useEffect(() => {
    const snap = loadAutosave();
    console.log('🏠 At Retirement: Loaded autosave data:', snap);
    if (!snap) {
      console.log('🏠 At Retirement: No saved data found');
      isInitialLoadRef.current = false; // Mark initial load complete
      return;
    }

    const { form: savedForm, dbSchemes: savedSchemes, model: savedModel } = snap;

    // Automatically restore saved data
    if (savedForm && typeof savedForm === "object") {
      console.log('✅ At Retirement: Auto-restoring form data');
      setForm(savedForm);
    }
    if (Array.isArray(savedSchemes)) {
      console.log('✅ At Retirement: Auto-restoring DB schemes');
      setDbSchemes(savedSchemes);
    }
    if (savedModel) {
      console.log('✅ At Retirement: Auto-restoring model');
      setModel(savedModel);
    }

    // Mark initial load complete after delay longer than auto-save debounce (800ms)
    // But if cloud load is pending, wait for it to complete
    setTimeout(() => {
      if (cloudLoadPendingRef.current) {
        console.log('⏳ At Retirement: Waiting for cloud load to complete before marking initial load done');
        return; // Don't mark as complete yet - cloud load callback will do it
      }

      isInitialLoadRef.current = false;
      console.log('✅ At Retirement: Initial load complete');

      // Check if data was recently saved to cloud (e.g., from Projection page)
      const lastCloudSave = getLastCloudSave();
      if (lastCloudSave) {
        const cloudSaveTime = new Date(lastCloudSave).getTime();
        const now = Date.now();
        // If cloud save was within last 5 seconds, assume sessionStorage is in sync
        if (now - cloudSaveTime < 5000) {
          console.log('☁️ Recent cloud save detected - clearing unsaved changes flag');
          setHasUnsavedChanges(false);
        }
      }
    }, 1000);
  }, []); // Only run once on mount

  // ---- Load lifestyle profile ----
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!isAuthenticated) {
          setLoadingProfile(false);
          return;
        }

        const audience = import.meta.env.VITE_API_AUDIENCE;
        if (!audience) {
          console.log('No API audience - skipping profile load');
          setLoadingProfile(false);
          return;
        }

        const token = await getAccessToken(audience);
        const res = await fetch('/api/me/lifestyle', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const profile = await res.json();
          if (profile) {
            console.log('✅ Loaded lifestyle profile:', profile);
            setLifestyleProfile(profile);

            // Auto-populate spend field if empty
            if (!form.desiredSpendAnnual && profile.baselineAmount) {
              setForm(f => ({
                ...f,
                desiredSpendAnnual: String(profile.baselineAmount)
              }));
              console.log('✅ Auto-populated baseline expenditure from profile');
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load lifestyle profile:', e);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, getAccessToken]); // Re-run if auth state changes

  // ---- Autosave (debounced) ----
  useEffect(() => {
    const h = setTimeout(() => {
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
      // Only mark as unsaved if not in initial load phase (i.e., user actually made changes)
      if (!isInitialLoadRef.current) {
        console.log('💾 At Retirement: Auto-save triggered - marking as unsaved changes');
        setHasUnsavedChanges(true);
      } else {
        console.log('💾 At Retirement: Auto-save during initial load - NOT marking as unsaved');
      }
    }, 800);
    return () => clearTimeout(h);
  }, [
    form,
    dbSchemes,
    model,
    yearsToRetirement,
    netIncome,
    incomeGrossTotal,
    assetsTotal,
  ]);

  // Helpers / layout atoms (kept from your file)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const Section = ({ title, sectionKey, openFlag, onToggle, children }) => {
    // In wizard mode, only show if this is the current step
    const stepIndex = steps.findIndex(s => s.key === sectionKey);
    const isCurrentStep = wizardMode && currentStep === stepIndex;
    const shouldShow = wizardMode ? isCurrentStep : openFlag;

    if (wizardMode && !isCurrentStep) {
      return null; // Don't render at all in wizard mode if not current step
    }

    return (
      <section className="card" style={{ marginBottom: 12 }}>
        <div
          className="card-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>{title}</div>
          {!wizardMode && (
            <button type="button" onClick={onToggle} className="no-print">
              {openFlag ? "Hide" : "Show"}
            </button>
          )}
        </div>
        {shouldShow && (
          <>
            <div className="card-body">{children}</div>
            {wizardMode && (
              <div
                className="no-print"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "16px",
                  borderTop: "1px solid #ddd",
                  gap: "12px",
                }}
              >
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  style={{
                    visibility: currentStep === 0 ? "hidden" : "visible",
                    padding: "10px 24px",
                    fontSize: "16px",
                    fontWeight: "500",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={nextStep}
                  disabled={currentStep === steps.length - 1}
                  style={{
                    padding: "10px 32px",
                    fontSize: "16px",
                    fontWeight: "600",
                    backgroundColor: "#0284c7",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: currentStep === steps.length - 1 ? "default" : "pointer",
                    opacity: currentStep === steps.length - 1 ? 0.5 : 1,
                  }}
                >
                  {currentStep === steps.length - 1 ? "Finish" : "Next →"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    );
  };
  // Force the layout even if CSS helper classes aren't present
// Helper functions for percentage <-> decimal conversion
const toPercent = (decimal) => {
  const num = parseFloat(decimal);
  return isNaN(num) ? '' : String(num * 100);
};

const fromPercent = (percent) => {
  const num = parseFloat(percent);
  return isNaN(num) ? '0' : String(num / 100);
};

const FieldRow = ({ label, children, help }) => (
  <div className="field-row">
    <div style={{ opacity: 0.9, textAlign: 'left' }}>
      {label}
      {help && <HelpToggle text={help} />}
    </div>
    <div>{children}</div>
  </div>
);

const TwoCol = ({ left, right }) => (
  <div className="two-col">
    {left}
    {right}
  </div>
);

const SectionBox = ({ title, titleColor = "#0066cc", children }) => (
  <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #dee2e6', marginBottom: 12 }}>
    {title && (
      <div style={{ marginBottom: 16, fontWeight: "bold", fontSize: 15, color: titleColor }}>
        {title}
      </div>
    )}
    {children}
  </div>
);

// Help tooltip component
const HelpToggle = ({ text }) => {
  const [show, setShow] = React.useState(false);
  return (
    <span style={{ marginLeft: 6 }}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          background: 'none',
          border: '1px solid #999',
          borderRadius: '50%',
          width: 18,
          height: 18,
          fontSize: 11,
          cursor: 'pointer',
          color: '#666',
          padding: 0,
          lineHeight: '16px',
        }}
        title="Click for help"
      >
        ?
      </button>
      {show && (
        <div
          style={{
            fontSize: 12,
            color: '#666',
            backgroundColor: '#f9f9f9',
            padding: 8,
            marginTop: 4,
            borderRadius: 4,
            border: '1px solid #ddd',
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
};

  const MiniHelp = ({ children }) => (
    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{children}</div>
  );
  const Card = ({ title, children }) => (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-body">{children}</div>
    </div>
  );
  const TotalLine = ({ label, value }) => (
    <div
      style={{
        borderTop: "1px solid #e7e7e7",
        paddingTop: 8,
        marginTop: 8,
        fontWeight: 700,
      }}
    >
      <span>{label}: </span>
      <span>£{fmt(value)}</span>
    </div>
  );

  return (
    <div className="grid" style={{ gap: 8 }}>

      {/* Wizard Start Screen */}
      {wizardMode && currentStep === -1 && (
        <div
          className="card"
          style={{
            padding: 24,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <h2>Welcome to RetirePlan Quickcheck</h2>
          <p style={{ marginBottom: 24, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            This calculator will guide you through 5 sections to build your retirement plan:
          </p>
          <div style={{ textAlign: "left", maxWidth: 500, marginLeft: "auto", marginRight: "auto", marginBottom: 24 }}>
            {steps.map((step, i) => (
              <div key={step.key} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                <strong>Step {i + 1}:</strong> {step.title}
              </div>
            ))}
          </div>
          <button
            onClick={startWizard}
            style={{
              fontSize: 20,
              padding: "16px 48px",
              fontWeight: "bold",
              backgroundColor: "#0284c7",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0369a1"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#0284c7"}
          >
            START PLANNING
          </button>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={exitWizard}
              style={{
                fontSize: 14,
                padding: "8px 16px",
                color: "#64748b",
                backgroundColor: "transparent",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Use classic view instead
            </button>
          </div>
        </div>
      )}

      {/* Wizard Progress Indicator */}
      {wizardMode && currentStep >= 0 && (
        <div
          className="no-print"
          style={{
            background: "#f0f9ff",
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid #bae6fd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "500" }}>
            <strong>Step {currentStep + 1} of {steps.length}:</strong> {steps[currentStep].title}
          </div>
          <button
            onClick={exitWizard}
            style={{
              fontSize: 14,
              padding: "6px 16px",
              color: "#475569",
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Exit wizard
          </button>
        </div>
      )}

      {/* Classic Mode - Switch to Wizard Button */}
      {!wizardMode && (
        <div
          className="no-print"
          style={{
            background: "#f0f9ff",
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid #bae6fd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "500" }}>
            <strong>Classic View:</strong> All sections visible
          </div>
          <button
            onClick={startWizard}
            style={{
              fontSize: 14,
              padding: "8px 20px",
              fontWeight: "600",
              backgroundColor: "#0284c7",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Switch to wizard mode
          </button>
        </div>
      )}

      {/* Save / Print / Export */}
      <HeaderLayout>
        <SaveBar
          inputs={inputsNum}
          outputs={out}
          hasUnsavedChanges={hasUnsavedChanges}
          onSaveSuccess={() => {
            setHasUnsavedChanges(false);
            setLastCloudSave(); // Update shared cloud save timestamp
          }}
          onCloudLoadStart={() => {
            console.log('☁️ At Retirement: Cloud load starting');
            cloudLoadPendingRef.current = true;
          }}
          onCloudLoadComplete={() => {
            console.log('☁️ At Retirement: Cloud load complete');
            cloudLoadPendingRef.current = false;
            // Mark initial load as complete now that cloud data has loaded
            isInitialLoadRef.current = false;
            setHasUnsavedChanges(false); // Cloud data just loaded, so no unsaved changes
          }}
          onImportJson={(data) => {
            console.log('📥 Importing JSON data:', data);

            // Temporarily mark as loading to prevent unsaved changes flag
            isInitialLoadRef.current = true;

            // Handle numeric inputs from exported JSON - convert to strings for form
            if (data?.inputs) {
              const formData = {};
              Object.entries(data.inputs).forEach(([key, value]) => {
                // Skip dbSchemes - handled separately
                if (key === 'dbSchemes') return;
                // Convert numbers to strings for form fields
                if (typeof value === 'number') {
                  formData[key] = String(value);
                } else if (typeof value === 'boolean') {
                  formData[key] = value;
                } else if (typeof value === 'string') {
                  formData[key] = value;
                }
              });
              setForm((f) => ({ ...f, ...formData }));

              // Handle dbSchemes separately - convert numeric values to strings
              if (Array.isArray(data.inputs.dbSchemes)) {
                const convertedSchemes = data.inputs.dbSchemes.map(scheme => ({
                  ...scheme,
                  accrualDenominator: String(scheme.accrualDenominator ?? ''),
                  serviceYearsToDate: String(scheme.serviceYearsToDate ?? ''),
                  maxServiceYears: String(scheme.maxServiceYears ?? ''),
                  pensionableSalaryNow: String(scheme.pensionableSalaryNow ?? ''),
                  preservedPensionNow: String(scheme.preservedPensionNow ?? ''),
                  revaluationAssumption: String(scheme.revaluationAssumption ?? ''),
                  salaryAtLeaving: String(scheme.salaryAtLeaving ?? ''),
                }));
                console.log('📥 Setting dbSchemes:', convertedSchemes);
                setDbSchemes(convertedSchemes);
              }
            } else if (data?.form) {
              setForm(data.form);
              if (Array.isArray(data?.dbSchemes)) setDbSchemes(data.dbSchemes);
            }

            // Save to sessionStorage
            saveAutosave({
              form: data.inputs ? formData : data.form ?? form,
              dbSchemes: data.inputs?.dbSchemes ?? data.dbSchemes ?? dbSchemes,
            });

            // Reset loading flag and clear unsaved changes after data loads (longer than auto-save debounce)
            setTimeout(() => {
              isInitialLoadRef.current = false;
              setHasUnsavedChanges(false); // Data just loaded from cloud, so no unsaved changes
              console.log('✅ Import complete - no unsaved changes');
            }, 1000);
          }}
          onClearLocal={() => {
            clearAutosave();
            alert("Local data cleared");
          }}
        />
      </HeaderLayout>

      {/* ================== PAGE 1: INPUTS ================== */}
      <div className="print-page">
        {/* CORE ASSUMPTIONS */}
        <Section
          title="CORE ASSUMPTIONS"
          sectionKey="core"
          openFlag={open.core}
          onToggle={() => toggle("core")}
        >
          <div className="core-grid">
            {/* Left Column: User Details */}
            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #dee2e6' }}>
              <div style={{ marginBottom: 16, fontWeight: "bold", fontSize: 15, color: "#0066cc" }}>
                Your Details (Required)
              </div>

              <FieldRow
                label="Date of birth"
                help="Your date of birth is used to calculate your State Pension Age and years to retirement."
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Txt
                    value={form.dateOfBirth.split('-')[2] || '01'}
                    onCommit={(v) => {
                      const [y, m] = form.dateOfBirth.split('-');
                      const day = String(Math.max(1, Math.min(31, Number(v) || 1))).padStart(2, '0');
                      set({ dateOfBirth: `${y}-${m}-${day}` });
                    }}
                    style={{ width: 40, textAlign: 'center' }}
                    placeholder="DD"
                    inputMode="numeric"
                  />
                  <span>/</span>
                  <Txt
                    value={form.dateOfBirth.split('-')[1] || '01'}
                    onCommit={(v) => {
                      const [y, , d] = form.dateOfBirth.split('-');
                      const month = String(Math.max(1, Math.min(12, Number(v) || 1))).padStart(2, '0');
                      set({ dateOfBirth: `${y}-${month}-${d}` });
                    }}
                    style={{ width: 40, textAlign: 'center' }}
                    placeholder="MM"
                    inputMode="numeric"
                  />
                  <span>/</span>
                  <Txt
                    value={form.dateOfBirth.split('-')[0] || '1965'}
                    onCommit={(v) => {
                      const [, m, d] = form.dateOfBirth.split('-');
                      const year = Math.max(1900, Math.min(2100, Number(v) || 1965));
                      set({ dateOfBirth: `${year}-${m}-${d}` });
                    }}
                    style={{ width: 60, textAlign: 'center' }}
                    placeholder="YYYY"
                    inputMode="numeric"
                  />
                </div>
              </FieldRow>

              <FieldRow
                label={`Retirement age (years) ${
                  form.alreadyRetired ? "(locked)" : ""
                }`}
                help="The age at which you plan to retire. This can be earlier or later than your State Pension Age."
              >
                <Txt
                  value={form.retirementAge}
                  onCommit={(v) => set({ retirementAge: v })}
                  disabled={form.alreadyRetired}
                  style={{ width: 100 }}
                  inputMode="numeric"
                />
              </FieldRow>

              <FieldRow label="Already retired?">
                <label>
                  <input
                    type="checkbox"
                    checked={form.alreadyRetired}
                    onChange={(e) =>
                      set({ alreadyRetired: e.target.checked })
                    }
                  />{" "}
                  Yes
                </label>
              </FieldRow>

              <FieldRow label="I have a DB pension">
                <label>
                  <input
                    type="checkbox"
                    checked={form.hasDbPension}
                    onChange={(e) => set({ hasDbPension: e.target.checked })}
                  />{" "}
                  Yes
                </label>
              </FieldRow>

              <FieldRow
                label="Spend target (annual) (£)"
                help="Your desired annual spending in retirement, in today's money. This will be adjusted for inflation."
              >
                <div>
                  {lifestyleProfile && form.desiredSpendAnnual == lifestyleProfile.baselineAmount && (
                    <div style={{ marginBottom: 6, fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>✓</span>
                      <span>From your lifestyle profile ("{lifestyleProfile.profileName}")</span>
                      <button
                        onClick={() => navigate('/lifestyle')}
                        style={{ marginLeft: 6, color: '#0284c7', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {!lifestyleProfile && !loadingProfile && (
                    <div style={{ marginBottom: 6, fontSize: 12, color: '#64748b' }}>
                      <button
                        onClick={() => navigate('/lifestyle')}
                        style={{ color: '#0284c7', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                      >
                        Need help? Discover your lifestyle profile
                      </button>
                    </div>
                  )}
                  <Txt
                    value={form.desiredSpendAnnual}
                    onCommit={(v) => set({ desiredSpendAnnual: v })}
                    style={{ width: 140 }}
                    inputMode="numeric"
                  />
                </div>
              </FieldRow>
            </div>

            {/* Right Column: Default Assumptions */}
            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #dee2e6' }}>
              <div style={{ marginBottom: 16, fontWeight: "bold", fontSize: 15, color: "#666" }}>
                Default Assumptions (Optional)
              </div>

              <FieldRow label="Region">
                <select
                  value={form.region}
                  onChange={(e) => set({ region: e.target.value })}
                >
                  <option value="EWNI">England/Wales/Northern Ireland</option>
                  <option value="Scotland">Scotland</option>
                </select>
              </FieldRow>

              <FieldRow
                label="State Pension Age"
                help="Automatically calculated based on your date of birth using current UK State Pension Age rules."
              >
                <div style={{ fontWeight: "bold", color: "#666" }}>
                  {formatStatePensionAge(calculateStatePensionAge(form.dateOfBirth))}
                </div>
              </FieldRow>

              <FieldRow
                label="State Pension (annual)"
                help="The maximum new State Pension is currently £11,973/year. You can check your personal entitlement at gov.uk/check-state-pension"
              >
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span>£</span>
                  <Txt
                    value={form.statePensionAnnual}
                    onCommit={(v) => set({ statePensionAnnual: v })}
                    style={{ width: 120 }}
                    inputMode="numeric"
                  />
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    (Default: £{Math.round(230.25 * 52).toLocaleString()})
                  </span>
                </div>
              </FieldRow>

              <FieldRow
                label="Inflation assumption"
                help="Expected annual inflation rate. Used to project future values in today's money. Default is 2.5%."
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Txt
                    value={toPercent(form.inflationAssumption)}
                    onCommit={(v) => set({ inflationAssumption: fromPercent(v) })}
                    style={{ width: 100 }}
                    inputMode="decimal"
                  />
                  <span>%</span>
                </div>
              </FieldRow>

              <div style={{ marginTop: 16, marginBottom: 8, fontWeight: "bold", fontSize: 14 }}>
                Growth Rates
              </div>

              <FieldRow
                label="DC pension growth"
                help="Expected annual growth rate for your DC pension pot before retirement. Default is 4%."
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Txt
                    value={toPercent(form.growthAssumption)}
                    onCommit={(v) => set({ growthAssumption: fromPercent(v) })}
                    style={{ width: 100 }}
                    inputMode="decimal"
                  />
                  <span>%</span>
                </div>
              </FieldRow>

              <FieldRow
                label="ISA growth"
                help="Expected annual growth rate for your ISA investments. Default is 3%."
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Txt
                    value={toPercent(form.isaRate)}
                    onCommit={(v) => set({ isaRate: fromPercent(v) })}
                    style={{ width: 100 }}
                    inputMode="decimal"
                  />
                  <span>%</span>
                </div>
              </FieldRow>

              <FieldRow
                label="Taxable savings growth"
                help="Expected annual growth rate for your taxable savings accounts. Default is 3%."
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Txt
                    value={toPercent(form.taxableSavingsRate)}
                    onCommit={(v) => set({ taxableSavingsRate: fromPercent(v) })}
                    style={{ width: 100 }}
                    inputMode="decimal"
                  />
                  <span>%</span>
                </div>
              </FieldRow>
            </div>
          </div>
        </Section>

        {/* DC PENSIONS */}
        <Section title="DC PENSIONS" sectionKey="dc" openFlag={open.dc} onToggle={() => toggle("dc")}>
          <SectionBox title="Current DC Pension">
            <TwoCol
              left={
                <FieldRow label="DC pot now (£)">
                  <Txt
                    value={form.dcPotNow}
                    onCommit={(v) => set({ dcPotNow: v })}
                    style={{ width: 160 }}
                    inputMode="numeric"
                  />
                </FieldRow>
              }
              right={
                <FieldRow label="Take 25% tax-free from DC?">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.takeDCTaxFree25}
                      onChange={(e) => set({ takeDCTaxFree25: e.target.checked })}
                    />{" "}
                    Yes
                  </label>
                </FieldRow>
              }
            />
          </SectionBox>

          <SectionBox title="Future Contributions">
            <FieldRow label="Still contributing to a DC pension?">
            <label>
              <input
                type="checkbox"
                checked={form.dcIsContributing}
                onChange={(e) => set({ dcIsContributing: e.target.checked })}
              />{" "}
              Yes
            </label>
          </FieldRow>

          {form.dcIsContributing && (
            <>
              <FieldRow label="Contribution type">
                <label>
                  <input
                    type="radio"
                    name="dcType"
                    value="employer"
                    checked={form.dcContributionType === "employer"}
                    onChange={(e) => set({ dcContributionType: e.target.value })}
                  />{" "}
                  Employer scheme
                </label>
                <label style={{ marginLeft: 16 }}>
                  <input
                    type="radio"
                    name="dcType"
                    value="personal"
                    checked={form.dcContributionType === "personal"}
                    onChange={(e) => set({ dcContributionType: e.target.value })}
                  />{" "}
                  Personal / SIPP
                </label>
              </FieldRow>

              {form.dcContributionType === "employer" ? (
                <>
                  <TwoCol
                    left={
                      <FieldRow label="Salary now (£)">
                        <Txt
                          value={form.salaryNow}
                          onCommit={(v) => set({ salaryNow: v })}
                          style={{ width: 140 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                    right={<></>}
                  />
                  <TwoCol
                    left={
                      <FieldRow label="Your contribution (%)">
                        <Txt
                          value={toPercent(form.eePct)}
                          onCommit={(v) => set({ eePct: fromPercent(v) })}
                          style={{ width: 100 }}
                          inputMode="decimal"
                        />
                      </FieldRow>
                    }
                    right={
                      <FieldRow label="Employer contribution (%)">
                        <Txt
                          value={toPercent(form.erPct)}
                          onCommit={(v) => set({ erPct: fromPercent(v) })}
                          style={{ width: 100 }}
                          inputMode="decimal"
                        />
                      </FieldRow>
                    }
                  />
                </>
              ) : (
                <TwoCol
                  left={
                    <FieldRow label="Annual contribution (£)">
                      <Txt
                        value={form.personalAnnualContrib}
                        onCommit={(v) => set({ personalAnnualContrib: v })}
                        style={{ width: 140 }}
                        inputMode="numeric"
                      />
                    </FieldRow>
                  }
                  right={
                    <FieldRow label="Escalation per year (%) (uses inflation by default)">
                      <Txt
                        value={"(inflation)"} // purely display hint; calculation uses inflation
                        onCommit={() => {}}
                        style={{ width: 120 }}
                        disabled
                      />
                    </FieldRow>
                  }
                />
              )}
            </>
          )}
          </SectionBox>

          <SectionBox title="Withdrawal Method">
            <FieldRow label="Drawdown rate">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Txt
                  value={toPercent(form.drawdownRate)}
                  onCommit={(v) => set({ drawdownRate: fromPercent(v) })}
                  style={{ width: 90 }}
                  inputMode="decimal"
                />
                <span>%</span>
              </div>
            </FieldRow>
            <FieldRow label="Annuity rate">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Txt
                  value={toPercent(form.annuityRate)}
                  onCommit={(v) => set({ annuityRate: fromPercent(v) })}
                  style={{ width: 90 }}
                  inputMode="decimal"
                />
                <span>%</span>
              </div>
            </FieldRow>
            <FieldRow label="% of pot to annuitize">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Txt
                  value={form.dcAnnuityPct}
                  onCommit={(v) => set({ dcAnnuityPct: v })}
                  style={{ width: 90 }}
                  inputMode="decimal"
                />
                <span>%</span>
                <span style={{ fontSize: "13px", color: "#64748b", marginLeft: 8 }}>
                  (0=all drawdown, 100=all annuity)
                </span>
              </div>
            </FieldRow>
          </SectionBox>

          <MiniHelp>
            DC pot is projected with contributions; 25% PCLS applies but total
            DC+DB PCLS is capped at £268,275 (DB PCLS restricted after DC).
            Employer path uses <em>start-of-year</em> salary; personal
            contributions escalate with inflation.
          </MiniHelp>
        </Section>

        {/* DB PENSIONS */}
        {form.hasDbPension && (
          <Section title="DB PENSIONS" sectionKey="db" openFlag={open.db} onToggle={() => toggle("db")}>
            {dbSchemes
              .filter((s) => s.kind === "active")
              .map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                  }}
                >
                  <strong>Active final-salary scheme</strong>
                  <TwoCol
                    left={
                      <FieldRow label="Accrual denominator (e.g., 60)">
                        <Txt
                          value={s.accrualDenominator}
                          onCommit={(v) =>
                            updateScheme(s.id, { accrualDenominator: v })
                          }
                          style={{ width: 100 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                    right={
                      <FieldRow label="Service years to date">
                        <Txt
                          value={s.serviceYearsToDate}
                          onCommit={(v) =>
                            updateScheme(s.id, { serviceYearsToDate: v })
                          }
                          style={{ width: 100 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                  />
                  <TwoCol
                    left={
                      <FieldRow label="Max service years (optional)">
                        <Txt
                          value={s.maxServiceYears}
                          onCommit={(v) =>
                            updateScheme(s.id, { maxServiceYears: v })
                          }
                          style={{ width: 100 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                    right={
                      <FieldRow label="Pensionable salary now (£)">
                        <Txt
                          value={s.pensionableSalaryNow}
                          onCommit={(v) =>
                            updateScheme(s.id, { pensionableSalaryNow: v })
                          }
                          style={{ width: 140 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                  />
                </div>
              ))}

            {dbSchemes
              .filter((s) => s.kind === "deferred")
              .map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: "1px dashed #ddd",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                  }}
                >
                  <strong>Deferred scheme</strong>
                  <TwoCol
                    left={
                      <FieldRow label="Preserved pension now (annual)">
                        <Txt
                          value={s.preservedPensionNow}
                          onCommit={(v) =>
                            updateScheme(s.id, { preservedPensionNow: v })
                          }
                          style={{ width: 140 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                    right={
                      <FieldRow label="Revaluation assumption (%)">
                        <Txt
                          value={s.revaluationAssumption}
                          onCommit={(v) =>
                            updateScheme(s.id, { revaluationAssumption: v })
                          }
                          style={{ width: 100 }}
                          inputMode="decimal"
                        />
                      </FieldRow>
                    }
                  />
                  <div style={{ marginTop: 6, marginBottom: 6, fontWeight: 600 }}>
                    Or derive preserved:
                  </div>
                  <TwoCol
                    left={
                      <FieldRow label="Accrual denominator (e.g., 60)">
                        <Txt
                          value={s.accrualDenominator}
                          onCommit={(v) =>
                            updateScheme(s.id, { accrualDenominator: v })
                          }
                          style={{ width: 100 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                    right={
                      <FieldRow label="Service years to date">
                        <Txt
                          value={s.serviceYearsToDate}
                          onCommit={(v) =>
                            updateScheme(s.id, { serviceYearsToDate: v })
                          }
                          style={{ width: 100 }}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    }
                  />
                  <FieldRow label="Salary at leaving (£)">
                    <Txt
                      value={s.salaryAtLeaving}
                      onCommit={(v) =>
                        updateScheme(s.id, { salaryAtLeaving: v })
                      }
                      style={{ width: 140 }}
                      inputMode="numeric"
                    />
                  </FieldRow>
                  <div>
                    <button type="button" onClick={() => removeScheme(s.id)}>
                      Remove deferred scheme
                    </button>
                  </div>
                </div>
              ))}

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label>
                <input
                  type="checkbox"
                  checked={form.takeDBTaxFree25}
                  onChange={(e) => set({ takeDBTaxFree25: e.target.checked })}
                />{" "}
                Take 25% tax-free from total DB (20× model; overall cap enforced)
              </label>
              <button type="button" onClick={addDeferred}>
                Add deferred DB scheme
              </button>
            </div>
          </Section>
        )}

        {/* SAVINGS & OTHER — tidy rows */}
        <Section
          title="SAVINGS & OTHER"
          sectionKey="savings"
          openFlag={open.savings}
          onToggle={() => toggle("savings")}
        >
          <SectionBox>
            <FieldRow label="ISA">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <span>Balance £</span>
                <Txt
                  value={form.isaBalance}
                  onCommit={(v) => set({ isaBalance: v })}
                  style={{ width: 110 }}
                  inputMode="numeric"
                />
                <span>Add/yr £</span>
                <Txt
                  value={form.isaAddPerYear}
                  onCommit={(v) => set({ isaAddPerYear: v })}
                  style={{ width: 110 }}
                  inputMode="numeric"
                />
              </div>
            </FieldRow>

            <FieldRow label="Taxable savings">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <span>Balance £</span>
                <Txt
                  value={form.taxableSavingsBalance}
                  onCommit={(v) => set({ taxableSavingsBalance: v })}
                  style={{ width: 110 }}
                  inputMode="numeric"
                />
                <span>Add/yr £</span>
                <Txt
                  value={form.taxableSavingsAddPerYear}
                  onCommit={(v) => set({ taxableSavingsAddPerYear: v })}
                  style={{ width: 110 }}
                  inputMode="numeric"
                />
              </div>
            </FieldRow>

            <FieldRow label="Property income (now)">
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span>Annual £</span>
                <Txt
                  value={form.propertyIncomeNow}
                  onCommit={(v) => set({ propertyIncomeNow: v })}
                  style={{ width: 140 }}
                  inputMode="numeric"
                />
              </div>
            </FieldRow>

            <FieldRow label="Dividend income (now)">
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span>Annual £</span>
                <Txt
                  value={form.dividendIncomeNow}
                  onCommit={(v) => set({ dividendIncomeNow: v })}
                  style={{ width: 140 }}
                  inputMode="numeric"
                />
              </div>
            </FieldRow>

            <FieldRow label="Any other income (now)">
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span>Annual £</span>
                <Txt
                  value={form.anyOtherIncomeNow}
                  onCommit={(v) => set({ anyOtherIncomeNow: v })}
                  style={{ width: 140 }}
                  inputMode="numeric"
                />
              </div>
            </FieldRow>
          </SectionBox>
        </Section>
      </div>

      {/* ================== PAGE 2: OUTPUTS ================== */}
      <AtRetirementResults
        yearsToRetirement={yearsToRetirement}
        income={income}
        assets={assets}
        assetsTotal={assetsTotal}
        incomeGrossTotal={incomeGrossTotal}
        estTax={estTax}
        netIncome={netIncome}
        surplusDeficit={surplusDeficit}
        real={real}
        spaWarning={spaWarning}
        form={form}
        inputsNum={inputsNum}
        dbSchemes={dbSchemes}
        model={model}
        setModel={setModel}
        applyModelToForm={applyModelToForm}
        resetModel={resetModel}
        open={open}
        toggle={toggle}
        fmt={fmt}
        N={N}
        saveAutosave={saveAutosave}
        loadAutosave={loadAutosave}
      />
      </div>
    </div>
  );
}
