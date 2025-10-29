// src/components/SaveBar.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function SaveBar({ inputs, outputs, onImportJson, onClearLocal, hasUnsavedChanges, onSaveSuccess }) {
  const { isAuthenticated, loading, userInfo, signIn, signOut, getAccessToken } = useAuth();
  const [msg, setMsg] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const login = () => signIn();
  const doSignOut = () => signOut();

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ inputs, outputs }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retireplan-at-retirement.json";
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

  // ---- load saved data from backend
  const loadProfile = async () => {
    try {
      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        console.info("ℹ️ VITE_API_AUDIENCE not configured - cloud save/load disabled (OK for local dev)");
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
        return; // Don't show error to user on auto-load
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
    } catch (e) {
      if (e.name === 'SyntaxError' || e.message?.includes('JSON')) {
        console.info("ℹ️ API endpoint not available (OK in local dev)");
      } else {
        console.warn("Load failed:", e.message);
      }
      // Don't show error to user on auto-load
    }
  };

  // ---- main: save via your Vercel backend (Management API)
  const saveProfile = async () => {
    try {
      setMsg(null);

      // Get an API audience token the backend will verify
      const audience = import.meta.env.VITE_API_AUDIENCE; // should be https://api.retireplan
      if (!audience) {
        setMsg("⚠️ Cloud save not configured");
        console.info("ℹ️ VITE_API_AUDIENCE not configured - use Export JSON for local save");
        return;
      }

      // either signature depending on @logto/browser version:
      const token = await getAccessToken(audience);
      // or: const token = await getAccessToken({ resource: audience });

      const res = await fetch("/api/me/retireplan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inputs, outputs, savedAt: new Date().toISOString() }),
      });

      if (!res.ok) {
        const text = await res.text();

        if (res.status === 404) {
          console.info("ℹ️ API endpoint not available (OK in local dev - deploy to Vercel for cloud save)");
          setMsg("💾 Local auto-save active. Deploy to Vercel for cloud save.");
          // Still mark as "saved" since sessionStorage is working
          onSaveSuccess?.();
        } else {
          console.error("Save API error:", res.status, text);
          setMsg(`Save failed (${res.status})`);
        }
        return;
      }

      const text = await res.text();
      setMsg("✅ Saved to your account.");
      onSaveSuccess?.(); // Notify parent that save was successful
    } catch (e) {
      if (e.name === 'SyntaxError' || e.message?.includes('JSON')) {
        console.info("ℹ️ API endpoint not available (OK in local dev)");
        setMsg("💾 Local auto-save active. Deploy to Vercel for cloud save.");
        onSaveSuccess?.(); // sessionStorage is still working
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
      console.log("👤 Name fields:", {
        name: userInfo?.name,
        given_name: userInfo?.given_name,
        family_name: userInfo?.family_name,
        username: userInfo?.username,
        email: userInfo?.email
      });
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userInfo]);


  return (
    <div
      className="no-print"
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 16,
        padding: "12px 16px",
        backgroundColor: hasUnsavedChanges ? "#fef3c7" : "#ffffff",
        border: `2px solid ${hasUnsavedChanges ? "#f59e0b" : "#e2e8f0"}`,
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      {hasUnsavedChanges && (
        <span style={{ color: "#92400e", fontWeight: "600", fontSize: "14px" }}>
          ● Unsaved changes
        </span>
      )}

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
          {loading ? "Loading…" : "Login to save"}
        </button>
      ) : (
        <>
          <span style={{ marginRight: 6, fontSize: "14px" }}>
            Welcome
            {userInfo?.name
              ? `, ${userInfo.name}`
              : userInfo?.given_name
              ? `, ${userInfo.given_name}`
              : userInfo?.username
              ? `, ${userInfo.username}`
              : userInfo?.email
              ? `, ${userInfo.email.split('@')[0]}`
              : "!"}
          </span>
          <button
            onClick={saveProfile}
            disabled={loading}
            style={{
              padding: "10px 20px",
              fontSize: "15px",
              fontWeight: "700",
              backgroundColor: hasUnsavedChanges ? "#f59e0b" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              boxShadow: hasUnsavedChanges ? "0 2px 4px rgba(245, 158, 11, 0.3)" : "0 2px 4px rgba(16, 185, 129, 0.3)",
            }}
          >
            {hasUnsavedChanges ? "💾 Save All Data" : "✓ Data Saved"}
          </button>
          <button
            onClick={doSignOut}
            disabled={loading}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "#64748b",
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </>
      )}

      <button
        onClick={window.print}
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          color: "#475569",
          backgroundColor: "white",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Print summary
      </button>

      <button
        onClick={exportJson}
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          color: "#475569",
          backgroundColor: "white",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Export JSON
      </button>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          color: "#64748b",
          backgroundColor: "white",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        {showAdvanced ? "⊖ Hide advanced" : "⊕ Advanced"}
      </button>

      {showAdvanced && (
        <>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: "14px",
              color: "#475569",
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <input type="file" accept="application/json" onChange={importJson} style={{ display: "none" }} />
            Import JSON
          </label>

          <button
            onClick={onClearLocal}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "#64748b",
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Clear local
          </button>
        </>
      )}

      {msg && (
        <span
          style={{
            marginLeft: 8,
            color: msg.includes("fail") || msg.includes("error") ? "#dc2626" : "#059669",
            fontWeight: "500",
            fontSize: "14px",
          }}
        >
          {msg}
        </span>
      )}
    </div>
  );
}