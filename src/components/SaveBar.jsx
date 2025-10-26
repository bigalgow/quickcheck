// src/components/SaveBar.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function SaveBar({ inputs, outputs, onImportJson, onClearLocal }) {
  const { isAuthenticated, loading, userInfo, signIn, signOut, getAccessToken } = useAuth();
  const [msg, setMsg] = useState(null);

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
      if (!audience) throw new Error("Missing VITE_API_AUDIENCE");

      const token = await getAccessToken(audience);

      const res = await fetch("/api/me/retireplan", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Load API error:", res.status, await res.text());
        return; // Don't show error to user on auto-load
      }

      const data = await res.json();
      console.log("Received data from API:", data);
      if (data && data.inputs) {
        onImportJson?.(data);
        console.log("Loaded saved data from account");
        setMsg("Loaded saved data");
      } else {
        console.log("No saved data found or data format invalid");
      }
    } catch (e) {
      console.error("Load failed:", e);
      // Don't show error to user on auto-load
    }
  };

  // ---- main: save via your Vercel backend (Management API)
  const saveProfile = async () => {
    try {
      setMsg(null);

      // Get an API audience token the backend will verify
     const audience = import.meta.env.VITE_API_AUDIENCE; // should be https://api.retireplan
      if (!audience) throw new Error("Missing VITE_API_AUDIENCE");

      // either signature depending on @logto/browser version:
      const token = await getAccessToken(audience); 
      // or: const token = await getAccessToken({ resource: audience });

      const res = await fetch("/api/me/retireplan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inputs, outputs, savedAt: new Date().toISOString() }),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("Save API error:", res.status, text);
        throw new Error(`Save failed (${res.status}): ${text}`);
      }

      setMsg("Saved to your account.");
    } catch (e) {
      console.error(e);
      setMsg(e.message || "Save failed.");
    }
  };

  // Auto-load saved data when user logs in
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      console.log("Signed in as:", userInfo?.name || userInfo?.username || userInfo?.sub);
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userInfo]);


  return (
    <div
      className="no-print"
      style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}
    >
      {!isAuthenticated ? (
        <button disabled={loading} onClick={login}>
          {loading ? "Loading…" : "Login to save"}
        </button>
      ) : (
        <>
          <span style={{ marginRight: 6 }}>
            Welcome
            {userInfo?.name
              ? `, ${userInfo.name}`
              : userInfo?.username
              ? `, ${userInfo.username}`
              : "!"}
          </span>
          <button onClick={saveProfile} disabled={loading}>
            Save data
          </button>
          <button onClick={doSignOut} disabled={loading}>
            Sign out
          </button>
        </>
      )}

      <button onClick={window.print}>Print summary</button>

      <button onClick={onClearLocal}>Clear local</button>

      <button onClick={exportJson}>Export JSON</button>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input type="file" accept="application/json" onChange={importJson} />
        Import JSON
      </label>

      {msg && <span style={{ marginLeft: 8, color: "#0a7" }}>{msg}</span>}
    </div>
  );
}