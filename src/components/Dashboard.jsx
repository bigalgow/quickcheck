// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import HeaderLayout from './HeaderLayout';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, userInfo, getAccessToken } = useAuth();
  const [hasLifestyleProfile, setHasLifestyleProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has a lifestyle profile
  useEffect(() => {
    const checkProfile = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const audience = import.meta.env.VITE_API_AUDIENCE;
        if (!audience) {
          console.log('No API audience - skipping profile check');
          setLoading(false);
          return;
        }

        const token = await getAccessToken(audience);
        const res = await fetch('/api/me/lifestyle', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const profile = await res.json();
          setHasLifestyleProfile(!!profile);
        }
      } catch (e) {
        console.warn('Failed to check lifestyle profile:', e);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [isAuthenticated, getAccessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <HeaderLayout></HeaderLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xl sm:text-2xl font-bold text-slate-800 max-w-2xl mx-auto">
            Plan your retirement with confidence. Choose how you'd like to start:
          </p>
        </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left card: Calculator */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-slate-200 p-6 hover:border-sky-300 transition-all">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Jump to Calculator
          </h2>
          <p className="text-slate-600 mb-4">
            Already know your numbers? Start calculating your retirement position immediately.
          </p>
          <ul className="text-sm text-slate-600 space-y-2 mb-6">
            <li>• Calculate your retirement income</li>
            <li>• See your projected assets</li>
            <li>• Plan for 25 years ahead</li>
          </ul>
          <button
            onClick={() => navigate('/calculator')}
            className="w-full px-6 py-3 bg-sky-600 text-white rounded-md font-medium hover:bg-sky-700 transition-colors"
          >
            Start Calculating
          </button>
        </div>

        {/* Right card: Lifestyle Discovery */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-slate-200 p-6 hover:border-sky-300 transition-all">
          <div className="text-4xl mb-4">💭</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Discover Your Lifestyle First
          </h2>
          <p className="text-slate-600 mb-4">
            Not sure what retirement will cost? Take 5 minutes to explore your ideal retirement lifestyle.
          </p>
          <ul className="text-sm text-slate-600 space-y-2 mb-4">
            <li>• Guided lifestyle discovery</li>
            <li>• Pre-fills your calculations</li>
            <li>• Suggests lifestyle events</li>
          </ul>

          {hasLifestyleProfile && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                ✓ You have a lifestyle profile saved
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/lifestyle')}
              className="w-full px-6 py-3 bg-sky-600 text-white rounded-md font-medium hover:bg-sky-700 transition-colors"
            >
              {hasLifestyleProfile ? 'Edit My Lifestyle' : 'Start Discovery'}
            </button>
            {!hasLifestyleProfile && (
              <button
                onClick={() => navigate('/calculator')}
                className="w-full px-6 py-2 text-slate-600 hover:text-slate-800 text-sm transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-4 text-center">
            Optional • 5 minutes • Update anytime
          </p>
        </div>
      </div>

      {/* Additional info */}
      {!isAuthenticated && (
        <div className="text-center p-6 bg-slate-50 rounded-lg">
          <p className="text-slate-700 mb-3">
            💾 <strong>Sign in to save your progress</strong>
          </p>
          <p className="text-sm text-slate-600">
            All data can be saved securely to your account and accessed from any device
          </p>
        </div>
      )}
    </div>
    </>
  );
}
