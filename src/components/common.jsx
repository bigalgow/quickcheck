// src/components/common.jsx
// Common UI components shared across retirement calculator components

import React from "react";

export const MiniHelp = ({ children }) => (
  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{children}</div>
);

export const Card = ({ title, children }) => (
  <div className="card">
    <div className="card-title">{title}</div>
    <div className="card-body">{children}</div>
  </div>
);

export const TotalLine = ({ label, value, fmt }) => (
  <div
    style={{
      borderTop: "1px solid #e7e7e7",
      paddingTop: 8,
      marginTop: 8,
      fontWeight: 700,
    }}
  >
    <span>{label}: </span>
    <span>£{fmt(value)}</span>
  </div>
);

export const Section = ({ title, sectionKey, openFlag, onToggle, children, wizardMode, currentStep, steps, prevStep, nextStep }) => {
  // In wizard mode, only show if this is the current step
  const stepIndex = steps?.findIndex(s => s.key === sectionKey) ?? -1;
  const isCurrentStep = wizardMode && currentStep === stepIndex;
  const shouldShow = wizardMode ? isCurrentStep : openFlag;

  if (wizardMode && !isCurrentStep) {
    return null; // Don't render at all in wizard mode if not current step
  }

  return (
    <section className="card" style={{ marginBottom: 12 }}>
      <div
        className="card-title"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>{title}</div>
        {!wizardMode && (
          <button type="button" onClick={onToggle} className="no-print">
            {openFlag ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {shouldShow && (
        <>
          <div className="card-body">{children}</div>
          {wizardMode && (
            <div
              className="no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "16px",
                borderTop: "1px solid #ddd",
                gap: "12px",
              }}
            >
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                style={{
                  visibility: currentStep === 0 ? "hidden" : "visible",
                  padding: "10px 24px",
                  fontSize: "16px",
                  fontWeight: "500",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                ← Previous
              </button>
              <button
                onClick={nextStep}
                disabled={currentStep === (steps?.length ?? 0) - 1}
                style={{
                  padding: "10px 32px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "#0284c7",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: currentStep === (steps?.length ?? 0) - 1 ? "default" : "pointer",
                  opacity: currentStep === (steps?.length ?? 0) - 1 ? 0.5 : 1,
                }}
              >
                {currentStep === (steps?.length ?? 0) - 1 ? "Finish" : "Next →"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
