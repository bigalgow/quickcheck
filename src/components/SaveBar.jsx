// src/components/SaveBar.jsx
import React, { useEffect, useState } from "react";
import { useLogto } from "@logto/react";

export default function SaveBar({ inputs, outputs, onImportJson, onClearLocal }) {
  const {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    getAccessToken,
    fetchUserInfo,
    userInfo, // <-- comes from the SDK once available
  } = useLogto();

  const [msg, setMsg] = useState(null);

  // Try to load user info after we become authenticated
  useEffect(() => {
    const load = async () => {
      try {
        if (isAuthenticated && !userInfo) {
          await fetchUserInfo?.(); // some SDK versions require calling this
        }
      } catch (e) {
        console.warn("fetchUserInfo failed:", e);
      }
    };
    load();
  }, [isAuthenticated, userInfo, fetchUserInfo]);

  // Log once for debugging
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User info:", userInfo);
    }
  }, [isAuthenticated, userInfo]);

  // ---- explicit redirect; force a top-level redirect login
  const login = async () => {
  const redirectUri = window.location.origin; // using root
  await signIn({ redirectUri, interactionMode: 'redirect', prompt: 'login' });
};

const doSignOut = () => signOut({ redirectUri: window.location.origin });

// and show the name when logged in:
const { isAuthenticated, userInfo, fetchUserInfo } = useLogto();
useEffect(() => { if (isAuthenticated && !userInfo) fetchUserInfo?.(); }, [isAuthenticated, userInfo, fetchUserInfo]);

{isAuthenticated && (
  <span style={{ marginRight: 6 }}>
    Welcome{userInfo?.name ? `, ${userInfo.name}` : userInfo?.username ? `, ${userInfo.username}` : ''}!
  </span>
)}

  const saveProfile = async () => {
    try {
      setMsg(null);
      // Get token (with or without audience depending on your env)
      const audience = import.meta.env.VITE_API_AUDIENCE;
      const token = audience ? await getAccessToken(audience) : await getAccessToken();

      const body = {
        inputs,  // numeric inputs used by atRetirement()
        outputs, // full outputs object
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
          {isLoading ? "Loading…" : "Login to save"}
        </button>
      ) : (
        <>
          {/* Greeting */}
          <span style={{ marginRight: 6 }}>
            Welcome{userInfo?.name ? `, ${userInfo.name}` : userInfo?.username ? `, ${userInfo.username}` : ""}!
          </span>

          {/* Actions for signed-in users */}
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
