// src/components/Welcome.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllModuleIds, getModuleInfo, getModuleCompletionStatus } from '../utils/dataSchema';

export default function Welcome() {
  const navigate = useNavigate();
  const [savedData, setSavedData] = useState(null);
  const [showQuickNav, setShowQuickNav] = useState(false);

  // Redirect to wizard if lifestyleGoals parameter is present
  // (lifestyleGoals is handled by WizardShell, not Welcome)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('lifestyleGoals')) {
      // Preserve all query parameters when redirecting
      navigate('/wizard' + window.location.search, { replace: true });
    }
  }, [navigate]);

  // Load saved data to check if user has an in-progress plan
  useEffect(() => {
    const stored = localStorage.getItem('retireplan-wizard-data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setSavedData(data);
      } catch (e) {
        console.error('Failed to parse saved data:', e);
      }
    }
  }, []);

  // Start wizard from beginning
  const handleStartWizard = () => {
    navigate('/wizard?module=1');
  };

  // Continue wizard from last incomplete module
  const handleContinueWizard = () => {
    if (!savedData) {
      navigate('/wizard?module=1');
      return;
    }

    // Find first incomplete module
    const allModuleIds = getAllModuleIds();
    const firstIncomplete = allModuleIds.find(id => {
      const status = getModuleCompletionStatus(id, savedData);
      return !status.completed;
    });

    const moduleId = firstIncomplete || allModuleIds.length; // Last module if all complete
    navigate(`/wizard?module=${moduleId}`);
  };

  // Jump to specific module
  const handleJumpToModule = (moduleId) => {
    navigate(`/wizard?module=${moduleId}`);
  };

  // Calculate progress
  const progressPercent = savedData
    ? Math.round(
        (savedData.metadata?.completedModules?.length || 0) / getAllModuleIds().length * 100
      )
    : 0;

  const hasProgress = savedData && savedData.metadata?.completedModules?.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="RetirePlan" className="h-16" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">RetirePlan QuickCheck</h1>
              <p className="text-sm text-slate-500">Your complete retirement planning wizard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Welcome to Your Retirement Journey
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Plan your retirement in 10 simple steps. Get a complete picture of your finances and
            see a detailed 25-year projection.
          </p>
        </div>

        {/* Progress indicator (if user has started) */}
        {hasProgress && (
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Your Progress</h3>
              <span className="text-2xl font-bold text-sky-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">
              {savedData.metadata?.completedModules?.length || 0} of {getAllModuleIds().length} modules completed
            </p>
          </div>
        )}

        {/* Two main cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Start/Continue */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-sky-500 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4">
              <h3 className="text-2xl font-bold text-white">
                {hasProgress ? '📊 Continue Your Plan' : '🚀 START HERE'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                {hasProgress
                  ? 'Pick up where you left off and complete your retirement plan.'
                  : 'Begin your guided retirement planning journey. We\'ll walk you through each step.'}
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-sm text-slate-700">Step-by-step guidance through 10 modules</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-sm text-slate-700">Complete financial position at retirement</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-sm text-slate-700">Detailed 25-year projection</span>
                </div>
              </div>
              <button
                onClick={hasProgress ? handleContinueWizard : handleStartWizard}
                className="w-full py-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 font-bold text-lg transition-colors"
              >
                {hasProgress ? 'Continue Planning →' : 'Start Planning →'}
              </button>
              {hasProgress && (
                <button
                  onClick={handleStartWizard}
                  className="w-full mt-3 py-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
                >
                  Start Over from Beginning
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Quick Navigation */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
              <h3 className="text-2xl font-bold text-white">⚡ QUICK NAVIGATION</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                Jump directly to any module. Perfect for power users who know exactly what they need to update.
              </p>
              <div className="mb-6">
                <button
                  onClick={() => setShowQuickNav(!showQuickNav)}
                  className="w-full py-3 px-4 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 font-medium transition-colors flex items-center justify-between"
                >
                  <span>Select Module to Jump To</span>
                  <span className="text-xl">{showQuickNav ? '▲' : '▼'}</span>
                </button>
              </div>

              {showQuickNav && (
                <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-200 rounded-md p-2">
                  {getAllModuleIds().map(moduleId => {
                    const module = getModuleInfo(moduleId);
                    const status = savedData ? getModuleCompletionStatus(moduleId, savedData) : { completed: false, hasData: false };

                    return (
                      <button
                        key={moduleId}
                        onClick={() => handleJumpToModule(moduleId)}
                        className="w-full text-left px-4 py-3 rounded-md hover:bg-slate-50 border border-slate-200 transition-colors flex items-center gap-3"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          status.completed
                            ? 'bg-green-500 text-white'
                            : status.hasData
                            ? 'bg-slate-300 text-slate-700'
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          {moduleId}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{module.title}</div>
                          <div className="text-xs text-slate-500">{module.description}</div>
                        </div>
                        {status.completed && (
                          <span className="text-green-500 text-xl">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {!showQuickNav && (
                <div className="text-center text-slate-400 py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-sm">Click above to view all modules</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">What You'll Discover</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-2">💰</div>
              <h4 className="font-semibold text-slate-800 mb-1">Your Retirement Position</h4>
              <p className="text-sm text-slate-600">
                See your complete financial picture at retirement, including all income sources and expenses.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">📈</div>
              <h4 className="font-semibold text-slate-800 mb-1">25-Year Projection</h4>
              <p className="text-sm text-slate-600">
                View year-by-year breakdown of your retirement finances with interactive charts.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold text-slate-800 mb-1">Lifestyle Planning</h4>
              <p className="text-sm text-slate-600">
                Plan for major purchases, travel, and life events throughout your retirement.
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Your progress is automatically saved as you go. You can return anytime to continue.</p>
        </div>
      </div>
    </div>
  );
}
