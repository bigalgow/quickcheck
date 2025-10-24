import React, { useState } from "react";
import { useLogto } from "@logto/react";

export default function SaveBar({ inputs, outputs, onImportJson, onClearLocal }) {
  const { isAuthenticated, isLoading, signIn, signOut, getAccessToken } = useLogto();
  const [msg, setMsg] = useState(null);
  const [dbg, setDbg] = useState(null);

  // src/components/SaveBar.jsx
const login = async () => {
  try {
    const redirectUri = window.location.origin;     // go back to root
    console.log('Logto signIn ->', { redirectUri });

    await signIn({
      redirectUri,
      interactionMode: 'redirect',  // force top-level redirect
      prompt: 'login',              // bypass silent/hidden flow
    });
  } catch (e) {
    console.error('Login error:', e);
    setMsg('Login failed. Please try again.');
  }
};

const doSignOut = () => {
  return signOut({ redirectUri: window.location.origin });
};


  const testToken = async () => {
    try {
      setDbg('requesting token...');
      const token = await getAccessToken(); // no audience while debugging
      setDbg(token ? `token length ${token.length}` : 'no token');
    } catch (e) {
      console.error(e);
      setDbg(`token error: ${e?.message || e}`);
    }
  };

  const saveProfile = async () => {
    try {
      setMsg(null);
      const token = await getAccessToken(); // no audience for now
      const body = { inputs, outputs, savedAt: new Date().toISOString() };
      const base = import.meta.env.VITE_API_BASE || "";
      const res = await fetch(`${base}/api/me/retireplan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status}): ${await res.text()}`);
      setMsg("Saved to your account.");
    } catch (e) {
      console.error(e);
      setMsg(e.message || "Save failed.");
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ inputs, outputs }, null, 2)], { type: "application/json" });
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
    try { onImportJson?.(JSON.parse(text)); setMsg("Imported JSON."); }
    catch { setMsg("Invalid JSON file."); }
    evt.target.value = "";
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }} className="no-print">
      {!isAuthenticated ? (
        <button disabled={isLoading} onClick={login}>Login to save</button>
      ) : (
        <>
          <button onClick={saveProfile} disabled={isLoading}>Save profile</button>
          <button onClick={doSignOut} disabled={isLoading}>Sign out</button>
          <button type="button" onClick={testToken}>Debug: token?</button>
        </>
      )}

      <button onClick={exportJson}>Export JSON</button>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input type="file" accept="application/json" onChange={importJson} />
        Import JSON
      </label>
      <button onClick={window.print}>Print summary</button>
      <button onClick={onClearLocal}>Clear local</button>

      {msg && <span style={{ marginLeft: 8, color: "#0a7" }}>{msg}</span>}
      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
        debug: isLoading={String(isLoading)}; isAuth={String(isAuthenticated)}; {dbg || ""}
      </span>
    </div>
  );
}
