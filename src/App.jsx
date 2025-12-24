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

export default function App() {
  return (
    <div className="App" style={{ paddingTop: "80px", padding: "80px 16px 24px", maxWidth: "100%" }}>
      <Routes>
        {/* Your existing routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/calculator" element={
          <>
            <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}>RetirePlan — At-Retirement Calculator</h1>
            <AtRetirement />
          </>
        } />
        <Route path="/lifestyle" element={<LifestyleCalculator />} />
        
        {/* New mobile app routes */}
        <Route path="/mobile-home" element={<MobileDashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      
      {/* Bottom Nav - only shows on mobile routes */}
      <BottomNav />
      
      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}