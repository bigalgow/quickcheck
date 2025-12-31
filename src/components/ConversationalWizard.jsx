// src/components/ConversationalWizard.jsx
// Conversational wizard for Core Assumptions section

import React, { useState } from "react";
import {
  ConversationalContainer,
  ProgressIndicator,
  Question,
  HelpText,
  InputGroup,
  DateInput,
  NumberInput,
  Checkbox,
  YesNoToggle,
  NavigationButtons,
  SummaryCard,
} from "./ConversationalComponents.jsx";
import { calculateStatePensionAge, formatStatePensionAge } from "../utils/statePensionAge.js";

/**
 * ConversationalWizard - Phase 1: Core Assumptions
 * Implements a conversational flow for gathering basic retirement planning information
 */
export default function ConversationalWizard({ form, set, onComplete }) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Helper to calculate state pension date
  const getStatePensionInfo = () => {
    const spa = calculateStatePensionAge(form.dateOfBirth);
    const ageText = formatStatePensionAge(spa);

    // Calculate approximate date (simplified)
    const [year, month, day] = (form.dateOfBirth || '1965-01-01').split('-');
    const birthDate = new Date(year, month - 1, day);
    const spaDate = new Date(birthDate);
    spaDate.setFullYear(spaDate.getFullYear() + Math.floor(spa));

    return {
      age: ageText,
      date: spaDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  };

  const stepTitles = {
    1: "About You",
    2: "State Pension",
    3: "Workplace/Personal Pension",
    4: "Final Salary Pension",
    5: "Lifestyle & Spending",
    6: "Review Your Details",
  };

  // Step 1: Personal Details
  const renderStep1 = () => (
    <>
      <Question intro="Let's find out about you...">
        {form.alreadyRetired
          ? "What's your date of birth?"
          : "What's your date of birth and intended retirement age?"
        }
      </Question>

      <InputGroup label="Date of birth">
        <DateInput
          value={form.dateOfBirth}
          onChange={(value) => set({ dateOfBirth: value })}
        />
      </InputGroup>

      <InputGroup>
        <Checkbox
          checked={form.alreadyRetired}
          onChange={(value) => set({ alreadyRetired: value })}
          label="I've already retired"
        />
      </InputGroup>

      {!form.alreadyRetired && (
        <InputGroup
          label="When do you plan to retire?"
          help="This is the age you plan to stop working and start drawing your pension."
        >
          <NumberInput
            value={form.retirementAge}
            onChange={(value) => set({ retirementAge: value })}
            suffix="years old"
          />
        </InputGroup>
      )}

      {form.alreadyRetired && (
        <HelpText>
          Since you're already retired, we'll analyze your current financial position and project forward from today.
        </HelpText>
      )}

      <NavigationButtons
        onBack={() => {}}
        onNext={() => setStep(2)}
        showBack={false}
      />
    </>
  );

  // Step 2: State Pension
  const renderStep2 = () => {
    const spaInfo = getStatePensionInfo();
    const defaultPension = Math.round(230.25 * 52);

    return (
      <>
        <Question>Have you checked your state pension entitlement?</Question>

        <HelpText>
          Unless you tell us otherwise, we'll use the current standard pension amount
          of £{defaultPension.toLocaleString()} per year.
        </HelpText>

        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #bae6fd',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '15px', color: '#0c4a6e', marginBottom: '8px' }}>
            📅 Your State Pension Age
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#0284c7' }}>
            You'll receive your state pension at age {spaInfo.age}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Approximately {spaInfo.date}
          </div>
        </div>

        <InputGroup
          label="Annual state pension amount"
          help={
            <>
              You can check your personal entitlement at{' '}
              <a
                href="https://www.gov.uk/check-state-pension"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0284c7', textDecoration: 'underline' }}
              >
                gov.uk/check-state-pension
              </a>
            </>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
            <input
              type="text"
              value={form.statePensionAnnual}
              onChange={(e) => set({ statePensionAnnual: e.target.value })}
              inputMode="numeric"
              placeholder={defaultPension.toString()}
              style={{
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                width: '140px',
              }}
            />
            <span style={{ fontSize: '16px', color: '#64748b' }}>per year</span>
          </div>
        </InputGroup>

        <NavigationButtons
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      </>
    );
  };

  // Step 3: DC Pension
  const renderStep3 = () => (
    <>
      <Question>
        {form.alreadyRetired
          ? "Do you have a defined contribution pension pot?"
          : "Do you have a workplace or personal pension (defined contribution)?"
        }
      </Question>

      <HelpText>
        {form.alreadyRetired
          ? "This is your pension pot that you can draw down from or use to purchase an annuity. It's sometimes called a 'money purchase' pension or could be a personal pension or SIPP."
          : "This is a pension pot where you (and possibly your employer) have been making contributions. It's sometimes called a 'money purchase' pension or could be a personal pension or SIPP."
        }
      </HelpText>

      <YesNoToggle
        value={form.hasDcPension}
        onChange={(value) => set({ hasDcPension: value })}
        yesLabel={form.alreadyRetired ? "Yes, I have a DC pot" : "Yes, I have a DC pension"}
        noLabel="No, I don't have one"
      />

      <NavigationButtons
        onBack={() => setStep(2)}
        onNext={() => setStep(4)}
      />
    </>
  );

  // Step 4: DB Pension
  const renderStep4 = () => (
    <>
      <Question>
        {form.alreadyRetired
          ? "Do you have a 'final salary' (defined benefit) pension income?"
          : "Do you have a 'final salary' (defined benefit) pension?"
        }
      </Question>

      <HelpText>
        {form.alreadyRetired
          ? "This is a guaranteed pension income, usually from a previous employer's final salary scheme. If you don't have one, we can skip those questions."
          : "This could be either an active pension that you're still paying into, or a deferred pension from a previous employer. If you don't have one, we can skip those questions."
        }
      </HelpText>

      <YesNoToggle
        value={form.hasDbPension}
        onChange={(value) => set({ hasDbPension: value })}
        yesLabel="Yes, I have a DB pension"
        noLabel="No, I don't have one"
      />

      <NavigationButtons
        onBack={() => setStep(3)}
        onNext={() => setStep(5)}
      />
    </>
  );

  // Step 5: Lifestyle Expenditure
  const renderStep5 = () => (
    <>
      <Question>
        Have you worked out how much income you will need in retirement?
      </Question>

      <HelpText>
        The Lifestyle Planner will help you estimate this - if you've already used
        this, the figure is shown here.
      </HelpText>

      <InputGroup
        label="Annual spending in retirement"
        help="This is the amount you expect to spend each year in retirement (in today's money)"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', color: '#64748b' }}>£</span>
          <input
            type="text"
            value={form.desiredSpendAnnual}
            onChange={(e) => set({ desiredSpendAnnual: e.target.value })}
            inputMode="numeric"
            placeholder="e.g. 30000"
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              width: '140px',
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

  // Step 6: Review
  const renderStep6 = () => {
    const spaInfo = getStatePensionInfo();
    const defaultPension = Math.round(230.25 * 52);
    const pensionAmount = form.statePensionAnnual || defaultPension;

    // Format date for display
    const [year, month, day] = (form.dateOfBirth || '1965-01-01').split('-');
    const dobFormatted = `${day}/${month}/${year}`;

    return (
      <>
        <Question>Let's review what you've told us</Question>

        <HelpText>
          We'll start the calculations with standard planning assumptions around
          inflation and growth, but you can change these later if you wish.
        </HelpText>

        <SummaryCard
          title="Personal Details"
          items={[
            { label: 'Date of birth', value: dobFormatted },
            { label: 'Retirement age', value: `${form.retirementAge} years old` },
            { label: 'Already retired', value: form.alreadyRetired ? 'Yes' : 'No' },
          ]}
        />

        <SummaryCard
          title="State Pension"
          items={[
            { label: 'State Pension Age', value: `${spaInfo.age}` },
            { label: 'Annual amount', value: `£${Number(pensionAmount).toLocaleString()}` },
          ]}
        />

        <SummaryCard
          title="Pensions"
          items={[
            {
              label: 'Workplace/Personal (DC) pension',
              value: form.hasDcPension ? 'Yes' : 'No'
            },
            {
              label: 'Final Salary (DB) pension',
              value: form.hasDbPension ? 'Yes' : 'No'
            },
          ]}
        />

        <SummaryCard
          title="Retirement Spending"
          items={[
            {
              label: 'Annual spending needed',
              value: form.desiredSpendAnnual ? `£${Number(form.desiredSpendAnnual).toLocaleString()}` : 'Not yet specified'
            },
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
