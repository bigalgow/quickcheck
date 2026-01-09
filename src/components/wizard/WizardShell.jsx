// src/components/wizard/WizardShell.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { defaultRetirePlanData, getModuleInfo, getModuleCompletionStatus, markModuleCompleted, getAllModuleIds } from '../../utils/dataSchema';
import { MODULE_COMPONENTS } from './moduleRegistry.jsx';
import WizardSaveBar from './WizardSaveBar.jsx';

/**
 * WizardShell - Main wizard container with navigation and progress tracking
 */
export default function WizardShell() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current module from URL (default to 1)
  const currentModuleId = parseInt(searchParams.get('module') || '1');

  // Wizard data state
  const [data, setData] = useState(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem('retireplan-wizard-data');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored wizard data:', e);
      }
    }
    return defaultRetirePlanData;
  });

  // Autosave to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('retireplan-wizard-data', JSON.stringify(data));
  }, [data]);

  // Update data handler
  const handleDataChange = useCallback((newData) => {
    setData(prevData => ({
      ...prevData,
      ...newData,
      metadata: {
        ...prevData.metadata,
        lastModified: new Date().toISOString(),
      },
    }));
  }, []);

  // Navigate to a specific module
  const goToModule = useCallback((moduleId) => {
    const allModuleIds = getAllModuleIds();
    if (allModuleIds.includes(moduleId)) {
      setSearchParams({ module: moduleId.toString() });
      // Scroll to top when changing modules
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [setSearchParams]);

  // Navigate to next module
  const goToNext = useCallback(() => {
    const nextModuleId = currentModuleId + 1;
    if (nextModuleId <= 10) {
      // Mark current module as completed
      setData(prevData => markModuleCompleted(prevData, currentModuleId));
      goToModule(nextModuleId);
    }
  }, [currentModuleId, goToModule]);

  // Navigate to previous module
  const goToPrevious = useCallback(() => {
    const prevModuleId = currentModuleId - 1;
    if (prevModuleId >= 1) {
      goToModule(prevModuleId);
    }
  }, [currentModuleId, goToModule]);

  // Mark current module as completed and stay on it
  const markCompleted = useCallback(() => {
    setData(prevData => markModuleCompleted(prevData, currentModuleId));
  }, [currentModuleId]);

  // Exit wizard and return to welcome page
  const exitWizard = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Import data from JSON or cloud
  const handleImportData = useCallback((importedData) => {
    setData(importedData);
    // Force reload by navigating to module 1, then back to current module
    const currentId = currentModuleId;
    setSearchParams({ module: '1' });
    setTimeout(() => {
      setSearchParams({ module: currentId.toString() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, [currentModuleId, setSearchParams]);

  // Save success handler
  const handleSaveSuccess = useCallback(() => {
    console.log('✅ Save successful');
  }, []);

  // Get current module info
  const currentModule = getModuleInfo(currentModuleId);
  const ModuleComponent = MODULE_COMPONENTS[currentModuleId];

  if (!currentModule || !ModuleComponent) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Module Not Found</h2>
          <p className="text-slate-600 mb-6">
            Module {currentModuleId} does not exist.
          </p>
          <button
            onClick={exitWizard}
            className="px-6 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
          >
            Return to Welcome Page
          </button>
        </div>
      </div>
    );
  }

  // Calculate progress
  const allModuleIds = getAllModuleIds();
  const completedCount = allModuleIds.filter(id =>
    getModuleCompletionStatus(id, data).completed
  ).length;
  const progressPercent = Math.round((completedCount / allModuleIds.length) * 100);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Save Bar */}
      <WizardSaveBar
        data={data}
        onImportData={handleImportData}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Header with progress and navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Top row: Logo, Progress, Exit */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="RetirePlan" className="h-12" />
              <div>
                <h1 className="text-xl font-bold text-slate-800">Retirement Planner</h1>
                <p className="text-sm text-slate-500">
                  Module {currentModuleId} of {allModuleIds.length}
                </p>
              </div>
            </div>

            <button
              onClick={exitWizard}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              ← Exit Wizard
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Progress: {completedCount} / {allModuleIds.length} completed
              </span>
              <span className="text-sm text-slate-500">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Module dots */}
          <div className="flex items-center justify-center gap-2">
            {allModuleIds.map(id => {
              const status = getModuleCompletionStatus(id, data);
              const isCurrent = id === currentModuleId;
              const isCompleted = status.completed;
              const hasData = status.hasData;

              return (
                <button
                  key={id}
                  onClick={() => goToModule(id)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-sky-500 text-white ring-2 ring-sky-300 ring-offset-2'
                      : isCompleted
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : hasData
                      ? 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                      : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                  }`}
                  title={getModuleInfo(id)?.title}
                >
                  {id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Module title and description */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {currentModule.title}
          </h2>
          <p className="text-lg text-slate-600">
            {currentModule.description}
          </p>
        </div>

        {/* Module component */}
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
          <ModuleComponent
            data={data}
            onDataChange={handleDataChange}
            onNext={goToNext}
            onPrevious={goToPrevious}
            onComplete={markCompleted}
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goToPrevious}
            disabled={currentModuleId === 1}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              currentModuleId === 1
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-500 text-white hover:bg-slate-600'
            }`}
          >
            ← Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={markCompleted}
              className="px-6 py-3 rounded-md font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              ✓ Mark Complete
            </button>

            {currentModuleId < 10 && (
              <button
                onClick={goToNext}
                className="px-6 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
              >
                Next →
              </button>
            )}

            {currentModuleId === 10 && (
              <button
                onClick={exitWizard}
                className="px-6 py-3 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Finish →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Menu (future enhancement) */}
      {/* TODO: Add dropdown for quick navigation to any module */}
    </div>
  );
}
