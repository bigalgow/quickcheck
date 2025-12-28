// src/components/HeaderLayout.jsx
import React from "react";

export default function HeaderLayout({ children }) {
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
        <a
          href="https://www.retireplan.co.uk"
          target="_blank"
          rel="noopener noreferrer"
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
          }}
        >
          ↗ Return to Browser
        </a>
      </div>
    </div>
  );
}
