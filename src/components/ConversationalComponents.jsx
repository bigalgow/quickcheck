// src/components/ConversationalComponents.jsx
// Reusable components for conversational wizard interface

import React from "react";

/**
 * ConversationalContainer - Main wrapper for conversational flow
 */
export const ConversationalContainer = ({ children }) => (
  <div
    style={{
      maxWidth: "800px",
      margin: "0 auto",
      padding: "24px 16px",
    }}
  >
    {children}
  </div>
);

/**
 * ProgressIndicator - Shows current step in the flow
 */
export const ProgressIndicator = ({ currentStep, totalSteps, stepTitle }) => (
  <div
    style={{
      marginBottom: "32px",
      paddingBottom: "16px",
      borderBottom: "2px solid #e5e7eb",
    }}
  >
    <div
      style={{
        fontSize: "14px",
        color: "#64748b",
        marginBottom: "8px",
      }}
    >
      Step {currentStep} of {totalSteps}
    </div>
    <div
      style={{
        display: "flex",
        gap: "8px",
        marginBottom: "12px",
      }}
    >
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <div
          key={idx}
          style={{
            flex: 1,
            height: "4px",
            backgroundColor: idx < currentStep ? "#0284c7" : "#e5e7eb",
            borderRadius: "2px",
            transition: "background-color 0.3s ease",
          }}
        />
      ))}
    </div>
    {stepTitle && (
      <div
        style={{
          fontSize: "16px",
          fontWeight: "600",
          color: "#1e293b",
        }}
      >
        {stepTitle}
      </div>
    )}
  </div>
);

/**
 * Question - Display a conversational question
 */
export const Question = ({ children, intro }) => (
  <div style={{ marginBottom: "32px" }}>
    {intro && (
      <div
        style={{
          fontSize: "18px",
          color: "#64748b",
          marginBottom: "12px",
          fontWeight: "500",
        }}
      >
        {intro}
      </div>
    )}
    <h2
      style={{
        fontSize: "28px",
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: "16px",
        lineHeight: "1.3",
      }}
    >
      {children}
    </h2>
  </div>
);

/**
 * HelpText - Contextual help or explanation
 */
export const HelpText = ({ children }) => (
  <div
    style={{
      fontSize: "15px",
      color: "#64748b",
      marginBottom: "24px",
      lineHeight: "1.6",
    }}
  >
    {children}
  </div>
);

/**
 * InputGroup - Wrapper for input elements
 */
export const InputGroup = ({ label, children, help }) => (
  <div style={{ marginBottom: "24px" }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: "15px",
          fontWeight: "500",
          color: "#374151",
          marginBottom: "8px",
        }}
      >
        {label}
      </label>
    )}
    {children}
    {help && (
      <div
        style={{
          fontSize: "13px",
          color: "#6b7280",
          marginTop: "6px",
        }}
      >
        {help}
      </div>
    )}
  </div>
);

/**
 * DateInput - Styled date input component with buffered input
 */
