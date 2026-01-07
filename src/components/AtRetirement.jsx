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
import CoreAssumptions from "./CoreAssumptions.jsx";
import DCPensionSection from "./DCPensionSection.jsx";
import DBSchemesSection from "./DBSchemesSection.jsx";
import SavingsAndOtherSection from "./SavingsAndOtherSection.jsx";
import ConversationalWizard from "./ConversationalWizard.jsx";
import DCPensionWizard from "./DCPensionWizard.jsx";
import DBPensionWizard from "./DBPensionWizard.jsx";
import SavingsWizard from "./SavingsWizard.jsx";
import ResultsWizard from "./ResultsWizard.jsx";
import ProjectionWizard from "./ProjectionWizard.jsx";
import { loadAutosave, saveAutosave, clearAutosave, getLastCloudSave, setLastCloudSave } from "../utils/persist.js";
import { transformToProjectionEvents } from "../utils/lifestyleProfile.js";
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
    hasDcPension: true, // Track if user has DC pension
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

  // ===== Projection State =====
  const [isaRecurringAmount, setIsaRecurringAmount] = useState("");
  const [isaRecurringYears, setIsaRecurringYears] = useState("");
  const [dcDrawdownPercent, setDcDrawdownPercent] = useState("4.0");
  const [lifeEvents, setLifeEvents] = useState([]);

  // ===== Wizard Mode =====
  const [wizardMode, setWizardMode] = useState(true); // Default to wizard mode
  const [currentStep, setCurrentStep] = useState(-1); // -1 = start screen, 0-5 = steps

  const steps = [
    { key: 'core', title: 'CORE ASSUMPTIONS' },
    { key: 'dc', title: 'DC PENSIONS' },
    { key: 'db', title: 'DB PENSIONS' },
    { key: 'savings', title: 'SAVINGS & OTHER' },
    { key: 'results', title: 'RESULTS & MODELLING' },
    { key: 'projection', title: '25-YEAR PROJECTION' },
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
      if (!f.alreadyRetired || !f.dateOfBirth) return f;
      // Compute integer age now from DOB
      const dob = new Date(f.dateOfBirth);
      if (isNaN(dob.getTime())) return f; // Invalid date
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

    const dob = new Date(form.dateOfBirth || '1965-01-01');
    const now = new Date();
    const yearsBetween = (d1, d2) => {
      if (!d1 || !d2 || isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
      return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 365.2425);
    };
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

    const {
      form: savedForm,
      dbSchemes: savedSchemes,
      model: savedModel,
      projection: savedProjection
    } = snap;

    // Automatically restore saved data
    if (savedForm && typeof savedForm === "object") {
      console.log('✅ At Retirement: Auto-restoring form data');
      setForm(prevForm => ({ ...prevForm, ...savedForm }));
    }
    if (Array.isArray(savedSchemes)) {
      console.log('✅ At Retirement: Auto-restoring DB schemes');
      setDbSchemes(savedSchemes);
    }
    if (savedModel) {
      console.log('✅ At Retirement: Auto-restoring model');
      setModel(savedModel);
    }
    if (savedProjection) {
      console.log('✅ At Retirement: Auto-restoring projection data');
      if (savedProjection.isaRecurringAmount !== undefined) {
        setIsaRecurringAmount(savedProjection.isaRecurringAmount);
      }
      if (savedProjection.isaRecurringYears !== undefined) {
        setIsaRecurringYears(savedProjection.isaRecurringYears);
      }
      if (savedProjection.dcDrawdownPercent !== undefined) {
        setDcDrawdownPercent(savedProjection.dcDrawdownPercent);
      }
      if (Array.isArray(savedProjection.lifeEvents)) {
        setLifeEvents(savedProjection.lifeEvents);
      }
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
    console.log('🎬 At Retirement: Lifestyle profile useEffect triggered!');
    console.log('  isAuthenticated:', isAuthenticated);

    const loadProfile = async () => {
      try {
        let profile = null;

        // Try cloud if authenticated
        if (isAuthenticated) {
          console.log('🔍 At Retirement: User authenticated, attempting cloud load...');
          const audience = import.meta.env.VITE_API_AUDIENCE;
          console.log('  audience:', audience);
          if (audience) {
            console.log('🔑 At Retirement: Getting access token...');
            const token = await getAccessToken(audience);
            console.log('📡 At Retirement: Fetching /api/me/lifestyle...');
            const res = await fetch('/api/me/lifestyle', {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📡 At Retirement: API response status:', res.status);
            if (res.ok) {
              profile = await res.json();
              console.log('✅ Loaded lifestyle profile from cloud:', profile);
              console.log('📋 Exceptional items:', profile?.exceptionalItems);
            } else {
              console.warn('❌ Cloud load failed:', res.status);
            }
          } else {
            console.log('⚠️ No API audience configured');
          }
        } else {
          console.log('🔍 At Retirement: User not authenticated, trying sessionStorage...');
        }

        // Fallback to sessionStorage if not authenticated or cloud failed
        if (!profile) {
          console.log('💾 At Retirement: Checking sessionStorage...');
          const stored = sessionStorage.getItem('retireplan.lifestyleProfile');
          console.log('  stored:', stored ? 'found' : 'not found');
          if (stored) {
            profile = JSON.parse(stored);
            console.log('✅ Loaded lifestyle profile from sessionStorage:', profile);
          } else {
            console.log('⚠️ No lifestyle profile in sessionStorage');
          }
        }

        if (profile) {
          setLifestyleProfile(profile);

          // CRITICAL FIX: Always use lifestyle profile baseline if it exists
          // This should override any old calculator values from cloud data
          if (profile.baselineAmount) {
            console.log('🔄 Overwriting desiredSpendAnnual with lifestyle profile baseline');
            console.log('  Old value:', form.desiredSpendAnnual);
            console.log('  New value (from profile):', profile.baselineAmount);
            setForm(f => ({
              ...f,
              desiredSpendAnnual: String(profile.baselineAmount)
            }));
            console.log('✅ Set baseline expenditure from lifestyle profile');
          }

          // CRITICAL FIX: Transform exceptional items into life events for ProjectionWizard
          if (profile.exceptionalItems && profile.exceptionalItems.length > 0) {
            console.log('🎯 Profile has exceptional items, transforming to life events...');
            const retirementAge = Number(form.retirementAge) || 65;
            console.log('📅 Retirement age:', retirementAge);

            const newProfileEvents = transformToProjectionEvents(
              profile.exceptionalItems,
              retirementAge
            );
            console.log('🔄 Transformed events:', newProfileEvents);

            // Smart merge: Remove old profile-sourced events, keep manual events, add new profile events
            setLifeEvents(currentEvents => {
              const manualEvents = currentEvents.filter(e => e.source !== 'lifestyleProfile');
              const mergedEvents = [...manualEvents, ...newProfileEvents];
              console.log(`✅ Smart merge: ${manualEvents.length} manual + ${newProfileEvents.length} profile = ${mergedEvents.length} total events`);
              return mergedEvents;
            });
          }
        }
      } catch (e) {
        console.error('❌ Failed to load lifestyle profile:', e);
        console.error('  Error details:', e.message, e.stack);
      } finally {
        console.log('🏁 At Retirement: Lifestyle profile loading complete');
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
        projection: {
          isaRecurringAmount,
          isaRecurringYears,
          dcDrawdownPercent,
          lifeEvents,
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
    isaRecurringAmount,
    isaRecurringYears,
    dcDrawdownPercent,
    lifeEvents,
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
    <div className="grid" style={{ gap: 8, paddingBottom: '100px' }}>

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

      {/* Jump to Section Dropdown */}
      {wizardMode && currentStep >= 0 && (
        <div
          className="no-print"
          style={{
            backgroundColor: '#f8fafc',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
          }}
        >
          <label htmlFor="section-jump" style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#64748b',
            marginBottom: '8px',
          }}>
            Jump to Section:
          </label>
          <select
            id="section-jump"
            value={currentStep}
            onChange={(e) => {
              setCurrentStep(Number(e.target.value));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '16px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            <option value={0}>1. Core Assumptions</option>
            <option value={1}>2. DC Pensions</option>
            <option value={2}>3. DB Pensions</option>
            <option value={3}>4. Savings & Other Income</option>
            <option value={4}>5. Results & Modeling</option>
            <option value={5}>6. 25-Year Projection</option>
          </select>
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
      <HeaderLayout hasUnsavedChanges={hasUnsavedChanges}>
        <SaveBar
          inputs={inputsNum}
          outputs={out}
          projection={{
            isaRecurringAmount,
            isaRecurringYears,
            dcDrawdownPercent,
            lifeEvents,
          }}
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
            // BAND-AID FIX: This is now called from within onImportJson after state updates complete
            // (Only called by SaveBar for error cases or when no data found)
            console.log('☁️ At Retirement: Cloud load complete');
            cloudLoadPendingRef.current = false;
            isInitialLoadRef.current = false;
            setHasUnsavedChanges(false);
          }}
          onImportJson={(data) => {
            console.log('📥 Importing JSON data:', data);

            // Temporarily mark as loading to prevent unsaved changes flag
            isInitialLoadRef.current = true;

            // Declare formData outside if block to avoid scope issues
            let formData = {};

            // Handle numeric inputs from exported JSON - convert to strings for form
            if (data?.inputs) {
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

              // BAND-AID FIX: Preserve lifestyle profile baseline if cloud data is empty
              // This prevents cloud import from overwriting lifestyle profile data
              setForm((f) => {
                const merged = { ...f, ...formData };

                // If cloud data has no desiredSpendAnnual but we have one from lifestyle profile, keep it
                if ((!formData.desiredSpendAnnual || formData.desiredSpendAnnual === '') &&
                    f.desiredSpendAnnual &&
                    lifestyleProfile?.baselineAmount) {
                  console.log('🔒 Preserving lifestyle profile baseline:', f.desiredSpendAnnual);
                  merged.desiredSpendAnnual = f.desiredSpendAnnual;
                }

                return merged;
              });

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

            // BAND-AID FIX: Complete the cloud load sequence AFTER state updates finish
            // This ensures proper timing for any downstream operations
            setTimeout(() => {
              console.log('☁️ At Retirement: Cloud load complete (called from onImportJson)');
              cloudLoadPendingRef.current = false;
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
        {/* CORE ASSUMPTIONS - Conversational wizard or classic form */}
        {wizardMode && currentStep === 0 ? (
          <ConversationalWizard
            form={form}
            set={set}
            onComplete={() => {
              console.log('✅ Conversational wizard Phase 1 complete');
              console.log('   hasDcPension:', form.hasDcPension);
              console.log('   Current step before navigation:', currentStep);
              // Skip DC wizard if user doesn't have a DC pension
              if (!form.hasDcPension) {
                console.log('⏭️  Skipping DC Pension wizard (user has no DC pension)');
                setCurrentStep(2); // Skip to DB Pensions
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                console.log('➡️  Advancing to DC Pension wizard');
                nextStep(); // Advance to DC Pensions section
              }
            }}
          />
        ) : (
          <CoreAssumptions
            form={form}
            set={set}
            lifestyleProfile={lifestyleProfile}
            loadingProfile={loadingProfile}
            Section={Section}
            FieldRow={FieldRow}
            Txt={Txt}
            HelpToggle={HelpToggle}
            toPercent={toPercent}
            fromPercent={fromPercent}
            calculateStatePensionAge={calculateStatePensionAge}
            formatStatePensionAge={formatStatePensionAge}
            open={open}
            toggle={toggle}
          />
        )}

        {/* DC PENSIONS - Conversational wizard or classic form */}
        {(() => {
          console.log('🔍 DC Section: wizardMode=', wizardMode, 'currentStep=', currentStep, 'hasDcPension=', form.hasDcPension);
          if (wizardMode && currentStep === 1) {
            console.log('✅ Rendering DCPensionWizard');
            return (
              <DCPensionWizard
                form={form}
                set={set}
                onComplete={() => {
                  console.log('✅ DC Pension wizard complete');
                  // Skip DB wizard if user doesn't have a DB pension
                  if (!form.hasDbPension) {
                    console.log('⏭️  Skipping DB Pension wizard (user has no DB pension)');
                    setCurrentStep(3); // Skip to Savings & Other
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    nextStep(); // Advance to DB Pensions section
                  }
                }}
              />
            );
          } else if (!wizardMode) {
            console.log('📋 Rendering DCPensionSection (classic mode)');
            return (
              <DCPensionSection
                form={form}
                set={set}
                Section={Section}
                FieldRow={FieldRow}
                SectionBox={SectionBox}
                TwoCol={TwoCol}
                Txt={Txt}
                toPercent={toPercent}
                fromPercent={fromPercent}
                open={open}
                toggle={toggle}
              />
            );
          } else {
            console.log('⏭️  Skipping DC section (wizard mode, step ' + currentStep + ')');
            return null;
          }
        })()}

        {/* DB PENSIONS - Conversational wizard or classic form */}
        {wizardMode && currentStep === 2 ? (
          <DBPensionWizard
            form={form}
            set={set}
            dbSchemes={dbSchemes}
            updateScheme={updateScheme}
            removeScheme={removeScheme}
            addDeferred={addDeferred}
            onComplete={() => {
              console.log('✅ DB Pension wizard complete');
              nextStep(); // Advance to Savings & Other section
            }}
          />
        ) : !wizardMode ? (
          <DBSchemesSection
            form={form}
            set={set}
            dbSchemes={dbSchemes}
            updateScheme={updateScheme}
            removeScheme={removeScheme}
            addDeferred={addDeferred}
            Section={Section}
            FieldRow={FieldRow}
            TwoCol={TwoCol}
            Txt={Txt}
            open={open}
            toggle={toggle}
          />
        ) : null}

        {/* SAVINGS & OTHER - Conversational wizard or classic form */}
        {wizardMode && currentStep === 3 ? (
          <SavingsWizard
            form={form}
            set={set}
            onComplete={() => {
              console.log('✅ Savings wizard complete');
              nextStep(); // Advance to Results section
            }}
          />
        ) : !wizardMode ? (
          <SavingsAndOtherSection
            form={form}
            set={set}
            Section={Section}
            FieldRow={FieldRow}
            SectionBox={SectionBox}
            Txt={Txt}
            open={open}
            toggle={toggle}
          />
        ) : null}
      </div>

      {/* ================== PAGE 2: OUTPUTS ================== */}
      {/* Show ResultsWizard in wizard mode, AtRetirementResults in classic mode */}
      {wizardMode && currentStep === 4 ? (
        <ResultsWizard
          results={{
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
          }}
          form={form}
          dbSchemes={dbSchemes}
          model={model}
          setModel={setModel}
          applyModelToForm={applyModelToForm}
          inputsNum={inputsNum}
          setCurrentStep={setCurrentStep}
          navigate={navigate}
          saveAutosave={saveAutosave}
          loadAutosave={loadAutosave}
          onEditSection={(step) => {
            setCurrentStep(step);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          fmt={fmt}
          N={N}
        />
      ) : wizardMode && currentStep === 5 ? (
        <ProjectionWizard
          openingValues={{
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
          }}
          isaRecurringAmount={isaRecurringAmount}
          setIsaRecurringAmount={setIsaRecurringAmount}
          isaRecurringYears={isaRecurringYears}
          setIsaRecurringYears={setIsaRecurringYears}
          dcDrawdownPercent={dcDrawdownPercent}
          setDcDrawdownPercent={setDcDrawdownPercent}
          lifeEvents={lifeEvents}
          setLifeEvents={setLifeEvents}
          helpVisibility={{}}
          setHelpVisibility={() => {}}
          onBack={() => {
            setCurrentStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          navigate={navigate}
        />
      ) : !wizardMode ? (
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
          isaRecurringAmount={isaRecurringAmount}
          setIsaRecurringAmount={setIsaRecurringAmount}
          isaRecurringYears={isaRecurringYears}
          setIsaRecurringYears={setIsaRecurringYears}
          dcDrawdownPercent={dcDrawdownPercent}
          setDcDrawdownPercent={setDcDrawdownPercent}
          lifeEvents={lifeEvents}
          setLifeEvents={setLifeEvents}
          fmt={fmt}
          N={N}
          saveAutosave={saveAutosave}
          loadAutosave={loadAutosave}
        />
      ) : null}
    </div>
  );
}
