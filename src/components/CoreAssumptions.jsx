// src/components/CoreAssumptions.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * CoreAssumptions - User details and default assumptions section
 * Includes: DOB, retirement age, spend target, region, state pension, inflation, growth rates
 */
export default function CoreAssumptions({
  form,
  set,
  lifestyleProfile,
  loadingProfile,
  Section,
  FieldRow,
  Txt,
  HelpToggle,
  toPercent,
  fromPercent,
  calculateStatePensionAge,
  formatStatePensionAge,
  open,
  toggle,
}) {
  const navigate = useNavigate();

  return (
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
                value={form.dateOfBirth?.split('-')[2] || '01'}
                onCommit={(v) => {
                  const [y, m] = (form.dateOfBirth || '1965-01-01').split('-');
                  const day = String(Math.max(1, Math.min(31, Number(v) || 1))).padStart(2, '0');
                  set({ dateOfBirth: `${y}-${m}-${day}` });
                }}
                style={{ width: 40, textAlign: 'center' }}
                placeholder="DD"
                inputMode="numeric"
              />
              <span>/</span>
              <Txt
                value={form.dateOfBirth?.split('-')[1] || '01'}
                onCommit={(v) => {
                  const [y, , d] = (form.dateOfBirth || '1965-01-01').split('-');
                  const month = String(Math.max(1, Math.min(12, Number(v) || 1))).padStart(2, '0');
                  set({ dateOfBirth: `${y}-${month}-${d}` });
                }}
                style={{ width: 40, textAlign: 'center' }}
                placeholder="MM"
                inputMode="numeric"
              />
              <span>/</span>
              <Txt
                value={form.dateOfBirth?.split('-')[0] || '1965'}
                onCommit={(v) => {
                  const [, m, d] = (form.dateOfBirth || '1965-01-01').split('-');
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
  );
}
