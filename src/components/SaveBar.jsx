// src/components/SaveBar.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function SaveBar({ inputs, outputs, projection, onImportJson, onClearLocal, hasUnsavedChanges, onSaveSuccess, onCloudLoadStart, onCloudLoadComplete }) {
  const { isAuthenticated, loading, userInfo, signIn, signOut, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState(null);
  const [isDesktop, setIsDesktop] = useState(true);

  const login = () => signIn();
  const doSignOut = () => signOut();
  const goToProfile = () => navigate('/profile');

  // Detect if desktop (hide Account button on mobile/tablet where bottom nav exists)
  useEffect(() => {
    const checkDesktop = () => {
      const isLargeScreen = window.innerWidth > 1024;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsDesktop(isLargeScreen && !isTouchDevice);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // ---- load saved data from backend
  const loadProfile = async () => {
    try {
      onCloudLoadStart?.(); // Notify parent that cloud load is starting

      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        console.info("ℹ️ VITE_API_AUDIENCE not configured - cloud save/load disabled (OK for local dev)");
        onCloudLoadComplete?.(); // No cloud load will happen
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
        onCloudLoadComplete?.(); // Load attempt finished
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
      onCloudLoadComplete?.(); // Load complete
    } catch (e) {
      if (e.name === 'SyntaxError' || e.message?.includes('JSON')) {
        console.info("ℹ️ API endpoint not available (OK in local dev)");
      } else {
        console.warn("Load failed:", e.message);
      }
      onCloudLoadComplete?.(); // Load attempt finished (with error)
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

      const dataToSave = { inputs, outputs, savedAt: new Date().toISOString() };
      // Include projection data if available (from Projection page)
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
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        width: "100%",
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
          {/* Welcome message - only show on desktop */}
          {isDesktop && (
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
          )}
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
          {/* Sign out button - only show on desktop (mobile users sign out from Profile page) */}
          {isDesktop && (
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
          )}
        </>
      )}

      {/* Account button - only show on desktop (mobile/tablet have bottom nav) */}
      {isDesktop && (
        <button
          onClick={goToProfile}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            color: "#0ea5e9",
            backgroundColor: "white",
            border: "1px solid #0ea5e9",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500",
          }}
          title="Manage scenarios and account settings"
        >
          👤 Account
        </button>
      )}

      {/* Only show error/warning messages (success already shown in button status) */}
      {msg && (msg.includes("fail") || msg.includes("error") || msg.includes("⚠️") || msg.includes("Save failed")) && (
        <span
          style={{
            marginLeft: 8,
            color: "#dc2626",
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