// src/components/DCPensionWizard.jsx
// Conversational wizard for DC Pensions section

import React, { useState } from "react";
import {
  ConversationalContainer,
  ProgressIndicator,
  Question,
  HelpText,
  InputGroup,
  NumberInput,
  YesNoToggle,
  NavigationButtons,
  SummaryCard,
  HelpPopup,
} from "./ConversationalComponents.jsx";
import DCPotWizard from "./DCPotWizard.jsx";

/**
 * DCPensionWizard - Conversational flow for DC pension details
 */
export default function DCPensionWizard({ form, set, onComplete }) {
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  const stepTitles = {
    1: "Current Pension Pot",
    2: "Tax-Free Cash",
    3: "Ongoing Contributions",
    4: "Contribution Type",
    5: "Contribution Details",
    6: "Withdrawal Method",
    7: "Review Your Details",
  };

  // Helper to format percentage
  const toPercent = (decimal) => {
    const num = parseFloat(decimal);
    return isNaN(num) ? '' : String(num * 100);
  };

  const fromPercent = (percent) => {
    const num = parseFloat(percent);
    return isNaN(num) ? '0' : String(num / 100);
  };

  // Step 1: Current pot value
  const renderStep1 = () => (
    <>
      <Question>
        {form.alreadyRetired
          ? "What's the current value of your pension pot?"
          : "What's the current value of your pension pots (just total them if you have several)?"
        }
      </Question>

      <HelpText>
        This is your workplace or personal pension (sometimes called DC or 'money purchase')
      </HelpText>

      <InputGroup label="Current pension pot value">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
          <input
            type="text"
            value={form.dcPotNow}
            onChange={(e) => set({ dcPotNow: e.target.value })}
            inputMode="numeric"
            placeholder="e.g. 150000"
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              width: '160px',
            }}
          />
        </div>
      </InputGroup>

      {/* DC Pot Wizard - track individual pots */}
      <DCPotWizard
        totalValue={form.dcPotNow}
        onTotalChange={(total) => set({ dcPotNow: total.toString() })}
      />

      {form.alreadyRetired && (
        <HelpText>
          Since you're already retired, we'll skip questions about contributions and tax-free cash (those decisions have already been made).
        </HelpText>
      )}

      <NavigationButtons
        onBack={() => {}}
        onNext={() => setStep(form.alreadyRetired ? 6 : 2)}
        showBack={false}
      />
    </>
  );

  // Step 2: Tax-free cash
  const renderStep2 = () => (
    <>
      <Question>
        Do you plan to take the 25% tax-free lump sum when you retire?
      </Question>

      <HelpText>
        Many people take this - it's tax-free cash you can access at retirement
      </HelpText>

      <YesNoToggle
        value={form.takeDCTaxFree25}
        onChange={(value) => set({ takeDCTaxFree25: value })}
        yesLabel="Yes, I'll take the tax-free cash"
        noLabel="No, I'll leave it invested"
      />

      <NavigationButtons
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
      />
    </>
  );

  // Step 3: Still contributing?
  const renderStep3 = () => (
    <>
      <Question>
        Are you still contributing to this pension?
      </Question>

      <HelpText>
        If you're still working and paying into your pension, we can include
        future contributions in the calculations.
      </HelpText>

      <YesNoToggle
        value={form.dcIsContributing}
        onChange={(value) => set({ dcIsContributing: value })}
        yesLabel="Yes, still contributing"
        noLabel="No, not contributing"
      />

      <NavigationButtons
        onBack={() => setStep(2)}
        onNext={() => {
          // Skip contribution type questions if not contributing
          if (!form.dcIsContributing) {
            setStep(6); // Go straight to withdrawal method
          } else {
            setStep(4);
          }
        }}
      />
    </>
  );

  // Step 4: Contribution type (only if contributing)
  const renderStep4 = () => (
    <>
      <Question>
        Is this an employer scheme or a personal pension?
      </Question>

      <HelpText>
        An employer scheme is where your employer also contributes. A personal
        pension or SIPP is one you set up yourself.
      </HelpText>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={() => set({ dcContributionType: 'employer' })}
          style={{
            flex: 1,
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            color: form.dcContributionType === 'employer' ? 'white' : '#374151',
            backgroundColor: form.dcContributionType === 'employer' ? '#0284c7' : 'white',
            border: `2px solid ${form.dcContributionType === 'employer' ? '#0284c7' : '#d1d5db'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Employer scheme
        </button>
        <button
          type="button"
          onClick={() => set({ dcContributionType: 'personal' })}
          style={{
            flex: 1,
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            color: form.dcContributionType === 'personal' ? 'white' : '#374151',
            backgroundColor: form.dcContributionType === 'personal' ? '#0284c7' : 'white',
            border: `2px solid ${form.dcContributionType === 'personal' ? '#0284c7' : '#d1d5db'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Personal pension/SIPP
        </button>
      </div>

      <NavigationButtons
        onBack={() => setStep(3)}
        onNext={() => setStep(5)}
      />
    </>
  );

  // Step 5: Contribution details
  const renderStep5 = () => {
    if (form.dcContributionType === 'employer') {
      return (
        <>
          <Question>
            Let's work out your contributions
          </Question>

          <HelpText>
            We need your current salary and the percentage you and your employer contribute.
          </HelpText>

          <InputGroup label="Your current salary">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
              <input
                type="text"
                value={form.salaryNow}
                onChange={(e) => set({ salaryNow: e.target.value })}
                inputMode="numeric"
                placeholder="e.g. 50000"
                style={{
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  width: '160px',
                }}
              />
              <span style={{ fontSize: '16px', color: '#64748b' }}>per year</span>
            </div>
          </InputGroup>

          <InputGroup label="Your contribution">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={toPercent(form.eePct)}
                onChange={(e) => set({ eePct: fromPercent(e.target.value) })}
                inputMode="decimal"
                placeholder="e.g. 5"
                style={{
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  width: '100px',
                }}
              />
              <span style={{ fontSize: '16px', color: '#64748b' }}>% of salary</span>
            </div>
          </InputGroup>

          <InputGroup label="Employer contribution">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={toPercent(form.erPct)}
                onChange={(e) => set({ erPct: fromPercent(e.target.value) })}
                inputMode="decimal"
                placeholder="e.g. 5"
                style={{
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  width: '100px',
                }}
              />
              <span style={{ fontSize: '16px', color: '#64748b' }}>% of salary</span>
            </div>
          </InputGroup>

          <NavigationButtons
            onBack={() => setStep(4)}
            onNext={() => setStep(6)}
          />
        </>
      );
    } else {
      // Personal pension
      return (
        <>
          <Question>
            How much do you contribute each year?
          </Question>

          <HelpText>
            Enter the total amount you personally contribute to your pension each year.
          </HelpText>

          <InputGroup label="Annual contribution">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
              <input
                type="text"
                value={form.personalAnnualContrib}
                onChange={(e) => set({ personalAnnualContrib: e.target.value })}
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
              <span style={{ fontSize: '16px', color: '#64748b' }}>per year</span>
            </div>
          </InputGroup>

          <NavigationButtons
            onBack={() => setStep(4)}
            onNext={() => setStep(6)}
          />
        </>
      );
    }
  };

  // Step 6: Withdrawal method
  const renderStep6 = () => (
    <>
      <Question>
        How do you plan to draw income from your pension?
      </Question>

      <HelpText>
        You can take flexible drawdown (withdraw as needed), buy an annuity (guaranteed
        income for life), or use a combination of both.
      </HelpText>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
          Choose your approach
        </label>
        <select
          value={form.dcAnnuityPct}
          onChange={(e) => set({ dcAnnuityPct: e.target.value })}
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            width: '100%',
            backgroundColor: 'white',
          }}
        >
          <option value="0">All flexible drawdown</option>
          <option value="50">Half drawdown, Half annuity</option>
          <option value="100">All annuity (guaranteed income)</option>
        </select>
      </div>

      {form.dcAnnuityPct === "0" || form.dcAnnuityPct === "50" ? (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>
            What % of your pot will you withdraw in year 1 (increasing by inflation thereafter)?
          </div>
          <InputGroup label="Drawdown rate">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={toPercent(form.drawdownRate)}
                onChange={(e) => set({ drawdownRate: fromPercent(e.target.value) })}
                inputMode="decimal"
                placeholder="e.g. 4"
                style={{
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  width: '100px',
                }}
              />
              <span style={{ fontSize: '16px', color: '#64748b' }}>% per year</span>
            </div>
          </InputGroup>
        </div>
      ) : null}

      {form.dcAnnuityPct === "100" || form.dcAnnuityPct === "50" ? (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
            Illustrative annuity rate. 6% of annuity purchase per year
            <HelpPopup>
              What typical annuity rate represents (i.e., standard single life, no inflation protection, normal health), unknown at retirement. Annuity providers offer a range of protections at different rates.
            </HelpPopup>
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
            The income rate you might expect from an annuity purchase
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={toPercent(form.annuityRate)}
              onChange={(e) => set({ annuityRate: fromPercent(e.target.value) })}
              inputMode="decimal"
              placeholder="e.g. 6"
              style={{
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                width: '100px',
              }}
            />
            <span style={{ fontSize: '16px', color: '#64748b' }}>% per year</span>
          </div>
        </div>
      ) : null}

      <NavigationButtons
        onBack={() => {
          // If already retired, go back to step 1
          if (form.alreadyRetired) {
            setStep(1);
          // Otherwise, go back to contributions step if contributing
          } else if (form.dcIsContributing) {
            setStep(5);
          } else {
            setStep(3);
          }
        }}
        onNext={() => setStep(7)}
      />
    </>
  );

  // Step 7: Review
  const renderStep7 = () => {
    const contributionSummary = form.dcIsContributing
      ? form.dcContributionType === 'employer'
        ? `£${Number(form.salaryNow || 0).toLocaleString()} salary, ${toPercent(form.eePct)}% you + ${toPercent(form.erPct)}% employer`
        : `£${Number(form.personalAnnualContrib || 0).toLocaleString()} per year`
      : 'Not contributing';

    const withdrawalSummary =
      form.dcAnnuityPct === "0"
        ? `Flexible drawdown at ${toPercent(form.drawdownRate)}% per year`
        : form.dcAnnuityPct === "100"
        ? `Annuity at ${toPercent(form.annuityRate)}% per year`
        : `Mix: ${toPercent(form.drawdownRate)}% drawdown + ${toPercent(form.annuityRate)}% annuity`;

    return (
      <>
        <Question>Let's review your DC pension details</Question>

        <HelpText>
          Check everything looks correct before moving on.
        </HelpText>

        <SummaryCard
          title="Current Pension"
          items={[
            { label: 'Current pot value', value: `£${Number(form.dcPotNow || 0).toLocaleString()}` },
            ...(!form.alreadyRetired ? [
              { label: 'Take 25% tax-free cash', value: form.takeDCTaxFree25 ? 'Yes' : 'No' }
            ] : []),
          ]}
        />

        {!form.alreadyRetired && (
          <SummaryCard
            title="Contributions"
            items={[
              { label: 'Contributing', value: form.dcIsContributing ? 'Yes' : 'No' },
              ...(form.dcIsContributing ? [{ label: 'Details', value: contributionSummary }] : []),
            ]}
          />
        )}

        <SummaryCard
          title="Withdrawal Strategy"
          items={[
            { label: 'Method', value: withdrawalSummary },
          ]}
        />

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '48px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'white',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={onComplete}
            style={{
              flex: 1,
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Continue to Next Step →
          </button>
        </div>
      </>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      default:
        return renderStep1();
    }
  };

  return (
    <ConversationalContainer>
      <ProgressIndicator
        currentStep={step}
        totalSteps={totalSteps}
        stepTitle={stepTitles[step]}
      />
      {renderCurrentStep()}
    </ConversationalContainer>
  );
}
