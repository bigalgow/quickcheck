// src/components/DBPensionWizard.jsx
// Conversational wizard for DB Pensions section

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
} from "./ConversationalComponents.jsx";

/**
 * DBPensionWizard - Conversational flow for DB pension details
 */
export default function DBPensionWizard({ dbSchemes, updateScheme, addDeferred, removeScheme, form, set, onComplete }) {
  const [step, setStep] = useState(1);
  const [hasActive, setHasActive] = useState(dbSchemes.some(s => s.kind === 'active'));
  const [hasDeferred, setHasDeferred] = useState(dbSchemes.some(s => s.kind === 'deferred'));

  const totalSteps = 6;

  // Auto-advance to step 3 if already retired (skip active DB questions)
  React.useEffect(() => {
    if (form.alreadyRetired && step === 1) {
      setStep(3);
    }
  }, [form.alreadyRetired, step]);

  const stepTitles = {
    1: "Active DB Pension",
    2: "Active Scheme Details",
    3: "Deferred DB Pensions",
    4: "Deferred Scheme Details",
    5: "Tax-Free Cash",
    6: "Review Your Details",
  };

  // Get the active scheme (there should only be one)
  const activeScheme = dbSchemes.find(s => s.kind === 'active');
  const deferredSchemes = dbSchemes.filter(s => s.kind === 'deferred');

  // Step 1: Do you have an active DB pension?
  const renderStep1 = () => (
    <>
      <Question>
        Do you have an active final salary (DB) pension?
      </Question>

      <HelpText>
        This is a pension where you're still working for the employer and the pension is still accruing.
        Also called 'defined benefit' or 'final salary' pension.
      </HelpText>

      <YesNoToggle
        value={hasActive}
        onChange={(value) => {
          setHasActive(value);
          if (!value && activeScheme) {
            // Remove active scheme if user says no
            removeScheme(activeScheme.id);
          } else if (value && !activeScheme) {
            // Add active scheme if user says yes and there isn't one
            // This will be handled by the parent component
          }
        }}
        yesLabel="Yes, I have an active DB pension"
        noLabel="No, I don't have one"
      />

      <NavigationButtons
        onBack={() => {}}
        onNext={() => {
          if (hasActive) {
            setStep(2); // Go to active scheme details
          } else {
            setStep(3); // Skip to deferred question
          }
        }}
        showBack={false}
      />
    </>
  );

  // Step 2: Active scheme details
  const renderStep2 = () => {
    if (!activeScheme) {
      // Need to create active scheme - skip for now, will handle in parent
      return (
        <>
          <Question>Setting up your active DB pension...</Question>
          <HelpText>Loading scheme details...</HelpText>
        </>
      );
    }

    return (
      <>
        <Question>Tell us about your active DB pension</Question>

        <HelpText>
          We need a few details about how your pension accrues and your current service.
        </HelpText>

        <InputGroup
          label="What's your accrual rate?"
          help="Common rates are 60 (1/60th per year), 80 (1/80th per year)"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', color: '#64748b' }}>1/</span>
            <input
              type="text"
              value={activeScheme.accrualDenominator || ''}
              onChange={(e) => updateScheme(activeScheme.id, { accrualDenominator: e.target.value })}
              inputMode="numeric"
              placeholder="e.g. 60"
              style={{
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                width: '100px',
              }}
            />
            <span style={{ fontSize: '16px', color: '#64748b' }}>per year</span>
          </div>
        </InputGroup>

        <InputGroup label="How many years have you been in the scheme so far?">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={activeScheme.serviceYearsToDate || ''}
              onChange={(e) => updateScheme(activeScheme.id, { serviceYearsToDate: e.target.value })}
              inputMode="numeric"
              placeholder="e.g. 10"
              style={{
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                width: '100px',
              }}
            />
            <span style={{ fontSize: '16px', color: '#64748b' }}>years</span>
          </div>
        </InputGroup>

        <InputGroup
          label="What's your current pensionable salary?"
          help="This is the salary used to calculate your pension - may be different from your actual salary"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
            <input
              type="text"
              value={activeScheme.pensionableSalaryNow || ''}
              onChange={(e) => updateScheme(activeScheme.id, { pensionableSalaryNow: e.target.value })}
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

        <InputGroup
          label="Maximum service years (optional)"
          help="Some schemes have a maximum number of years you can accrue (leave blank if none)"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={activeScheme.maxServiceYears || ''}
              onChange={(e) => updateScheme(activeScheme.id, { maxServiceYears: e.target.value })}
              inputMode="numeric"
              placeholder="e.g. 40"
              style={{
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                width: '100px',
              }}
            />
            <span style={{ fontSize: '16px', color: '#64748b' }}>years</span>
          </div>
        </InputGroup>

        <NavigationButtons
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      </>
    );
  };

  // Step 3: Do you have deferred pensions?
  const renderStep3 = () => (
    <>
      <Question>
        {form.alreadyRetired
          ? "Do you have any DB pension income?"
          : "Do you have any deferred DB pensions from previous employers?"
        }
      </Question>

      <HelpText>
        {form.alreadyRetired
          ? "This is a guaranteed pension income from a previous employer's final salary (defined benefit) scheme."
          : "These are pensions you've built up with previous employers but aren't currently contributing to. They're 'preserved' and will pay out when you reach the scheme's retirement age."
        }
      </HelpText>

      <YesNoToggle
        value={hasDeferred}
        onChange={(value) => setHasDeferred(value)}
        yesLabel={form.alreadyRetired ? "Yes, I have DB pension income" : "Yes, I have deferred pensions"}
        noLabel="No, I don't have any"
      />

      <NavigationButtons
        onBack={() => {
          if (form.alreadyRetired) {
            // Already retired users don't see steps 1-2
            return;
          } else if (hasActive) {
            setStep(2);
          } else {
            setStep(1);
          }
        }}
        showBack={!form.alreadyRetired}
        onNext={() => {
          if (hasDeferred) {
            // Ensure at least one deferred scheme exists
            if (deferredSchemes.length === 0) {
              addDeferred();
            }
            setStep(4);
          } else {
            // Remove all deferred schemes if user says no
            deferredSchemes.forEach(s => removeScheme(s.id));
            // Already retired users skip to review, others go to tax-free cash
            setStep(form.alreadyRetired ? 6 : 5);
          }
        }}
      />
    </>
  );

  // Step 4: Deferred scheme details
  const renderStep4 = () => (
    <>
      <Question>
        {form.alreadyRetired
          ? "Tell us about your DB pension income"
          : "Tell us about your deferred pension(s)"
        }
      </Question>

      <HelpText>
        {form.alreadyRetired
          ? "Enter the annual amount you receive from each DB pension."
          : "For each deferred pension, you can either enter the preserved pension amount directly, or let us calculate it from your accrual details."
        }
      </HelpText>

      {deferredSchemes.map((scheme, index) => (
        <div
          key={scheme.id}
          style={{
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1e293b',
          }}>
            Deferred Pension {index + 1}
            {deferredSchemes.length > 1 && (
              <button
                type="button"
                onClick={() => removeScheme(scheme.id)}
                style={{
                  marginLeft: '16px',
                  padding: '6px 12px',
                  fontSize: '14px',
                  color: '#dc2626',
                  backgroundColor: 'white',
                  border: '1px solid #dc2626',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            )}
          </div>

          <InputGroup
            label={form.alreadyRetired
              ? "Annual DB pension income"
              : "Preserved pension (annual amount payable at retirement)"
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
              <input
                type="text"
                value={scheme.preservedPensionNow || ''}
                onChange={(e) => updateScheme(scheme.id, { preservedPensionNow: e.target.value })}
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

          {!form.alreadyRetired && (
            <InputGroup
              label="Revaluation rate (how much it increases each year before you retire)"
              help="Common rates: 0% (fixed), 2.5% (inflation), 5% (salary growth)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={scheme.revaluationAssumption || ''}
                  onChange={(e) => updateScheme(scheme.id, { revaluationAssumption: e.target.value })}
                  inputMode="decimal"
                  placeholder="e.g. 2.5"
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
          )}
        </div>
      ))}

      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={addDeferred}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            color: '#0284c7',
            backgroundColor: 'white',
            border: '2px solid #0284c7',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          + Add another deferred pension
        </button>
      </div>

      <NavigationButtons
        onBack={() => setStep(3)}
        onNext={() => setStep(form.alreadyRetired ? 6 : 5)}
      />
    </>
  );

  // Step 5: Tax-free cash
  const renderStep5 = () => (
    <>
      <Question>
        Do you plan to take tax-free cash from your DB pension?
      </Question>

      <HelpText>
        You can usually exchange part of your DB pension for a tax-free lump sum (typically 20× the annual pension given up).
        This is in addition to any DC tax-free cash, but there's an overall cap of £268,275.
      </HelpText>

      <YesNoToggle
        value={form.takeDBTaxFree25}
        onChange={(value) => set({ takeDBTaxFree25: value })}
        yesLabel="Yes, I'll take tax-free cash"
        noLabel="No, I'll keep it all as pension"
      />

      <NavigationButtons
        onBack={() => {
          if (hasDeferred) {
            setStep(4);
          } else {
            setStep(3);
          }
        }}
        onNext={() => setStep(6)}
      />
    </>
  );

  // Step 6: Review
  const renderStep6 = () => {
    const activeSummary = hasActive && activeScheme
      ? `1/${activeScheme.accrualDenominator || '?'} accrual, ${activeScheme.serviceYearsToDate || '?'} years service, £${Number(activeScheme.pensionableSalaryNow || 0).toLocaleString()} salary`
      : 'None';

    const deferredSummary = hasDeferred
      ? `${deferredSchemes.length} pension(s)`
      : 'None';

    return (
      <>
        <Question>Let's review your DB pension details</Question>

        <HelpText>
          Check everything looks correct before moving on.
        </HelpText>

        {!form.alreadyRetired && (
          <SummaryCard
            title="Active DB Pension"
            items={[
              { label: 'Status', value: hasActive ? 'Yes' : 'No' },
              ...(hasActive && activeScheme ? [
                { label: 'Details', value: activeSummary },
              ] : []),
            ]}
          />
        )}

        <SummaryCard
          title={form.alreadyRetired ? "DB Pension Income" : "Deferred DB Pensions"}
          items={[
            { label: 'Count', value: deferredSummary },
            ...deferredSchemes.map((s, i) => ({
              label: `Pension ${i + 1}`,
              value: form.alreadyRetired
                ? `£${Number(s.preservedPensionNow || 0).toLocaleString()}/year`
                : `£${Number(s.preservedPensionNow || 0).toLocaleString()}/year, ${s.revaluationAssumption || 0}% revaluation`
            })),
          ]}
        />

        {!form.alreadyRetired && (
          <SummaryCard
            title="Tax-Free Cash"
            items={[
              { label: 'Take tax-free cash from DB', value: form.takeDBTaxFree25 ? 'Yes' : 'No' },
            ]}
          />
        )}

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
