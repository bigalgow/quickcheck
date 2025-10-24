import React from "react";
import "./App.css";
import "./print.css";
import "./responsive.css";
import AtRetirement from "./components/AtRetirement.jsx";
import Callback from "./auth/Callback.jsx";

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/callback') {
    return <Callback />;
  }
  return (
    <div className="App" style={{ padding: 24 }}>
      <h1>RetirePlan — At-Retirement Calculator</h1>
      <AtRetirement />
    </div>
  );
}
