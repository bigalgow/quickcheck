// src/components/DBSchemesSection.jsx
import React from "react";

/**
 * DBSchemesSection - DB pension schemes management section
 * Includes: Active schemes, deferred schemes, tax-free option
 */
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
