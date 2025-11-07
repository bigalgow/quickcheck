// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { loadLifestyleProfile } from '../utils/lifestyleProfile';
import { formatCurrency } from '../utils/money';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, getAccessToken } = useAuth();
  const [lifestyleProfile, setLifestyleProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load lifestyle profile if authenticated
  useEffect(() => {
    async function loadProfile() {
      if (isAuthenticated && getAccessToken) {
        try {
          const profile = await loadLifestyleProfile(getAccessToken);
          setLifestyleProfile(profile);
        } catch (e) {
          console.error('Failed to load lifestyle profile:', e);
        }
      }
      setLoading(false);
    }

    loadProfile();
  }, [isAuthenticated, getAccessToken]);

  const handleStartCalculator = () => {
    navigate('/calculator');
  };

  const handleStartLifestyleDiscovery = () => {
    navigate('/lifestyle');
  };

  const handleEditProfile = () => {
    navigate('/lifestyle', { state: { editing: true } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
          Welcome to RetirePlan QuickCheck
        </h1>
        <p className="text-lg text-slate-600">
          Choose how you'd like to start planning your retirement
        </p>
      </div>

      {/* Two-card layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Card 1: Jump to Calculator */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-slate-200 p-6 flex flex-col">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Jump to Calculator
          </h2>
          <p className="text-slate-600 mb-4 flex-grow">
            Already know your numbers? Start calculating immediately to see your retirement projections.
          </p>

          {lifestyleProfile && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">
                ✓ Your lifestyle profile is ready
              </p>
              <p className="text-sm text-green-700">
                Baseline: {formatCurrency(lifestyleProfile.baselineAmount)}/year
              </p>
              {lifestyleProfile.exceptionalItems?.length > 0 && (
                <p className="text-sm text-green-700">
                  {lifestyleProfile.exceptionalItems.length} lifestyle event{lifestyleProfile.exceptionalItems.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleStartCalculator}
            className="w-full py-3 px-6 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors shadow-md"
          >
            Start Calculating
          </button>

          {lifestyleProfile && (
            <button
              onClick={handleEditProfile}
              className="w-full mt-2 py-2 px-4 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Edit Lifestyle Profile
            </button>
          )}
        </div>

        {/* Card 2: Discover Your Lifestyle */}
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg shadow-lg border-2 border-sky-300 p-6 flex flex-col">
          <div className="text-4xl mb-4">💭</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Discover Your Lifestyle First
          </h2>
          <p className="text-slate-700 mb-2 font-medium">
            Not sure what retirement will cost?
          </p>
          <p className="text-slate-600 mb-4 flex-grow">
            Take 5 minutes to explore your ideal retirement lifestyle. We'll use this to pre-fill your calculations and suggest lifestyle events.
          </p>

          <div className="mb-4">
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Guided process based on PLSA standards</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Plan for exceptional expenses (travel, family support, etc.)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Auto-populates your calculator with realistic estimates</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleStartLifestyleDiscovery}
            className="w-full py-3 px-6 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all shadow-md"
          >
            {lifestyleProfile ? 'Update Lifestyle Profile' : 'Start Discovery'}
          </button>

          <div className="mt-4 text-center">
            <button
              onClick={handleStartCalculator}
              className="text-sm text-slate-600 hover:text-slate-800 underline"
            >
              Skip for now →
            </button>
          </div>

          <div className="mt-3 text-center text-xs text-slate-500">
            Optional • 5 minutes • Update anytime
          </div>
        </div>
      </div>

      {/* Additional info section */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-3">
          How it works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
          <div>
            <div className="font-semibold mb-1">1. Define Your Lifestyle</div>
            <div className="text-slate-600">
              Optional but recommended - helps you think through retirement costs systematically
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1">2. Calculate At Retirement</div>
            <div className="text-slate-600">
              Enter your savings, pensions, and see your projected retirement position
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1">3. Project Forward</div>
            <div className="text-slate-600">
              Model how your assets will last over 25 years of retirement
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
