// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import "./print.css";
import "./responsive.css";
import Dashboard from "./components/Dashboard.jsx";
import AtRetirement from "./components/AtRetirement.jsx";
import LifestyleCalculator from "./components/LifestyleCalculator.jsx";
import PWAInstallBanner from "./components/PWAInstallBanner.jsx";
import BottomNav from "./components/BottomNav.jsx";
import MobileDashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";

// New unified wizard imports
import Welcome from "./components/Welcome.jsx";
import WizardShell from "./components/wizard/WizardShell.jsx";

export default function App() {
  return (
    <div className="App">
      <Routes>
        {/* New unified wizard routes (no wrapper padding - they have their own layout) */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/wizard" element={<WizardShell />} />

        {/* Root route - new Welcome page (no wrapper padding) */}
        <Route path="/" element={<Welcome />} />

        {/* Legacy routes (with wrapper padding) - will be removed in Phase 8 */}
        <Route path="/old-dashboard" element={
          <div style={{ paddingTop: "80px", padding: "80px 16px 100px", maxWidth: "100%" }}>
            <Dashboard />
            <BottomNav />
            <PWAInstallBanner />
          </div>
        } />
        <Route path="/calculator" element={
          <div style={{ paddingTop: "80px", padding: "80px 16px 100px", maxWidth: "100%" }}>
            <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}>RetirePlan — At-Retirement Calculator</h1>
            <AtRetirement />
            <BottomNav />
            <PWAInstallBanner />
          </div>
        } />
        <Route path="/lifestyle" element={
          <div style={{ paddingTop: "80px", padding: "80px 16px 100px", maxWidth: "100%" }}>
            <LifestyleCalculator />
            <BottomNav />
            <PWAInstallBanner />
          </div>
        } />

        {/* New mobile app routes */}
        <Route path="/mobile-home" element={
          <div style={{ paddingTop: "80px", padding: "80px 16px 100px", maxWidth: "100%" }}>
            <MobileDashboard />
            <BottomNav />
            <PWAInstallBanner />
          </div>
        } />
        <Route path="/profile" element={
          <div style={{ paddingTop: "80px", padding: "80px 16px 100px", maxWidth: "100%" }}>
            <Profile />
            <BottomNav />
            <PWAInstallBanner />
          </div>
        } />
      </Routes>
    </div>
  );
}