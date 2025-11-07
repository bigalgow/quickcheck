// src/components/LifestyleCalculatorPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import LifestyleCalculator from './LifestyleCalculator';
import { saveLifestyleProfile, loadLifestyleProfile } from '../utils/lifestyleProfile';

export default function LifestyleCalculatorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, getAccessToken, signIn } = useAuth();
  const [existingProfile, setExistingProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = location.state?.editing;

  // Load existing profile if editing
  useEffect(() => {
    async function loadProfile() {
      if (isAuthenticated && getAccessToken) {
        try {
          const profile = await loadLifestyleProfile(getAccessToken);
          setExistingProfile(profile);
        } catch (e) {
          console.error('Failed to load profile for editing:', e);
        }
      }
      setLoading(false);
    }

    if (isEditing) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken, isEditing]);

  const handleComplete = async (profile) => {
    // If not authenticated, prompt login and save after
    if (!isAuthenticated) {
      if (confirm('You need to log in to save your lifestyle profile. Would you like to log in now?')) {
        // Store profile in sessionStorage temporarily
        sessionStorage.setItem('pendingLifestyleProfile', JSON.stringify(profile));
        signIn();
      } else {
        // Skip saving and navigate to calculator
        navigate('/calculator');
      }
      return;
    }

    // Save profile
    setSaving(true);
    try {
      const success = await saveLifestyleProfile(profile, getAccessToken);
      if (success) {
        // Navigate to calculator
        navigate('/calculator', { state: { lifestyleProfileSaved: true } });
      } else {
        alert('Failed to save lifestyle profile. You can still use the calculator.');
        navigate('/calculator');
      }
    } catch (e) {
      console.error('Error saving profile:', e);
      alert('Failed to save lifestyle profile. You can still use the calculator.');
      navigate('/calculator');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/calculator');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Saving your lifestyle profile...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-slate-50 border-b border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate('/')}
            className="text-sky-600 hover:text-sky-700 text-sm font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      <LifestyleCalculator
        onComplete={handleComplete}
        onSkip={handleSkip}
        existingProfile={existingProfile}
      />
    </div>
  );
}
