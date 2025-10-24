import React from "react";
import "./App.css";
import "./print.css";       // ✅ add
import "./responsive.css";  // ✅ add
import AtRetirement from "./components/AtRetirement.jsx";

export default function App() {
  if (typeof window !== 'undefined') {
  const usp = new URLSearchParams(window.location.search);
  const code = usp.get('code');
  const state = usp.get('state');
  if (code || state) {
    console.log('Returned from Logto with params:', { code, state, href: window.location.href });
  } else {
    console.log('No OIDC params on load:', window.location.href);
  }
}

  return (
    <div className="App" style={{ padding: 24 }}>
      <h1>RetirePlan — At-Retirement Calculator</h1>
      <AtRetirement />
    </div>
  );
}