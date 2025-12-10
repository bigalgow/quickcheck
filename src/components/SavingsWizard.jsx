// src/components/SavingsWizard.jsx
// Conversational wizard for Savings & Other Income section

import React, { useState } from "react";
import {
  ConversationalContainer,
  ProgressIndicator,
  Question,
  HelpText,
  InputGroup,
  YesNoToggle,
  NavigationButtons,
  SummaryCard,
} from "./ConversationalComponents.jsx";

/**
 * SavingsWizard - Conversational flow for savings and other income
 */
export default function SavingsWizard({ form, set, onComplete }) {
  const [step, setStep] = useState(1);
  const [hasSavings, setHasSavings] = useState(
    !!(form.isaBalance || form.isaAddPerYear || form.taxableSavingsBalance || form.taxableSavingsAddPerYear)
  );
  const [hasOtherIncome, setHasOtherIncome] = useState(
    !!(form.propertyIncomeNow || form.dividendIncomeNow || form.anyOtherIncomeNow)
  );

  const totalSteps = 5;

  const stepTitles = {
    1: "Savings",
    2: "ISA & Taxable Savings",
    3: "Other Income",
    4: "Other Income Details",
    5: "Review Your Details",
  };

  // Step 1: Do you have savings?
  const renderStep1 = () => (
    <>
      <Question>
        Do you have any savings (ISA or other)?
      </Question>

      <HelpText>
        This includes ISAs, regular savings accounts, or any cash you've set aside.
        We'll help you understand how this impacts your retirement income.
      </HelpText>

      <YesNoToggle
        value={hasSavings}
        onChange={(value) => {
          setHasSavings(value);
          if (!value) {
            // Clear savings if user says no
            set({
              isaBalance: '',
              isaAddPerYear: '',
              taxableSavingsBalance: '',
              taxableSavingsAddPerYear: '',
            });
          }
        }}
        yesLabel="Yes, I have savings"
        noLabel="No, I don't have savings"
      />

      <NavigationButtons
        onBack={() => {}}
        onNext={() => {
          if (hasSavings) {
            setStep(2);
          } else {
            setStep(3); // Skip to other income question
          }
        }}
        showBack={false}
      />
    </>
  );

  // Step 2: ISA and taxable savings details
  const renderStep2 = () => (
    <>
      <Question>Tell us about your savings</Question>

      <HelpText>
        {form.alreadyRetired
          ? "Enter your current savings balances."
          : "Enter your current balances and how much you're adding each year (if any). Leave blank if you don't have that type of savings."
        }
      </HelpText>

      {!form.alreadyRetired && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '2px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#1e40af',
          lineHeight: '1.5',
        }}>
          <strong>Note:</strong> We assume you'll continue adding this amount each year until retirement.
          You can adjust the number of years later using the modeling sliders in the results section if needed.
        </div>
      )}

      <div style={{
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
          ISA (Tax-Free Savings)
        </div>

        <InputGroup label="Current ISA balance">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
            <input
              type="text"
              value={form.isaBalance || ''}
              onChange={(e) => set({ isaBalance: e.target.value })}
              inputMode="numeric"
              placeholder="e.g. 20000"
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

        {!form.alreadyRetired && (
          <InputGroup label="How much will you add to your ISA each year?">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
              <input
                type="text"
                value={form.isaAddPerYear || ''}
                onChange={(e) => set({ isaAddPerYear: e.target.value })}
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
        )}
      </div>

      <div style={{
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
          Taxable Savings
        </div>

        <InputGroup label="Current taxable savings balance">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
            <input
              type="text"
              value={form.taxableSavingsBalance || ''}
              onChange={(e) => set({ taxableSavingsBalance: e.target.value })}
              inputMode="numeric"
              placeholder="e.g. 10000"
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

        {!form.alreadyRetired && (
          <InputGroup label="How much will you add to taxable savings each year?">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
              <input
                type="text"
                value={form.taxableSavingsAddPerYear || ''}
                onChange={(e) => set({ taxableSavingsAddPerYear: e.target.value })}
                inputMode="numeric"
                placeholder="e.g. 2000"
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
        )}
      </div>

      <NavigationButtons
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
      />
    </>
  );

  // Step 3: Do you have other income?
  const renderStep3 = () => (
    <>
      <Question>
        Do you have any other income?
      </Question>

      <HelpText>
        This could be rental income from property, dividend income from investments,
        or any other regular income you receive.
      </HelpText>

      <YesNoToggle
        value={hasOtherIncome}
        onChange={(value) => {
          setHasOtherIncome(value);
          if (!value) {
            // Clear other income if user says no
            set({
              propertyIncomeNow: '',
              dividendIncomeNow: '',
              anyOtherIncomeNow: '',
            });
          }
        }}
        yesLabel="Yes, I have other income"
        noLabel="No, I don't have other income"
      />

      <NavigationButtons
        onBack={() => {
          if (hasSavings) {
            setStep(2);
          } else {
            setStep(1);
          }
        }}
        onNext={() => {
          if (hasOtherIncome) {
            setStep(4);
          } else {
            setStep(5); // Skip to review
          }
        }}
      />
    </>
  );

  // Step 4: Other income details
  const renderStep4 = () => (
    <>
      <Question>Tell us about your other income</Question>

      <HelpText>
        Enter the annual amounts you receive from each source.
        Leave blank for any that don't apply.
      </HelpText>

      <InputGroup
        label="Property income (rental income, etc.)"
        help="Annual income from rental properties or other property sources"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
          <input
            type="text"
            value={form.propertyIncomeNow || ''}
            onChange={(e) => set({ propertyIncomeNow: e.target.value })}
            inputMode="numeric"
            placeholder="e.g. 12000"
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
        label="Dividend income"
        help="Annual income from stocks, shares, or other investments"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
          <input
            type="text"
            value={form.dividendIncomeNow || ''}
            onChange={(e) => set({ dividendIncomeNow: e.target.value })}
            inputMode="numeric"
            placeholder="e.g. 3000"
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
        label="Any other income"
        help="Any other regular income not covered above"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
          <input
            type="text"
            value={form.anyOtherIncomeNow || ''}
            onChange={(e) => set({ anyOtherIncomeNow: e.target.value })}
            inputMode="numeric"
            placeholder="e.g. 1000"
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
        onBack={() => setStep(3)}
        onNext={() => setStep(5)}
      />
    </>
  );

  // Step 5: Review
  const renderStep5 = () => {
    const totalSavings = Number(form.isaBalance || 0) + Number(form.taxableSavingsBalance || 0);
    const totalAnnualAdditions = Number(form.isaAddPerYear || 0) + Number(form.taxableSavingsAddPerYear || 0);
    const totalOtherIncome = Number(form.propertyIncomeNow || 0) +
                              Number(form.dividendIncomeNow || 0) +
                              Number(form.anyOtherIncomeNow || 0);

    return (
      <>
        <Question>Let's review your savings and other income</Question>

        <HelpText>
          Check everything looks correct before moving on.
        </HelpText>

        <SummaryCard
          title="Savings"
          items={[
            {
              label: 'Total current savings',
              value: hasSavings ? `£${totalSavings.toLocaleString()}` : 'None'
            },
            ...(hasSavings ? [
              {
                label: 'ISA balance',
                value: form.isaBalance ? `£${Number(form.isaBalance).toLocaleString()}` : '£0'
              },
              ...(!form.alreadyRetired ? [
                {
                  label: 'ISA additions per year',
                  value: form.isaAddPerYear ? `£${Number(form.isaAddPerYear).toLocaleString()}` : '£0'
                }
              ] : []),
              {
                label: 'Taxable savings balance',
                value: form.taxableSavingsBalance ? `£${Number(form.taxableSavingsBalance).toLocaleString()}` : '£0'
              },
              ...(!form.alreadyRetired ? [
                {
                  label: 'Taxable savings additions per year',
                  value: form.taxableSavingsAddPerYear ? `£${Number(form.taxableSavingsAddPerYear).toLocaleString()}` : '£0'
                },
                {
                  label: 'Total annual additions',
                  value: `£${totalAnnualAdditions.toLocaleString()}`
                }
              ] : []),
            ] : []),
          ]}
        />

        <SummaryCard
          title="Other Income"
          items={[
            {
              label: 'Total annual other income',
              value: hasOtherIncome ? `£${totalOtherIncome.toLocaleString()}` : 'None'
            },
            ...(hasOtherIncome ? [
              {
                label: 'Property income',
                value: form.propertyIncomeNow ? `£${Number(form.propertyIncomeNow).toLocaleString()}` : '£0'
              },
              {
                label: 'Dividend income',
                value: form.dividendIncomeNow ? `£${Number(form.dividendIncomeNow).toLocaleString()}` : '£0'
              },
              {
                label: 'Other income',
                value: form.anyOtherIncomeNow ? `£${Number(form.anyOtherIncomeNow).toLocaleString()}` : '£0'
              },
            ] : []),
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
            Continue to Results →
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
