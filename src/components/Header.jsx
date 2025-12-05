// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function Header({ inputs, outputs, projection, onImportJson, onClearLocal, hasUnsavedChanges, onSaveSuccess, onCloudLoadStart, onCloudLoadComplete }) {
  const { isAuthenticated, loading, userInfo, signIn, signOut, getAccessToken } = useAuth();
  const [msg, setMsg] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const login = () => signIn();
  const doSignOut = () => signOut();

  const exportJson = () => {
    const dataToExport = { inputs, outputs };
    if (projection) {
      dataToExport.projection = projection;
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = projection ? "retireplan-full.json" : "retireplan-at-retirement.json";
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      onImportJson?.(data);
      setMsg("Imported JSON.");
    } catch {
      setMsg("Invalid JSON file.");
    }
    evt.target.value = "";
  };

  const loadProfile = async () => {
    try {
      onCloudLoadStart?.();

      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        console.info("ℹ️ VITE_API_AUDIENCE not configured - cloud save/load disabled (OK for local dev)");
        onCloudLoadComplete?.();
        return;
      }

      const token = await getAccessToken(audience);

      const res = await fetch("/api/me/retireplan", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 404) {
          console.info("ℹ️ API endpoint not available (OK in local dev - deploy to Vercel for cloud save)");
        } else {
          console.warn("Load API error:", res.status, await res.text());
        }
        onCloudLoadComplete?.();
        return;
      }

      const data = await res.json();
      console.log("✅ Received data from cloud:", data);
      if (data && data.inputs) {
        onImportJson?.(data);
        console.log("✅ Loaded saved data from account");
        setMsg("Loaded saved data");
      } else {
        console.log("ℹ️ No saved data found in cloud");
      }
      onCloudLoadComplete?.();
    } catch (e) {
      if (e.name === 'SyntaxError' || e.message?.includes('JSON')) {
        console.info("ℹ️ API endpoint not available (OK in local dev)");
      } else {
        console.warn("Load failed:", e.message);
      }
      onCloudLoadComplete?.();
    }
  };

  const saveProfile = async () => {
    try {
      setMsg(null);

      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        setMsg("⚠️ Cloud save not configured");
        console.info("ℹ️ VITE_API_AUDIENCE not configured - use Export JSON for local save");
        return;
      }

      const token = await getAccessToken(audience);

      const dataToSave = { inputs, outputs, savedAt: new Date().toISOString() };
      if (projection) {
        dataToSave.projection = projection;
      }

      const res = await fetch("/api/me/retireplan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(dataToSave),
      });

      if (!res.ok) {
        const text = await res.text();

        if (res.status === 404) {
          console.info("ℹ️ API endpoint not available (OK in local dev - deploy to Vercel for cloud save)");
          setMsg("💾 Local auto-save active. Deploy to Vercel for cloud save.");
          onSaveSuccess?.();
        } else {
          console.error("Save API error:", res.status, text);
          setMsg(`Save failed (${res.status})`);
        }
        return;
      }

      await res.text();
      setMsg("✅ Saved to your account.");
      onSaveSuccess?.();
    } catch (e) {
      if (e.name === 'SyntaxError' || e.message?.includes('JSON')) {
        console.info("ℹ️ API endpoint not available (OK in local dev)");
        setMsg("💾 Local auto-save active. Deploy to Vercel for cloud save.");
        onSaveSuccess?.();
      } else {
        console.error("Save error:", e);
        setMsg(e.message || "Save failed.");
      }
    }
  };

  // Auto-load saved data when user logs in
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      console.log("✅ Signed in. User info:", userInfo);
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userInfo]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  return (
    <header
      className="no-print"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#ddd",
        borderBottom: "1px solid #ccc",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        zIndex: 1000,
        padding: "12px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1400px",
          margin: "0 auto",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Left: Logo/Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a
            href="https://www.retireplan.co.uk"
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "#1e40af",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            RetirePlan
          </a>
          {hasUnsavedChanges && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#92400e",
                backgroundColor: "#fef3c7",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              ● Unsaved
            </span>
          )}
        </div>

        {/* Right: Auth & Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {!isAuthenticated ? (
            <button
              disabled={loading}
              onClick={login}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "600",
                backgroundColor: "#0284c7",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {loading ? "Loading…" : "Sign In"}
            </button>
          ) : (
            <>
              <span style={{ fontSize: "14px", color: "#374151" }}>
                {userInfo?.name ||
                  userInfo?.given_name ||
                  userInfo?.username ||
                  userInfo?.email?.split('@')[0] ||
                  "User"}
              </span>

              <button
                onClick={saveProfile}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  backgroundColor: hasUnsavedChanges ? "#f59e0b" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {hasUnsavedChanges ? "Save Data" : "✓ Saved"}
              </button>

              <button
                onClick={loadProfile}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Load
              </button>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  ⋮ Menu
                </button>

                {showMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      minWidth: "160px",
                      zIndex: 1001,
                    }}
                  >
                    <button
                      onClick={() => {
                        exportJson();
                        setShowMenu(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: "14px",
                        backgroundColor: "transparent",
                        color: "#374151",
                        border: "none",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      Export JSON
                    </button>

                    <label
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: "14px",
                        backgroundColor: "transparent",
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "block",
                      }}
                    >
                      <input
                        type="file"
                        accept="application/json"
                        onChange={(e) => {
                          importJson(e);
                          setShowMenu(false);
                        }}
                        style={{ display: "none" }}
                      />
                      Import JSON
                    </label>

                    <button
                      onClick={window.print}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: "14px",
                        backgroundColor: "transparent",
                        color: "#374151",
                        border: "none",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      Print
                    </button>

                    <button
                      onClick={() => {
                        onClearLocal?.();
                        setShowMenu(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: "14px",
                        backgroundColor: "transparent",
                        color: "#374151",
                        border: "none",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      Clear Local Storage
                    </button>

                    <button
                      onClick={() => {
                        doSignOut();
                        setShowMenu(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: "14px",
                        backgroundColor: "transparent",
                        color: "#dc2626",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Message Bar */}
      {msg && (
        <div
          style={{
            maxWidth: "1400px",
            margin: "8px auto 0",
            padding: "8px 12px",
            fontSize: "13px",
            fontWeight: "500",
            color: msg.includes("fail") || msg.includes("error") ? "#dc2626" : "#059669",
            backgroundColor: msg.includes("fail") || msg.includes("error") ? "#fee2e2" : "#d1fae5",
            borderRadius: "4px",
          }}
        >
          {msg}
        </div>
      )}
    </header>
  );
}
