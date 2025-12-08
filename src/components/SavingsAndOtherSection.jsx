// src/components/SavingsAndOtherSection.jsx
import React from "react";

/**
 * SavingsAndOtherSection - Savings and other income section
 * Includes: ISA, taxable savings, property/dividend/other income
 */
export default function SavingsAndOtherSection({
  form,
  set,
  Section,
  FieldRow,
  SectionBox,
  Txt,
  open,
  toggle,
}) {
  return (
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
  );
}
