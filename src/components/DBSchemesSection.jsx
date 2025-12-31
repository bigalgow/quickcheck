// src/components/DBSchemesSection.jsx
import React from "react";

/**
 * DBSchemesSection - DB pension schemes management section
 * Includes: Active schemes, deferred schemes, tax-free option
 */

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

export default function DBSchemesSection({
  form,
  set,
  dbSchemes,
  updateScheme,
  removeScheme,
  addDeferred,
  Section,
  FieldRow,
  TwoCol,
  Txt,
  open,
  toggle,
}) {
  if (!form.hasDbPension) return null;

  const deferredSchemes = dbSchemes.filter((s) => s.kind === "deferred");

  return (
    <Section title="DB PENSIONS" sectionKey="db" openFlag={open.db} onToggle={() => toggle("db")}>
      {/* Active Schemes */}
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

      {/* Deferred Schemes */}
      {deferredSchemes.length > 0 && (
        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 14, color: '#555', marginBottom: 12 }}>
            If you have left a previous employer Defined Benefit scheme you will be entitled to a Deferred DB pension - enter the "projected income" figure here.
          </p>
        </div>
      )}

      {deferredSchemes.map((s, index) => (
        <div
          key={s.id}
          style={{
            border: "1px dashed #ddd",
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        >
          <strong>Deferred Pension {index + 1}</strong>
          <FieldRow
            label={
              <>
                Projected pension income (annual amount payable at retirement)
                <HelpToggle text="You should receive an Annual Benefit Statement (ABS), showing the 'projected income'. This is calculated based on the rules of your scheme at the time you left. The figure you should enter here is the 'Projected Income' (before any lump sum deduction). This assumes inflation protection up to the normal pension age - typically age 60 - note this may be different from your own planned retirement age. Contact the scheme administrator or former employer HR department if you don't have these figures, or to keep address details up to date." />
              </>
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>£</span>
              <Txt
                value={s.preservedPensionNow}
                onCommit={(v) =>
                  updateScheme(s.id, { preservedPensionNow: v })
                }
                placeholder="e.g. 5000"
                style={{ width: 140 }}
                inputMode="numeric"
              />
              <span>per year</span>
            </div>
          </FieldRow>
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => removeScheme(s.id)}>
              Remove deferred scheme
            </button>
          </div>
        </div>
      ))}

      {/* Tax-free option and Add button */}
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
  );
}
