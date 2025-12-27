// src/components/DCPensionSection.jsx
import React from "react";
import { MiniHelp } from "./common.jsx";
import DCPotWizard from "./DCPotWizard.jsx";

/**
 * DCPensionSection - DC pension inputs section
 * Includes: Current pot, future contributions, withdrawal method
 */
export default function DCPensionSection({
  form,
  set,
  Section,
  FieldRow,
  SectionBox,
  TwoCol,
  Txt,
  toPercent,
  fromPercent,
  open,
  toggle,
}) {
  return (
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

        {/* DC Pot Wizard - collapsible table to track individual pots */}
        <DCPotWizard
          totalValue={form.dcPotNow}
          onTotalChange={(total) => set({ dcPotNow: total.toString() })}
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
  );
}
