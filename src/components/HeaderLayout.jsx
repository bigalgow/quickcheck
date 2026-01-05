// src/components/HeaderLayout.jsx
import React from "react";

export default function HeaderLayout({ children, hasUnsavedChanges }) {
  // Get main site URL from environment variable with fallback to production
  const getMainSiteUrl = () => {
    // Check for explicit environment variable first
    const envUrl = import.meta.env.VITE_MAIN_SITE_URL;
    if (envUrl) return envUrl;

    // Auto-detect based on current domain
    const hostname = window.location.hostname;
    if (hostname.includes('staging') || hostname.includes('dev')) {
      // Staging/dev environment - you can customize this URL
      return 'https://staging.retireplan.co.uk'; // Update this to your actual staging URL
    }

    // Production default
    return 'https://retireplan.co.uk';
  };

  const handleReturnToBrowser = (e) => {
    e.preventDefault();

    const mainSiteUrl = getMainSiteUrl();

    // Detect if mobile device (iOS, Android)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

    // Different behavior for mobile vs desktop to prevent multiple instances
    if (isMobile) {
      // Mobile: Open in external browser (prevents getting stuck in PWA)
      // Using window.open forces opening in device's default browser
      window.open(mainSiteUrl, '_blank');
    } else {
      // Desktop: Navigate current tab/window (closes app, prevents multiple instances)
      window.location.href = mainSiteUrl;
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
