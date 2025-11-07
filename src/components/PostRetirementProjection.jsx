// src/components/PostRetirementProjection.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { calculateProjection, extractWarnings } from '../logic/projection';
import ProjectionInputs from './ProjectionInputs';
import LifeEvents from './LifeEvents';
import ProjectionTable from './ProjectionTable';
import ProjectionCharts from './ProjectionCharts';
import SaveBar from './SaveBar';
import { formatCurrency } from '../utils/money';
import { loadProjectionInputs, saveProjectionInputs, loadUnifiedData, getLastCloudSave, setLastCloudSave } from '../utils/persist';
import { useAuth } from '../auth/AuthProvider';
import { transformToProjectionEvents } from '../utils/lifestyleProfile';

export default function PostRetirementProjection() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, getAccessToken } = useAuth();
  const openingValues = location.state?.openingValues;

  // Lifestyle profile state
  const [lifestyleProfile, setLifestyleProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const profileEventsLoadedRef = useRef(false); // Track if we've loaded profile events

  // Load saved projection inputs from localStorage
  const savedInputs = loadProjectionInputs();
  console.log('📊 Projection: Loaded savedInputs from localStorage:', savedInputs);

  // Redirect if no opening values
  useEffect(() => {
    if (!openingValues) {
      navigate('/');
    }
  }, [openingValues, navigate]);

  // Projection inputs state - initialize from localStorage if available
  const [isaRecurringAmount, setIsaRecurringAmount] = useState(
    savedInputs?.isaRecurringAmount ?? ""
  );
  const [isaRecurringYears, setIsaRecurringYears] = useState(
    savedInputs?.isaRecurringYears ?? ""
  );
  const [dcDrawdownPercent, setDcDrawdownPercent] = useState(
    savedInputs?.dcDrawdownPercent ?? openingValues?.dcDrawdownPercent ?? 4.0
  );
  const [lifeEvents, setLifeEvents] = useState(savedInputs?.lifeEvents ?? []);
  const [helpVisibility, setHelpVisibility] = useState({});

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isInitialLoadRef = useRef(true); // Track if we're in initial load phase
  const cloudLoadPendingRef = useRef(false); // Track if cloud load is in progress

  // Mark initial load complete after component mounts and initial data is set
  useEffect(() => {
    // If no saved data, mark load complete immediately
    if (!savedInputs) {
      console.log('📊 Projection: No saved data found');
      isInitialLoadRef.current = false;
      return;
    }

    // Otherwise wait for state updates to complete (generous timeout to be safe)
    // But if cloud load is pending, wait for it to complete
    setTimeout(() => {
      if (cloudLoadPendingRef.current) {
        console.log('⏳ Projection: Waiting for cloud load to complete before marking initial load done');
        return; // Don't mark as complete yet - cloud load callback will do it
      }

      isInitialLoadRef.current = false;
      console.log('✅ Projection: Initial load complete');

      // Check if data was recently saved to cloud (e.g., from At-Retirement page)
      const lastCloudSave = getLastCloudSave();
      if (lastCloudSave) {
        const cloudSaveTime = new Date(lastCloudSave).getTime();
        const now = Date.now();
        // If cloud save was within last 5 seconds, assume sessionStorage is in sync
        if (now - cloudSaveTime < 5000) {
          console.log('☁️ Recent cloud save detected - clearing unsaved changes flag');
          setHasUnsavedChanges(false);
        }
      }
    }, 500);
  }, []);

  // Load lifestyle profile and auto-populate events
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!isAuthenticated) {
          setLoadingProfile(false);
          return;
        }

        if (!openingValues) {
          setLoadingProfile(false);
          return;
        }

        const audience = import.meta.env.VITE_API_AUDIENCE;
        if (!audience) {
          console.log('No API audience - skipping profile load');
          setLoadingProfile(false);
          return;
        }

        const token = await getAccessToken(audience);
        const res = await fetch('/api/me/lifestyle', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const profile = await res.json();
          if (profile && profile.exceptionalItems && profile.exceptionalItems.length > 0) {
            console.log('✅ Loaded lifestyle profile:', profile);
            setLifestyleProfile(profile);

            // Only auto-populate events if we haven't done so yet and no events exist
            if (!profileEventsLoadedRef.current && lifeEvents.length === 0) {
              const retirementAge = openingValues.retirementAge;
              const transformedEvents = transformToProjectionEvents(
                profile.exceptionalItems,
                retirementAge
              );

              if (transformedEvents.length > 0) {
                console.log('✅ Auto-populated events from profile:', transformedEvents);
                setLifeEvents(transformedEvents);
                profileEventsLoadedRef.current = true;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load lifestyle profile:', e);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, getAccessToken, openingValues]); // Re-run if auth or openingValues change

  // Auto-save projection inputs to localStorage whenever they change
  useEffect(() => {
    const dataToSave = {
      isaRecurringAmount,
      isaRecurringYears,
      dcDrawdownPercent,
      lifeEvents,
    };
    console.log('💾 Projection: Saving to localStorage:', dataToSave);
    saveProjectionInputs(dataToSave);

    // Only mark as unsaved if not in initial load phase
    if (!isInitialLoadRef.current) {
      console.log('💾 Projection: Auto-save triggered - marking as unsaved changes');
      setHasUnsavedChanges(true);
    } else {
      console.log('💾 Projection: Auto-save during initial load - NOT marking as unsaved');
    }
  }, [isaRecurringAmount, isaRecurringYears, dcDrawdownPercent, lifeEvents]);

  // Calculate projection when inputs change
  const projectionResults = useMemo(() => {
    if (!openingValues) return null;

    return calculateProjection(openingValues, {
      isaRecurringAmount: parseFloat(isaRecurringAmount) || 0,
      isaRecurringYears: parseFloat(isaRecurringYears) || 0,
      dcDrawdownPercent: parseFloat(dcDrawdownPercent) || 4.0,
      lifeEvents,
    });
  }, [openingValues, isaRecurringAmount, isaRecurringYears, dcDrawdownPercent, lifeEvents]);

  const warnings = useMemo(() => {
    if (!projectionResults) return [];
    return extractWarnings(projectionResults);
  }, [projectionResults]);

  if (!openingValues) {
    return <div>Loading...</div>;
  }

  // Get unified data for SaveBar
  const unifiedData = loadUnifiedData();
  const atRetirementInputs = unifiedData?.atRetirement?.form || {};
  const atRetirementOutputs = unifiedData?.atRetirement?.atRetirement || {};

  // Prepare data for export (includes both sections)
  const exportData = {
    inputs: atRetirementInputs,
    outputs: atRetirementOutputs,
    projection: {
      isaRecurringAmount,
      isaRecurringYears,
      dcDrawdownPercent,
      lifeEvents,
    },
  };

  return (
    <div className="max-w-full md:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-2">
          25-Year Retirement Projection
        </h1>
        <button
          onClick={() => navigate('/')}
          className="text-sky-600 hover:text-sky-700 text-sm"
        >
          ← Back to At-Retirement Calculator
        </button>
      </div>

      {/* Save / Print / Export */}
      <SaveBar
        inputs={exportData.inputs}
        outputs={exportData.outputs}
        projection={exportData.projection}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveSuccess={() => {
          setHasUnsavedChanges(false);
          setLastCloudSave(); // Update shared cloud save timestamp
        }}
        onCloudLoadStart={() => {
          console.log('☁️ Projection: Cloud load starting');
          cloudLoadPendingRef.current = true;
        }}
        onCloudLoadComplete={() => {
          console.log('☁️ Projection: Cloud load complete');
          cloudLoadPendingRef.current = false;
          // Mark initial load as complete now that cloud data has loaded
          isInitialLoadRef.current = false;
          setHasUnsavedChanges(false); // Cloud data just loaded, so no unsaved changes
        }}
        onImportJson={(data) => {
          // Temporarily mark as loading to prevent unsaved changes flag
          isInitialLoadRef.current = true;

          // Handle imported data - update projection inputs if present
          if (data?.projection) {
            setIsaRecurringAmount(data.projection.isaRecurringAmount ?? "");
            setIsaRecurringYears(data.projection.isaRecurringYears ?? "");
            setDcDrawdownPercent(data.projection.dcDrawdownPercent ?? 4.0);
            setLifeEvents(data.projection.lifeEvents ?? []);
          }
          // Note: At Retirement data is handled by sessionStorage auto-load

          // Reset loading flag and clear unsaved changes after data loads (generous timeout)
          setTimeout(() => {
            isInitialLoadRef.current = false;
            setHasUnsavedChanges(false); // Data just loaded from cloud, so no unsaved changes
            console.log('✅ Projection: Import complete - no unsaved changes');
          }, 500);
        }}
        onClearLocal={() => {
          if (confirm("Clear all local data? This will reset both At Retirement and Projection data.")) {
            sessionStorage.clear();
            navigate('/');
          }
        }}
      />

      {/* Opening Values Summary */}
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          Opening Values (At Retirement)
        </h2>
        <div className="space-y-2 text-base sm:text-base">
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">Retirement Age:</span>
            <span className="font-semibold text-slate-800">{openingValues.retirementAge}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">DC Pot (after PCLS):</span>
            <span className="font-semibold text-slate-800">{formatCurrency(openingValues.dcPotAfterPCLS)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">ISA Savings:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(openingValues.isaSavings)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">Taxable Savings:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(openingValues.taxableSavings)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">DB Pension:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(openingValues.dbPension)}/year</span>
          </div>
          {openingValues.annuityIncome > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
              <span className="text-slate-600">Annuity Income:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(openingValues.annuityIncome)}/year</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">State Pension:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(openingValues.statePension)}/year (from age {openingValues.statePensionAge})</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">Other Income:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(openingValues.otherIncome)}/year</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-t border-slate-200 mt-2 pt-2 gap-1">
            <span className="text-slate-600">Target Annual Spend:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(openingValues.annualSpend)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
            <span className="text-slate-600">Inflation Assumption:</span>
            <span className="font-semibold text-slate-800">{openingValues.inflation}%</span>
          </div>
        </div>
      </div>

      {/* Projection Inputs */}
      <ProjectionInputs
        isaRecurringAmount={isaRecurringAmount}
        setIsaRecurringAmount={setIsaRecurringAmount}
        isaRecurringYears={isaRecurringYears}
        setIsaRecurringYears={setIsaRecurringYears}
        dcDrawdownPercent={dcDrawdownPercent}
        setDcDrawdownPercent={setDcDrawdownPercent}
      />

      {/* Lifestyle Events */}
      <div className="mb-6">
        {lifestyleProfile && profileEventsLoadedRef.current && lifeEvents.some(e => e.source === 'lifestyleProfile') && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              📋 <strong>Events from your lifestyle profile have been added below.</strong>
              {' '}You can edit, delete, or add more events.
              {' '}
              <button
                onClick={() => navigate('/lifestyle')}
                className="text-sky-600 hover:text-sky-700 underline font-medium"
              >
                Edit lifestyle profile
              </button>
            </p>
          </div>
        )}
        <LifeEvents
          currentAge={openingValues.retirementAge}
          retirementAge={openingValues.retirementAge + 25}
          events={lifeEvents}
          setEvents={setLifeEvents}
          helpVisibility={helpVisibility}
          setHelpVisibility={setHelpVisibility}
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6 rounded">
          <h3 className="text-red-800 font-semibold text-lg mb-2">⚠️ Asset Depletion Warnings</h3>
          <ul className="text-red-700 space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>
                <strong>Age {w.age}:</strong> {w.messages.join(', ')}
              </li>
            ))}
          </ul>
          <p className="text-red-600 mt-3 text-sm">
            Consider: Reducing spending, adjusting drawdown %, or modifying life events
          </p>
        </div>
      )}

      {/* Results Section */}
      {projectionResults && (
        <>
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-2 border-b border-slate-200 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">25-Year Projection Results</h2>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>🖨️</span>
                <span>Print / Save PDF</span>
              </button>
            </div>
            <p className="text-slate-600 text-sm sm:text-base mb-6">
              Visual analysis of your retirement assets and cash flow over 25 years
            </p>
            <ProjectionCharts data={projectionResults} />
          </div>

          <div className="mb-6">
            <ProjectionTable data={projectionResults} />
          </div>
        </>
      )}
    </div>
  );
}
