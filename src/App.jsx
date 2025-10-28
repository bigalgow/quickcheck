// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import "./print.css";
import "./responsive.css";
import AtRetirement from "./components/AtRetirement.jsx";
import PostRetirementProjection from "./components/PostRetirementProjection.jsx";

export default function App() {
  return (
    <div className="App" style={{ padding: 24 }}>
      <Routes>
        <Route path="/" element={
          <>
            <h1>RetirePlan — At-Retirement Calculator</h1>
            <AtRetirement />
          </>
        } />
        <Route path="/projection" element={<PostRetirementProjection />} />
      </Routes>
    </div>
  );
}
