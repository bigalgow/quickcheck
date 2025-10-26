// src/components/SaveBar.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export default function SaveBar({ inputs, outputs, onImportJson, onClearLocal }) {
  const { isAuthenticated, loading, userInfo, signIn, signOut, getAccessToken } = useAuth();
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Welcome:', userInfo?.name || userInfo?.username || userInfo?.sub);
    }
  }, [isAuthenticated, userInfo]);

  const login = () => signIn();
  const doSignOut = () => signOut();

  const saveProfile = async () => {
    try {
      setMsg(null);
      const token = await getAccessToken(); // <-- no audience (Account API)
      if (!token) throw new Error('Could not obtain a user access token');

      const payload = {
        custom_data: {
          retireplan: { inputs, outputs, savedAt: new Date().toISOString() },
        },
      };

      const res = await fetch('https://auth.retireplan.co.uk/api/my-account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Save failed (${res.status}): ${text}`);

      setMsg('Saved to your Logto account.');
      console.log('Account API response:', text);
    } catch (e) {
      console.error(e);
      setMsg(e.message || 'Save failed.');
    }
  };


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

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 8,
      }}
      className="no-print"
    >
      {!isAuthenticated ? (
        <button disabled={isLoading} onClick={login}>
          {isLoading ? "Loading…" : "Login to save"}
        </button>
      ) : (
        <>
          {/* Greeting */}
          <span style={{ marginRight: 6 }}>
            Welcome
            {userInfo?.name
              ? `, ${userInfo.name}`
              : userInfo?.username
              ? `, ${userInfo.username}`
              : "!"}
          </span>

          {/* Authenticated actions */}
          <button onClick={saveProfile} disabled={isLoading}>
            Save profile
          </button>
          <button onClick={doSignOut} disabled={isLoading}>
            Sign out
          </button>
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
    </div>
  );
}
