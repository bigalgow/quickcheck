// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import "./print.css";
import "./responsive.css";

// Unified wizard imports
import Welcome from "./components/Welcome.jsx";
import WizardShell from "./components/wizard/WizardShell.jsx";

export default function App() {
  return (
    <div className="App">
      <Routes>
        {/* Root route - Welcome page */}
        <Route path="/" element={<Welcome />} />

        {/* Unified wizard */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/wizard" element={<WizardShell />} />
      </Routes>
    </div>
  );
}