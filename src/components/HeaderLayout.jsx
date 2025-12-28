// src/components/HeaderLayout.jsx
import React from "react";

export default function HeaderLayout({ children, hasUnsavedChanges }) {
  const handleReturnToBrowser = (e) => {
    e.preventDefault();

    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;

    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        '⚠️ You have unsaved changes!\n\n' +
        'Save your scenario first:\n' +
        '1. Click "👤 Account" button\n' +
        '2. Save Current Scenario to Device\n\n' +
        'Continue to browser anyway?'
      );

      if (!confirmed) {
        return; // User cancelled
      }
    }

    // Proceed with exit
    if (isPWA) {
      // In PWA mode (iOS/Android) - navigate away (closes app, opens Safari/Chrome)
      window.location.href = 'https://www.retireplan.co.uk';
    } else {
      // Regular browser - open new tab (keeps calculator open)
      window.open('https://www.retireplan.co.uk', '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#ddd",
        borderBottom: "1px solid #bbb",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        zIndex: 1000,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          maxWidth: "100%",
          flexWrap: "wrap",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="RetirePlan"
            style={{
              height: "60px",
              width: "auto",
            }}
          />
        </div>

        {/* SaveBar content or spacer */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>

        {/* Return to Browser button - opens main site in external browser */}
        <button
          onClick={handleReturnToBrowser}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "600",
            backgroundColor: "#0284c7",
            color: "white",
            textDecoration: "none",
            border: "none",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
          title="Opens RetirePlan.co.uk in your browser"
        >
          ↗ Return to Browser
        </button>
      </div>
    </div>
  );
}
