// src/components/SaveBar.jsx
import React, { useState } from "react";
import { useLogto } from "@logto/react";

export default function SaveBar({ inputs, outputs, onImportJson, onClearLocal }) {
  const { isAuthenticated, isLoading, signIn, signOut, getAccessToken } = useLogto();
  const [msg, setMsg] = useState(null);

  const login = async () => {
  try {
    const redirectUri = `${window.location.origin}/callback`; // <- use the callback route
    await signIn({ redirectUri });
  } catch (e) {
    console.error("Login error:", e);
    setMsg("Login failed. Please try again.");
  }
};

const doSignOut = () => {
  // send users back to the home page after logout
  return signOut({ redirectUri: `${window.location.origin}/` });
};

  const saveProfile = async () => {
    try {
      setMsg(null);
      // Get token (with or without audience depending on your env)
      const audience = import.meta.env.VITE_API_AUDIENCE;
      const token = audience ? await getAccessToken(audience) : await getAccessToken();

      const body = {
        inputs,               // numeric inputs we pass into atRetirement()
        outputs,              // full outputs object
        savedAt: new Date().toISOString(),
      };

      const base = import.meta.env.VITE_API_BASE || ""; // '' => same-origin
      const res = await fetch(`${base}/api/me/retireplan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Save failed (${res.status}): ${text}`);
      }
      setMsg("Saved to your account.");
    } catch (e) {
      console.error(e);
      setMsg(e.message || "Save failed.");
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
          Login to save
        </button>
      ) : (
        <>
          <button onClick={saveProfile} disabled={isLoading}>
            Save profile
          </button>
          <button onClick={() => signOut({ redirectUri: window.location.href })} disabled={isLoading}>
            Sign out
          </button>
        </>
      )}
      
      <button onClick={doSignOut} disabled={isLoading}>Sign out</button>

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
