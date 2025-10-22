import React from "react";
import "./App.css";
import "./print.css";       // ✅ add
import "./responsive.css";  // ✅ add
import AtRetirement from "./components/AtRetirement.jsx";

export default function App() {
  return (
    <div className="App" style={{ padding: 24 }}>
      <h1>RetirePlan — At-Retirement Calculator</h1>
      <AtRetirement />
    </div>
  );
}
