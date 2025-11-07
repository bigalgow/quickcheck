// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import "./print.css";
import "./responsive.css";
import Dashboard from "./components/Dashboard.jsx";
import LifestyleCalculatorPage from "./components/LifestyleCalculatorPage.jsx";
import AtRetirement from "./components/AtRetirement.jsx";
import PostRetirementProjection from "./components/PostRetirementProjection.jsx";

export default function App() {
  return (
    <div className="App" style={{ padding: "24px 16px", maxWidth: "100%" }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lifestyle" element={<LifestyleCalculatorPage />} />
        <Route path="/calculator" element={
          <>
            <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}>RetirePlan — At-Retirement Calculator</h1>
            <AtRetirement />
          </>
        } />
        <Route path="/projection" element={<PostRetirementProjection />} />
      </Routes>
    </div>
  );
}