export const DateInput = ({ value, onChange, label, ...props }) => {
  // Parse YYYY-MM-DD format to DD/MM/YYYY for display
  const [year = '', month = '', day = ''] = value ? value.split('-') : ['', '', ''];

  // Local state for buffering user input
  const [dayInput, setDayInput] = React.useState(day.replace(/^0/, ''));
  const [monthInput, setMonthInput] = React.useState(month.replace(/^0/, ''));
  const [yearInput, setYearInput] = React.useState(year);

  // Sync local state when external value changes
  React.useEffect(() => {
    const [y = '', m = '', d = ''] = value ? value.split('-') : ['', '', ''];
    setDayInput(d.replace(/^0/, '') || '');
    setMonthInput(m.replace(/^0/, '') || '');
    setYearInput(y || '');
  }, [value]);

  const handleDayBlur = () => {
    const d = Math.max(1, Math.min(31, Number(dayInput) || 1));
    const formattedDay = String(d).padStart(2, '0');
    onChange(`${yearInput || '1965'}-${monthInput.padStart(2, '0') || '01'}-${formattedDay}`);
  };

  const handleMonthBlur = () => {
    const m = Math.max(1, Math.min(12, Number(monthInput) || 1));
    const formattedMonth = String(m).padStart(2, '0');
    onChange(`${yearInput || '1965'}-${formattedMonth}-${dayInput.padStart(2, '0') || '01'}`);
  };

  const handleYearBlur = () => {
    const y = Math.max(1900, Math.min(2100, Number(yearInput) || 1965));
    onChange(`${y}-${monthInput.padStart(2, '0') || '01'}-${dayInput.padStart(2, '0') || '01'}`);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <input
        type="text"
        value={dayInput}
        onChange={(e) => setDayInput(e.target.value.replace(/\D/g, ''))}
        onBlur={handleDayBlur}
        placeholder="DD"
        maxLength="2"
        inputMode="numeric"
        style={{
          width: '60px',
          padding: '12px',
          fontSize: '16px',
          border: '2px solid #d1d5db',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      />
      <span style={{ color: '#9ca3af' }}>/</span>
      <input
        type="text"
        value={monthInput}
        onChange={(e) => setMonthInput(e.target.value.replace(/\D/g, ''))}
        onBlur={handleMonthBlur}
        placeholder="MM"
        maxLength="2"
        inputMode="numeric"
        style={{
          width: '60px',
          padding: '12px',
          fontSize: '16px',
          border: '2px solid #d1d5db',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      />
      <span style={{ color: '#9ca3af' }}>/</span>
      <input
        type="text"
        value={yearInput}
        onChange={(e) => setYearInput(e.target.value.replace(/\D/g, ''))}
        onBlur={handleYearBlur}
        placeholder="YYYY"
        maxLength="4"
        inputMode="numeric"
        style={{
          width: '80px',
          padding: '12px',
          fontSize: '16px',
          border: '2px solid #d1d5db',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      />
    </div>
  );
};

/**
 * NumberInput - Styled number input component
 */
export const NumberInput = ({ value, onChange, suffix, ...props }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="numeric"
      style={{
        padding: '12px 16px',
        fontSize: '16px',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        width: '120px',
      }}
      {...props}
    />
    {suffix && (
      <span style={{ fontSize: '16px', color: '#64748b' }}>{suffix}</span>
    )}
  </div>
);

/**
 * Checkbox - Styled checkbox component
 */
export const Checkbox = ({ checked, onChange, label }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '16px',
      color: '#374151',
      cursor: 'pointer',
      padding: '12px',
      borderRadius: '8px',
      border: '2px solid #e5e7eb',
      backgroundColor: checked ? '#f0f9ff' : 'white',
      transition: 'all 0.2s ease',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{
        width: '20px',
        height: '20px',
        cursor: 'pointer',
      }}
    />
    <span>{label}</span>
  </label>
);

/**
 * YesNoToggle - Binary choice toggle component
 */
export const YesNoToggle = ({ value, onChange, yesLabel = "Yes", noLabel = "No" }) => (
  <div style={{ display: 'flex', gap: '12px' }}>
    <button
      type="button"
      onClick={() => onChange(true)}
      style={{
        flex: 1,
        padding: '16px 24px',
        fontSize: '16px',
        fontWeight: '600',
        color: value ? 'white' : '#374151',
        backgroundColor: value ? '#0284c7' : 'white',
        border: `2px solid ${value ? '#0284c7' : '#d1d5db'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {yesLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      style={{
        flex: 1,
        padding: '16px 24px',
        fontSize: '16px',
        fontWeight: '600',
        color: !value ? 'white' : '#374151',
        backgroundColor: !value ? '#0284c7' : 'white',
        border: `2px solid ${!value ? '#0284c7' : '#d1d5db'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {noLabel}
    </button>
  </div>
);

/**
 * NavigationButtons - Back/Next navigation
 */
export const NavigationButtons = ({ onBack, onNext, showBack = true, nextLabel = "Next", backLabel = "Back" }) => (
  <div
    style={{
      display: 'flex',
      gap: '12px',
      marginTop: '48px',
      paddingTop: '24px',
      borderTop: '1px solid #e5e7eb',
    }}
  >
    {showBack && (
      <button
        type="button"
        onClick={onBack}
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
        ← {backLabel}
      </button>
    )}
    <button
      type="button"
      onClick={onNext}
      style={{
        flex: 1,
        padding: '14px 28px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#0284c7',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {nextLabel} →
    </button>
  </div>
);

/**
 * SummaryCard - Display summary of entered information
 */
export const SummaryCard = ({ title, items }) => (
  <div
    style={{
      backgroundColor: '#f8fafc',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
    }}
  >
    {title && (
      <h3
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '16px',
        }}
      >
        {title}
      </h3>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#64748b', fontSize: '15px' }}>{item.label}</span>
          <span style={{ color: '#1e293b', fontSize: '16px', fontWeight: '500' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

/**
 * HelpPopup - Info icon with tooltip/popup for contextual help
 */
export const HelpPopup = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '2px solid #0284c7',
          backgroundColor: 'white',
          color: '#0284c7',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        aria-label="Help"
      >
        ?
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '0',
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: '280px',
            maxWidth: '400px',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#374151',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
