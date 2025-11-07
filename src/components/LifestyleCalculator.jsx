// src/components/LifestyleCalculator.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  PLSA_VALUES,
  getPLSAValue,
  generateProfileName,
  calculateTotalAnnual,
  calculateTotalOneOff,
  getAgeAppropriateMessage,
  estimateBaselineFromIncome,
  validateProfile
} from '../utils/lifestyleProfile';

export default function LifestyleCalculator({ existingProfile = null, onComplete }) {
  const navigate = useNavigate();
  const { isAuthenticated, userInfo, getAccessToken } = useAuth();

  // Calculate user age from DOB if available (simplified - use current year)
  const userAge = 50; // TODO: Calculate from userInfo.birthdate if available

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Household
  const [householdType, setHouseholdType] = useState(existingProfile?.householdType || '');

  // Step 2: Baseline
  const [baselineTier, setBaselineTier] = useState(existingProfile?.baselineTier || '');
  const [baselineAmount, setBaselineAmount] = useState(existingProfile?.baselineAmount || 0);
  const [baselineSource, setBaselineSource] = useState(existingProfile?.baselineSource || '');
  const [showIncomeHelper, setShowIncomeHelper] = useState(false);
  const [selectedIncomeRange, setSelectedIncomeRange] = useState('');

  // Step 3: Exceptional items
  const [exceptionalItems, setExceptionalItems] = useState(existingProfile?.exceptionalItems || []);
  const [expandedCategories, setExpandedCategories] = useState({});

  // Profile calculations
  const profileName = useMemo(() =>
    generateProfileName(baselineTier, exceptionalItems),
    [baselineTier, exceptionalItems]
  );

  const totalAnnual = useMemo(() =>
    calculateTotalAnnual(baselineAmount, exceptionalItems),
    [baselineAmount, exceptionalItems]
  );

  const totalOneOff = useMemo(() =>
    calculateTotalOneOff(exceptionalItems),
    [exceptionalItems]
  );

  // Navigation
  const goToStep = (step) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goNext = () => {
    // Validation before moving forward
    if (currentStep === 1 && !householdType) {
      setError('Please select a household type');
      return;
    }
    if (currentStep === 2 && (!baselineTier || !baselineAmount)) {
      setError('Please complete the baseline expenditure');
      return;
    }
    setError(null);
    goToStep(currentStep + 1);
  };

  const goBack = () => {
    setError(null);
    goToStep(currentStep - 1);
  };

  // Save profile
  const saveProfile = async () => {
    const profile = {
      householdType,
      baselineTier,
      baselineAmount,
      baselineSource,
      profileName,
      inflationAssumption: 'today',
      userAge,
      yearsToRetirement: Math.max(0, 65 - userAge), // Simplified
      exceptionalItems,
      totalAnnualIncome: totalAnnual,
      totalOneOffCosts: totalOneOff,
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      version: '1.0'
    };

    const validation = validateProfile(profile);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const audience = import.meta.env.VITE_API_AUDIENCE;
      const token = await getAccessToken(audience);

      const res = await fetch('/api/me/lifestyle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }

      // Success - navigate to calculator or call completion handler
      if (onComplete) {
        onComplete(profile);
      } else {
        navigate('/calculator');
      }
    } catch (e) {
      console.error('Save lifestyle profile error:', e);
      setError(e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-full md:max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
          Discover Your Retirement Lifestyle
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Take 5 minutes to explore your ideal retirement and we'll help you plan for it
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                step <= currentStep ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-sm text-slate-600">
          Step {currentStep} of 4
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Steps */}
      {currentStep === 1 && <Step1Household
        householdType={householdType}
        setHouseholdType={setHouseholdType}
        onNext={goNext}
      />}

      {currentStep === 2 && <Step2Baseline
        householdType={householdType}
        baselineTier={baselineTier}
        setBaselineTier={setBaselineTier}
        baselineAmount={baselineAmount}
        setBaselineAmount={setBaselineAmount}
        baselineSource={baselineSource}
        setBaselineSource={setBaselineSource}
        showIncomeHelper={showIncomeHelper}
        setShowIncomeHelper={setShowIncomeHelper}
        selectedIncomeRange={selectedIncomeRange}
        setSelectedIncomeRange={setSelectedIncomeRange}
        onNext={goNext}
        onBack={goBack}
      />}

      {currentStep === 3 && <Step3ExceptionalItems
        exceptionalItems={exceptionalItems}
        setExceptionalItems={setExceptionalItems}
        expandedCategories={expandedCategories}
        setExpandedCategories={setExpandedCategories}
        userAge={userAge}
        onNext={goNext}
        onBack={goBack}
      />}

      {currentStep === 4 && <Step4Results
        profileName={profileName}
        householdType={householdType}
        baselineTier={baselineTier}
        baselineAmount={baselineAmount}
        exceptionalItems={exceptionalItems}
        totalAnnual={totalAnnual}
        totalOneOff={totalOneOff}
        saving={saving}
        onSave={saveProfile}
        onBack={goBack}
        onEdit={() => goToStep(1)}
      />}
    </div>
  );
}

// ===== STEP 1: HOUSEHOLD COMPOSITION =====
function Step1Household({ householdType, setHouseholdType, onNext }) {
  const options = [
    { value: 'solo', label: 'Just me', description: 'Planning for one person' },
    { value: 'couple', label: 'Me and my partner', description: 'Planning for two people' },
    { value: 'dependents', label: 'Me plus dependents', description: 'Including children or other dependents' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">
        Who will this retirement plan cover?
      </h2>

      <div className="space-y-3 mb-6">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => setHouseholdType(option.value)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              householdType === option.value
                ? 'border-sky-600 bg-sky-50'
                : 'border-slate-200 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                householdType === option.value
                  ? 'border-sky-600 bg-sky-600'
                  : 'border-slate-300'
              }`}>
                {householdType === option.value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{option.label}</div>
                <div className="text-sm text-slate-600">{option.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!householdType}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            householdType
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ===== STEP 2: BASELINE EXPENDITURE =====
function Step2Baseline({
  householdType,
  baselineTier,
  setBaselineTier,
  baselineAmount,
  setBaselineAmount,
  baselineSource,
  setBaselineSource,
  showIncomeHelper,
  setShowIncomeHelper,
  selectedIncomeRange,
  setSelectedIncomeRange,
  onNext,
  onBack
}) {
  const [pathChoice, setPathChoice] = useState('plsa');

  const handlePLSASelect = (tier) => {
    setBaselineTier(tier);
    const amount = getPLSAValue(tier, householdType);
    setBaselineAmount(amount);
    setBaselineSource('plsa');
  };

  const handleIncomeRangeSelect = (range) => {
    setSelectedIncomeRange(range);
    const estimate = estimateBaselineFromIncome(range);
    setBaselineAmount(estimate.midpoint);
    setBaselineTier('custom');
    setBaselineSource('income-range');
  };

  const plsaOptions = [
    {
      tier: 'minimum',
      title: 'Essential Comfort',
      description: 'All bills covered, basic comfort',
      features: ['UK holiday once a year', 'Occasional meals out', 'Basic transport', 'Essential activities']
    },
    {
      tier: 'moderate',
      title: 'Moderate Comfort',
      description: 'Everything above, PLUS:',
      features: ['Short overseas holiday annually', 'Weekly dining out', 'Regular hobbies', 'Reliable car']
    },
    {
      tier: 'comfortable',
      title: 'Comfortable Living',
      description: 'Everything above, PLUS:',
      features: ['TWO overseas holidays/year', 'Frequent entertainment', 'Newer car every few years', 'More flexibility']
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">
        What's your baseline annual expenditure?
      </h2>
      <p className="text-slate-600 text-sm mb-6">
        This is your day-to-day living cost in today's money
      </p>

      {/* Path choice */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setPathChoice('plsa')}
          className={`flex-1 p-3 rounded-lg border-2 ${
            pathChoice === 'plsa'
              ? 'border-sky-600 bg-sky-50'
              : 'border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="font-semibold text-slate-800">PLSA Guidelines</div>
          <div className="text-xs text-slate-600">Recommended for most</div>
        </button>
        <button
          onClick={() => setPathChoice('custom')}
          className={`flex-1 p-3 rounded-lg border-2 ${
            pathChoice === 'custom'
              ? 'border-sky-600 bg-sky-50'
              : 'border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="font-semibold text-slate-800">Custom Amount</div>
          <div className="text-xs text-slate-600">I'll enter my own</div>
        </button>
      </div>

      {/* PLSA Path */}
      {pathChoice === 'plsa' && (
        <div className="space-y-3 mb-6">
          {plsaOptions.map(option => {
            const amount = getPLSAValue(option.tier, householdType);
            return (
              <button
                key={option.tier}
                onClick={() => handlePLSASelect(option.tier)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  baselineTier === option.tier
                    ? 'border-sky-600 bg-sky-50'
                    : 'border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-slate-800">{option.title}</div>
                    <div className="text-sm text-slate-600">{option.description}</div>
                  </div>
                  <div className="text-lg font-bold text-sky-600">
                    £{amount.toLocaleString()}/year
                  </div>
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  {option.features.map((feature, idx) => (
                    <li key={idx}>• {feature}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Path */}
      {pathChoice === 'custom' && (
        <div className="mb-6">
          <button
            onClick={() => setShowIncomeHelper(!showIncomeHelper)}
            className="text-sm text-sky-600 hover:text-sky-700 mb-3"
          >
            {showIncomeHelper ? '− Hide' : '+ Show'} income estimate helper
          </button>

          {showIncomeHelper && (
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">
                Current household income range:
              </p>
              <div className="space-y-2">
                {['25k-40k', '40k-60k', '60k-80k', '80k-100k', '100k-150k', '150k+'].map(range => (
                  <button
                    key={range}
                    onClick={() => handleIncomeRangeSelect(range)}
                    className={`w-full text-left px-3 py-2 rounded border ${
                      selectedIncomeRange === range
                        ? 'border-sky-600 bg-sky-50'
                        : 'border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <span className="text-sm">£{range.replace('k', ',000')}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Most people need 70-80% of pre-retirement income
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Annual baseline expenditure (today's money)
            </label>
            <div className="flex items-center">
              <span className="text-lg font-semibold text-slate-700 mr-2">£</span>
              <input
                type="number"
                value={baselineAmount || ''}
                onChange={(e) => {
                  setBaselineAmount(parseFloat(e.target.value) || 0);
                  setBaselineTier('custom');
                  if (!baselineSource) setBaselineSource('custom');
                }}
                className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-sky-600 focus:outline-none"
                placeholder="e.g., 45000"
              />
              <span className="text-slate-600 ml-2">/year</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border-2 border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!baselineAmount}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            baselineAmount
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ===== STEP 3: EXCEPTIONAL ITEMS =====
function Step3ExceptionalItems({
  exceptionalItems,
  setExceptionalItems,
  expandedCategories,
  setExpandedCategories,
  userAge,
  onNext,
  onBack
}) {
  const ageMessage = getAgeAppropriateMessage(userAge, 'preamble');

  const addItem = (item) => {
    setExceptionalItems([...exceptionalItems, { ...item, id: Date.now() }]);
  };

  const removeItem = (id) => {
    setExceptionalItems(exceptionalItems.filter(item => item.id !== id));
  };

  const toggleCategory = (category) => {
    setExpandedCategories({
      ...expandedCategories,
      [category]: !expandedCategories[category]
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-2">
        Exceptional Items (Optional)
      </h2>
      <p className="text-slate-600 text-sm mb-1">{ageMessage}</p>
      <p className="text-slate-500 text-xs mb-6">
        All amounts in today's money - we'll adjust for inflation later
      </p>

      {/* Selected items summary */}
      {exceptionalItems.length > 0 && (
        <div className="mb-6 p-4 bg-sky-50 rounded-lg">
          <h3 className="font-semibold text-slate-800 mb-2">
            Selected items ({exceptionalItems.length})
          </h3>
          <ul className="space-y-2">
            {exceptionalItems.map(item => (
              <li key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-slate-700">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sky-600 font-semibold">
                    £{item.cost.toLocaleString()}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4 mb-6">
        {/* Simplified placeholder - would expand with full category UI */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600 text-center">
            Category selection UI would go here (Travel, Purchases, Family Support, Lifestyle Upgrades)
          </p>
          <p className="text-xs text-slate-500 text-center mt-2">
            For this MVP, users can skip or add items via the projection module
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border-2 border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-sky-600 text-white rounded-md font-medium hover:bg-sky-700"
        >
          Continue to Summary
        </button>
      </div>
    </div>
  );
}

// ===== STEP 4: RESULTS =====
function Step4Results({
  profileName,
  householdType,
  baselineTier,
  baselineAmount,
  exceptionalItems,
  totalAnnual,
  totalOneOff,
  saving,
  onSave,
  onBack,
  onEdit
}) {
  const tierLabels = {
    minimum: 'Essential Comfort (PLSA)',
    moderate: 'Moderate Comfort (PLSA)',
    comfortable: 'Comfortable Living (PLSA)',
    custom: 'Custom Amount'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-2 pb-2 border-b-2 border-slate-200">
        Your Retirement Lifestyle Profile
      </h2>

      <div className="my-6">
        <h3 className="text-xl font-semibold text-sky-600 mb-4">
          "{profileName}"
        </h3>

        {/* Baseline */}
        <div className="mb-6">
          <h4 className="font-bold text-slate-800 mb-2">BASELINE LIVING</h4>
          <p className="text-slate-700">
            Day-to-day comfort: <span className="font-semibold">{tierLabels[baselineTier]}</span>
          </p>
          <p className="text-slate-700">
            Annual cost: <span className="font-bold text-sky-600">
              £{baselineAmount.toLocaleString()}/year
            </span> (in today's money)
          </p>
        </div>

        {/* Exceptional items */}
        {exceptionalItems.length > 0 && (
          <div className="mb-6">
            <h4 className="font-bold text-slate-800 mb-2">EXCEPTIONAL ADDITIONS</h4>
            <p className="text-sm text-slate-600 mb-2">Beyond your baseline:</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {exceptionalItems.map(item => (
                <li key={item.id}>
                  • {item.name}: £{item.cost.toLocaleString()}
                  {item.timing === 'oneOff' ? ' (one-off)' : '/year'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Totals */}
        <div className="pt-4 border-t-2 border-slate-200">
          <h4 className="font-bold text-slate-800 mb-2">TOTAL ANNUAL NEED</h4>
          <p className="text-2xl font-bold text-sky-600 mb-2">
            £{totalAnnual.toLocaleString()}/year
          </p>
          {totalOneOff > 0 && (
            <p className="text-slate-700">
              Plus one-off costs: <span className="font-semibold">
                £{totalOneOff.toLocaleString()}
              </span>
            </p>
          )}
          <p className="text-xs text-slate-500 mt-3">
            💡 These amounts are in today's prices. The calculator will adjust for inflation.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-6 py-2 border-2 border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onEdit}
          disabled={saving}
          className="px-6 py-2 border-2 border-sky-600 text-sky-600 rounded-md font-medium hover:bg-sky-50 disabled:opacity-50"
        >
          Edit Profile
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-md font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Profile & Start Planning'}
        </button>
      </div>
    </div>
  );
}
