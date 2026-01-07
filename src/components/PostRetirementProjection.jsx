// src/components/PostRetirementProjection.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { calculateProjection, extractWarnings } from '../logic/projection';
import ProjectionInputs from './ProjectionInputs';
import LifeEvents from './LifeEvents';
import ProjectionTable from './ProjectionTable';
import ProjectionCharts from './ProjectionCharts';
import SaveBar from './SaveBar';
import HeaderLayout from './HeaderLayout';
import { formatCurrency } from '../utils/money';
import { loadProjectionInputs, saveProjectionInputs, loadUnifiedData, getLastCloudSave, setLastCloudSave } from '../utils/persist';
import { useAuth } from '../auth/AuthProvider';
import { transformToProjectionEvents } from '../utils/lifestyleProfile';
import { estimateIncomeTax, TAX_2025_EWNI, TAX_2025_SCOTLAND } from '../utils/tax';

export default function PostRetirementProjection() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, getAccessToken } = useAuth();
  const openingValues = location.state?.openingValues;

  // Lifestyle profile state
  const [lifestyleProfile, setLifestyleProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const profileEventsLoadedRef = useRef(false); // Track if we've loaded profile events
  const [triggerProfileLoad, setTriggerProfileLoad] = useState(0); // Increment to trigger profile load

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
    // BAND-AID FIX: Removed "not authenticated" check - profile should load for ALL users
    // If no saved data, mark load complete immediately and trigger profile load
    if (!savedInputs) {
      console.log('📊 Projection: No saved data found');
      isInitialLoadRef.current = false;

      // Trigger lifestyle profile load for all users (not just unauthenticated)
      console.log('📊 Projection: Triggering lifestyle profile load immediately');
      setTriggerProfileLoad(prev => prev + 1);
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

      // Trigger lifestyle profile load for all users (not just unauthenticated)
      console.log('📊 Projection: Triggering lifestyle profile load after initial load');
      setTriggerProfileLoad(prev => prev + 1);

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
  }, [isAuthenticated]);

  // Load lifestyle profile and smart-merge events
  useEffect(() => {
    // Only load if triggered (prevents loading before cloud data import completes)
    if (triggerProfileLoad === 0) {
      console.log('🎬 Lifestyle profile useEffect - waiting for trigger...');
      return;
    }

    console.log('🎬 Lifestyle profile useEffect triggered!', triggerProfileLoad);
    console.log('  isAuthenticated:', isAuthenticated);
    console.log('  openingValues:', openingValues);

    const loadProfile = async () => {
      try {
        if (!openingValues) {
          console.log('⚠️ No openingValues, skipping profile load');
          setLoadingProfile(false);
          return;
        }

        let profile = null;

        // Try to load from cloud if authenticated
        if (isAuthenticated) {
          console.log('🔍 User is authenticated, attempting cloud load...');
          const audience = import.meta.env.VITE_API_AUDIENCE;
          if (audience) {
            try {
              const token = await getAccessToken(audience);
              console.log('🔑 Got access token, fetching /api/me/lifestyle...');
              const res = await fetch('/api/me/lifestyle', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
              });

              console.log('📡 API response status:', res.status);

              if (res.ok) {
                profile = await res.json();
                console.log('✅ Loaded lifestyle profile from cloud:', profile);
                console.log('📋 Exceptional items:', profile?.exceptionalItems);
              } else {
                console.warn('❌ API returned error:', res.status, await res.text());
              }
            } catch (e) {
              console.warn('❌ Failed to load from cloud, will try sessionStorage:', e);
            }
          } else {
            console.log('⚠️ No API audience configured');
          }
        } else {
          console.log('🔍 User not authenticated, will try sessionStorage');
        }

        // If not authenticated or cloud load failed, try sessionStorage
        if (!profile) {
          try {
            const stored = sessionStorage.getItem('retireplan.lifestyleProfile');
            if (stored) {
              profile = JSON.parse(stored);
              console.log('✅ Loaded lifestyle profile from sessionStorage:', profile);
            }
          } catch (e) {
            console.warn('Failed to load from sessionStorage:', e);
          }
        }

        // If we have a profile with exceptional items, merge them into life events
        if (profile && profile.exceptionalItems && profile.exceptionalItems.length > 0) {
          console.log('🎯 Profile has exceptional items, transforming to life events...');
          setLifestyleProfile(profile);

          const retirementAge = openingValues.retirementAge;
          console.log('📅 Retirement age:', retirementAge);

          const newProfileEvents = transformToProjectionEvents(
            profile.exceptionalItems,
            retirementAge
          );
          console.log('🔄 Transformed events:', newProfileEvents);

          // Smart merge: Remove old profile-sourced events, keep manual events, add new profile events
          setLifeEvents(currentEvents => {
            // Keep only manual events (no source field or source !== 'lifestyleProfile')
            const manualEvents = currentEvents.filter(e => e.source !== 'lifestyleProfile');

            // Combine with new profile events
            const mergedEvents = [...manualEvents, ...newProfileEvents];

            console.log(`✅ Smart merge: ${manualEvents.length} manual + ${newProfileEvents.length} profile = ${mergedEvents.length} total events`);

            return mergedEvents;
          });

          profileEventsLoadedRef.current = true;
        } else {
          console.log('⚠️ No profile or no exceptional items found');
          console.log('Profile:', profile);
          console.log('Has exceptionalItems?:', profile?.exceptionalItems);
          console.log('exceptionalItems length:', profile?.exceptionalItems?.length);
        }
      } catch (e) {
        console.warn('Failed to load lifestyle profile:', e);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [triggerProfileLoad, isAuthenticated, getAccessToken, openingValues]); // Re-run when triggered

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

  // Calculate correct opening tax based on actual gross income shown in opening summary
  const openingTaxCorrect = useMemo(() => {
    if (!openingValues) return 0;

    const dcDrawdownAmount = openingValues.dcPotAfterPCLS * (parseFloat(dcDrawdownPercent) || 4.0) / 100;
    const statePensionAmount = openingValues.retirementAge >= openingValues.statePensionAge
      ? openingValues.statePension
      : 0;

    // Calculate total pensionable income (pensions + other income + DC drawdown)
    const pensionableIncome =
      openingValues.dbPension +
      openingValues.annuityIncome +
      statePensionAmount +
      openingValues.otherIncome +
      dcDrawdownAmount;

    // Get the correct tax configuration based on region
    const cfg = openingValues.taxRegion === 'scotland' ? TAX_2025_SCOTLAND : TAX_2025_EWNI;

    // Calculate tax using the same function as At Retirement
    // Note: savingsInterest is 0 for opening position (interest accrues during projection)
    const tax = estimateIncomeTax({
      pensionableIncome,
      savingsInterest: 0,
      cfg,
    });

    return tax;
  }, [openingValues, dcDrawdownPercent]);

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
    <div className="max-w-full md:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-24">
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
      <HeaderLayout hasUnsavedChanges={hasUnsavedChanges}>
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
            // BAND-AID FIX: This is now only called for error cases or when no data found
            // (onImportJson handles the normal success case)
            console.log('☁️ Projection: Cloud load complete (no data or error)');
            cloudLoadPendingRef.current = false;
            isInitialLoadRef.current = false;
            setHasUnsavedChanges(false);

            // Still trigger lifestyle profile load even if cloud had no data
            console.log('☁️ Projection: Triggering lifestyle profile load');
            setTriggerProfileLoad(prev => prev + 1);
          }}
          onImportJson={(data) => {
            // Temporarily mark as loading to prevent unsaved changes flag
            isInitialLoadRef.current = true;

            // Handle imported data - update projection inputs if present
            if (data?.projection) {
              setIsaRecurringAmount(data.projection.isaRecurringAmount ?? "");
              setIsaRecurringYears(data.projection.isaRecurringYears ?? "");
              setDcDrawdownPercent(data.projection.dcDrawdownPercent ?? 4.0);

              // BAND-AID FIX: Preserve lifecycle profile events when importing cloud data
              // Only import manual events from cloud, not profile events (which will load separately)
              setLifeEvents(currentEvents => {
                const cloudEvents = data.projection.lifeEvents ?? [];
                const profileEvents = currentEvents.filter(e => e.source === 'lifestyleProfile');

                // Keep profile events from current state, add cloud events that aren't profile-sourced
                const manualCloudEvents = cloudEvents.filter(e => e.source !== 'lifestyleProfile');
                const merged = [...profileEvents, ...manualCloudEvents];

                console.log(`🔄 Import: ${profileEvents.length} profile events preserved + ${manualCloudEvents.length} cloud manual events = ${merged.length} total`);
                return merged;
              });
            }
            // Note: At Retirement data is handled by sessionStorage auto-load

            // BAND-AID FIX: Complete the cloud load sequence AFTER state updates finish
            // This triggers lifestyle profile loading at the right time
            setTimeout(() => {
              console.log('☁️ Projection: Cloud load complete (called from onImportJson)');
              cloudLoadPendingRef.current = false;
              isInitialLoadRef.current = false;
              setHasUnsavedChanges(false); // Data just loaded from cloud, so no unsaved changes
              console.log('✅ Projection: Import complete - no unsaved changes');

              // Now that cloud data is imported and state is stable, trigger lifestyle profile load
              console.log('☁️ Projection: Triggering lifestyle profile load after cloud import');
              setTriggerProfileLoad(prev => prev + 1);
            }, 500);
          }}
          onClearLocal={() => {
            if (confirm("Clear all local data? This will reset both At Retirement and Projection data.")) {
              sessionStorage.clear();
              navigate('/');
            }
          }}
        />
      </HeaderLayout>

      {/* Opening Values Summary */}
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          Opening Position (At Retirement, Age {openingValues.retirementAge})
        </h2>

        {/* Financial Summary Box */}
        <div className="bg-sky-50 border-2 border-sky-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Assets */}
            <div>
              <div className="text-sm text-slate-600 mb-1">Total Assets</div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(
                  openingValues.dcPotAfterPCLS +
                  openingValues.isaSavings +
                  openingValues.taxableSavings
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                DC + ISA + Taxable
              </div>
            </div>

            {/* Gross Annual Income */}
            <div>
              <div className="text-sm text-slate-600 mb-1">Gross Annual Income</div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(
                  openingValues.dbPension +
                  openingValues.annuityIncome +
                  (openingValues.retirementAge >= openingValues.statePensionAge ? openingValues.statePension : 0) +
                  openingValues.otherIncome +
                  (openingValues.dcPotAfterPCLS * (parseFloat(dcDrawdownPercent) || 4.0) / 100)
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Pensions + DC Drawdown ({dcDrawdownPercent}%)
              </div>
            </div>

            {/* Income Tax */}
            <div>
              <div className="text-sm text-slate-600 mb-1">Income Tax</div>
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(openingTaxCorrect)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Estimated annual tax
              </div>
            </div>

            {/* Net Annual Income */}
            <div>
              <div className="text-sm text-slate-600 mb-1">Net Annual Income</div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(
                  openingValues.dbPension +
                  openingValues.annuityIncome +
                  (openingValues.retirementAge >= openingValues.statePensionAge ? openingValues.statePension : 0) +
                  openingValues.otherIncome +
                  (openingValues.dcPotAfterPCLS * (parseFloat(dcDrawdownPercent) || 4.0) / 100) -
                  openingTaxCorrect
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                After tax
              </div>
            </div>

            {/* Target Expenditure */}
            <div>
              <div className="text-sm text-slate-600 mb-1">Target Expenditure</div>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(openingValues.annualSpend)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Annual spending goal
              </div>
            </div>

            {/* Surplus/Deficit */}
            <div>
              <div className="text-sm text-slate-600 mb-1">Annual Surplus/Deficit</div>
              <div className={`text-2xl font-bold ${
                (openingValues.dbPension +
                 openingValues.annuityIncome +
                 (openingValues.retirementAge >= openingValues.statePensionAge ? openingValues.statePension : 0) +
                 openingValues.otherIncome +
                 (openingValues.dcPotAfterPCLS * (parseFloat(dcDrawdownPercent) || 4.0) / 100) -
                 openingTaxCorrect) -
                openingValues.annualSpend >= 0
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}>
                {formatCurrency(Math.abs(
                  (openingValues.dbPension +
                   openingValues.annuityIncome +
                   (openingValues.retirementAge >= openingValues.statePensionAge ? openingValues.statePension : 0) +
                   openingValues.otherIncome +
                   (openingValues.dcPotAfterPCLS * (parseFloat(dcDrawdownPercent) || 4.0) / 100) -
                   openingTaxCorrect) -
                  openingValues.annualSpend
                ))}
                {(openingValues.dbPension +
                  openingValues.annuityIncome +
                  (openingValues.retirementAge >= openingValues.statePensionAge ? openingValues.statePension : 0) +
                  openingValues.otherIncome +
                  (openingValues.dcPotAfterPCLS * (parseFloat(dcDrawdownPercent) || 4.0) / 100) -
                  openingTaxCorrect) -
                 openingValues.annualSpend < 0 && ' shortfall'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Net income minus expenditure
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-sky-600 hover:text-sky-700 mb-2">
            Show detailed breakdown
          </summary>
          <div className="space-y-2 text-base sm:text-base mt-3 pt-3 border-t border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-2">Assets:</h3>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
              <span className="text-slate-600">DC Pot (after PCLS):</span>
              <span className="font-semibold text-slate-800">{formatCurrency(openingValues.dcPotAfterPCLS)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
              <span className="text-slate-600">ISA Savings:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(openingValues.isaSavings)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
              <span className="text-slate-600">Taxable Savings:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(openingValues.taxableSavings)}</span>
            </div>

            <h3 className="font-semibold text-slate-700 mb-2 mt-4">Annual Income:</h3>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
              <span className="text-slate-600">DB Pension:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(openingValues.dbPension)}</span>
            </div>
            {openingValues.annuityIncome > 0 && (
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
                <span className="text-slate-600">Annuity Income:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(openingValues.annuityIncome)}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
              <span className="text-slate-600">State Pension:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(openingValues.statePension)}
                {openingValues.retirementAge < openingValues.statePensionAge &&
                  <span className="text-xs text-amber-600"> (from age {openingValues.statePensionAge})</span>
                }
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
              <span className="text-slate-600">Other Income:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(openingValues.otherIncome)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1 pl-4">
              <span className="text-slate-600">DC Drawdown ({dcDrawdownPercent}%):</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(openingValues.dcPotAfterPCLS * (parseFloat(dcDrawdownPercent) || 4.0) / 100)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-t border-slate-200 mt-2 pt-2 gap-1">
              <span className="text-slate-600">Inflation Assumption:</span>
              <span className="font-semibold text-slate-800">{openingValues.inflation}%</span>
            </div>
          </div>
        </details>
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
            <p className="text-sm text-green-700 mb-2">
              📋 <strong>Events from your lifestyle profile ("{lifestyleProfile.profileName}") are shown below.</strong>
            </p>
            <p className="text-xs text-green-600">
              You can edit timing, amounts, or delete these events. Manual events you add will be preserved.
              {' '}
              <button
                onClick={() => navigate('/lifestyle')}
                className="text-sky-600 hover:text-sky-700 underline font-medium"
              >
                Update lifestyle profile
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

          {/* Print Summary Button at End */}
          <div style={{ marginTop: "24px", marginBottom: "24px", textAlign: "center" }} className="no-print">
            <button
              onClick={window.print}
              style={{
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: "600",
                backgroundColor: "#0ea5e9",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              🖨️ Print Summary
            </button>
          </div>
        </>
      )}
    </div>
  );
}
