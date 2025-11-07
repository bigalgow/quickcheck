// src/components/LifestyleCalculator.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import FormInput from './ui/FormInput';
import { formatCurrency } from '../utils/money';

// PLSA 2024 Values
const PLSA_VALUES = {
  minimum: { solo: 14400, couple: 22400 },
  moderate: { solo: 31300, couple: 43100 },
  comfortable: { solo: 43100, couple: 59000 }
};

// Income range helper for custom baseline
const INCOME_RANGES = [
  { label: '£25,000 - £40,000', min: 25000, max: 40000 },
  { label: '£40,000 - £60,000', min: 40000, max: 60000 },
  { label: '£60,000 - £80,000', min: 60000, max: 80000 },
  { label: '£80,000 - £100,000', min: 80000, max: 100000 },
  { label: '£100,000 - £150,000', min: 100000, max: 150000 },
  { label: '£150,000+', min: 150000, max: 200000 }
];

// Exceptional item templates by category
const EXCEPTIONAL_TEMPLATES = {
  travel: [
    { type: 'bucketListTrip', name: 'Bucket List Trip', defaultCost: 12000, oneOff: true },
    { type: 'extendedTravel', name: 'Extended Travel (3+ months)', defaultCost: 20000, oneOff: true },
    { type: 'regularLongHaul', name: 'Regular Extra Long-Haul Travel', defaultCost: 5000, oneOff: false }
  ],
  purchase: [
    { type: 'newCar', name: 'New Car', defaultCost: 22500, oneOff: true },
    { type: 'homeImprovements', name: 'Home Improvements', defaultCost: 30000, oneOff: true },
    { type: 'caravan', name: 'Caravan/Motorhome', defaultCost: 40000, oneOff: true }
  ],
  family: [
    { type: 'houseDeposit', name: 'House Deposit Help', defaultCost: 35000, oneOff: true },
    { type: 'educationSupport', name: 'Education Support', defaultCost: 5000, oneOff: false },
    { type: 'regularSupport', name: 'Regular Financial Support', defaultCost: 3000, oneOff: false }
  ],
  upgrade: [
    { type: 'secondProperty', name: 'Second Property/Holiday Home', defaultCost: 150000, oneOff: true, hasAnnualCost: true },
    { type: 'boatOrCar', name: 'Boat or Classic Car', defaultCost: 30000, oneOff: true, hasAnnualCost: true },
    { type: 'expensiveHobby', name: 'Expensive Hobby', defaultCost: 5000, oneOff: false }
  ]
};

export default function LifestyleCalculator({ onComplete, onSkip, existingProfile = null }) {
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(existingProfile || {
    householdType: 'solo',
    baselineTier: '',
    baselineAmount: 0,
    baselineSource: '',
    exceptionalItems: [],
    userAge: null,
    yearsToRetirement: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0'
  });

  // Step 2: PLSA selection or custom baseline
  const [baselineMethod, setBaselineMethod] = useState('plsa'); // 'plsa' or 'custom'
  const [selectedTier, setSelectedTier] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showIncomeHelper, setShowIncomeHelper] = useState(false);
  const [selectedIncomeRange, setSelectedIncomeRange] = useState('');

  // Step 3: Exceptional items
  const [selectedItems, setSelectedItems] = useState([]);

  // Calculate user age from DOB (if available)
  const userAge = useMemo(() => {
    const dob = userInfo?.birthdate || userInfo?.dateOfBirth;
    if (!dob) return null;

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [userInfo]);

  // Age-appropriate messaging
  const getAgeMessage = useCallback(() => {
    if (!userAge) return "What would you like to do in retirement?";
    if (userAge < 45) return "Envision your future - what would you LOVE to do?";
    if (userAge < 55) return "What are you planning beyond day-to-day living?";
    return "What specific plans and commitments do you have?";
  }, [userAge]);

  // Generate profile name
  const generateProfileName = useCallback(() => {
    const tierNames = {
      minimum: 'Essential',
      moderate: 'Moderate',
      comfortable: 'Comfortable',
      custom: 'Premium'
    };

    const dominantCategory = selectedItems.length > 0
      ? selectedItems[0].category
      : '';

    const categoryNames = {
      travel: 'Explorer',
      purchase: 'Planner',
      family: 'Supporter',
      upgrade: 'Enthusiast'
    };

    const tierName = tierNames[profile.baselineTier] || 'Custom';
    const catName = categoryNames[dominantCategory] || 'Lifestyle';

    return `The ${tierName} ${catName}`;
  }, [profile.baselineTier, selectedItems]);

  // Calculate totals
  const totals = useMemo(() => {
    const oneOffs = selectedItems
      .filter(item => item.timing === 'oneOff')
      .reduce((sum, item) => sum + (item.cost || 0), 0);

    const annualRecurring = selectedItems
      .filter(item => item.timing === 'recurring')
      .reduce((sum, item) => sum + (item.cost || 0), 0);

    return {
      baselineAnnual: profile.baselineAmount || 0,
      totalAnnual: (profile.baselineAmount || 0) + annualRecurring,
      oneOffCosts: oneOffs,
      recurringAdditions: annualRecurring
    };
  }, [profile.baselineAmount, selectedItems]);

  // Handle Step 1: Household Type
  const handleHouseholdSelect = (type) => {
    setProfile(prev => ({ ...prev, householdType: type }));
  };

  // Handle Step 2: Baseline selection
  const handleTierSelect = (tier) => {
    setSelectedTier(tier);
    const amount = PLSA_VALUES[tier][profile.householdType];
    setProfile(prev => ({
      ...prev,
      baselineTier: tier,
      baselineAmount: amount,
      baselineSource: 'plsa'
    }));
  };

  const handleCustomAmountSet = () => {
    const amount = parseFloat(customAmount) || 0;
    setProfile(prev => ({
      ...prev,
      baselineTier: 'custom',
      baselineAmount: amount,
      baselineSource: showIncomeHelper && selectedIncomeRange ? 'income-range' : 'custom'
    }));
  };

  const handleIncomeRangeSelect = (range) => {
    setSelectedIncomeRange(range.label);
    const midpoint = (range.min + range.max) / 2;
    const suggested = Math.round(midpoint * 0.75); // 75% of income
    setCustomAmount(suggested.toString());
  };

  // Handle Step 3: Exceptional items
  const toggleItem = (category, template) => {
    const existing = selectedItems.find(
      item => item.category === category && item.type === template.type
    );

    if (existing) {
      setSelectedItems(selectedItems.filter(item => !(item.category === category && item.type === template.type)));
    } else {
      setSelectedItems([...selectedItems, {
        category,
        name: template.name,
        type: template.type,
        cost: template.defaultCost,
        timing: template.oneOff ? 'oneOff' : 'recurring',
        year: 1,
        duration: template.oneOff ? null : 5,
        annualCost: template.hasAnnualCost ? 3000 : null,
        isAspirational: userAge ? userAge < 45 : false
      }]);
    }
  };

  const updateItemField = (category, type, field, value) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.category === category && item.type === type) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Save profile
  const handleSaveProfile = async () => {
    const finalProfile = {
      ...profile,
      exceptionalItems: selectedItems,
      profileName: generateProfileName(),
      totalAnnualIncome: totals.totalAnnual,
      totalOneOffCosts: totals.oneOffCosts,
      userAge,
      yearsToRetirement: userAge ? Math.max(0, 65 - userAge) : null,
      updatedAt: new Date().toISOString()
    };

    if (onComplete) {
      onComplete(finalProfile);
    }
  };

  // Navigation helpers
  const nextStep = () => {
    if (step < 4) {
      // Validate current step before moving
      if (step === 2 && !profile.baselineAmount) {
        alert('Please select a baseline expenditure before continuing.');
        return;
      }
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Step {step} of 4</span>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Skip for now →
            </button>
          )}
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-sky-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Household Composition */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Who will this retirement plan cover?
          </h2>
          <p className="text-slate-600 mb-6">
            This helps us recommend appropriate baseline costs for your situation.
          </p>

          <div className="space-y-4">
            {[
              { value: 'solo', label: 'Just me (solo)', description: 'Planning for one person' },
              { value: 'couple', label: 'Me and my partner (couple)', description: 'Planning for two people' },
              { value: 'dependents', label: 'Me plus dependents', description: 'Planning for more than two people' }
            ].map(option => (
              <label
                key={option.value}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  profile.householdType === option.value
                    ? 'border-sky-600 bg-sky-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="householdType"
                  value={option.value}
                  checked={profile.householdType === option.value}
                  onChange={(e) => handleHouseholdSelect(e.target.value)}
                  className="mt-1 mr-3 w-5 h-5"
                />
                <div>
                  <div className="font-semibold text-slate-800">{option.label}</div>
                  <div className="text-sm text-slate-600">{option.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Baseline Expenditure */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Baseline Annual Expenditure
          </h2>
          <p className="text-slate-600 mb-6">
            Choose how you'd like to estimate your day-to-day retirement costs.
          </p>

          {/* Method Selection */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setBaselineMethod('plsa')}
              className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                baselineMethod === 'plsa'
                  ? 'border-sky-600 bg-sky-50 text-sky-800'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              📊 Use PLSA Guidelines (Recommended)
            </button>
            <button
              onClick={() => setBaselineMethod('custom')}
              className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                baselineMethod === 'custom'
                  ? 'border-sky-600 bg-sky-50 text-sky-800'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              ✏️ Enter Custom Amount
            </button>
          </div>

          {/* PLSA Path */}
          {baselineMethod === 'plsa' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                Select the lifestyle level that resonates with you (based on Pension and Lifetime Savings Association guidelines):
              </p>

              {[
                {
                  tier: 'minimum',
                  title: 'Essential Comfort',
                  amount: PLSA_VALUES.minimum[profile.householdType],
                  description: 'All bills covered, basic comfort, UK holiday once a year, occasional meals out, basic transport'
                },
                {
                  tier: 'moderate',
                  title: 'Moderate Comfort',
                  amount: PLSA_VALUES.moderate[profile.householdType],
                  description: 'Everything above, PLUS: Short overseas holiday annually, weekly dining out, regular hobbies, reliable car'
                },
                {
                  tier: 'comfortable',
                  title: 'Comfortable Living',
                  amount: PLSA_VALUES.comfortable[profile.householdType],
                  description: 'Everything above, PLUS: TWO overseas holidays per year, frequent entertainment, newer car every few years, more flexibility'
                }
              ].map(option => (
                <label
                  key={option.tier}
                  className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTier === option.tier
                      ? 'border-sky-600 bg-sky-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="plsaTier"
                      value={option.tier}
                      checked={selectedTier === option.tier}
                      onChange={() => handleTierSelect(option.tier)}
                      className="mt-1 mr-3 w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg text-slate-800">{option.title}</span>
                        <span className="font-bold text-xl text-sky-700">{formatCurrency(option.amount)}/year</span>
                      </div>
                      <p className="text-sm text-slate-600">{option.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Custom Path */}
          {baselineMethod === 'custom' && (
            <div className="space-y-4">
              <div className="mb-4">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={showIncomeHelper}
                    onChange={(e) => setShowIncomeHelper(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Show income-based helper
                  </span>
                </label>

                {showIncomeHelper && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      Current household income range:
                    </p>
                    <div className="space-y-2">
                      {INCOME_RANGES.map(range => (
                        <label
                          key={range.label}
                          className={`flex items-center p-3 border rounded cursor-pointer transition-all ${
                            selectedIncomeRange === range.label
                              ? 'border-sky-600 bg-sky-50'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="incomeRange"
                            checked={selectedIncomeRange === range.label}
                            onChange={() => handleIncomeRangeSelect(range)}
                            className="mr-2 w-4 h-4"
                          />
                          <span className="text-sm">{range.label}</span>
                        </label>
                      ))}
                    </div>
                    {selectedIncomeRange && (
                      <p className="text-sm text-slate-600 mt-3">
                        💡 Most people need 70-80% of pre-retirement income. Suggested baseline shown below.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <FormInput
                label="Annual Baseline Expenditure (in today's money)"
                name="customAmount"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="e.g., 45000"
              />

              <button
                onClick={handleCustomAmountSet}
                className="w-full py-2 px-4 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-200 transition-colors"
              >
                Set Custom Baseline
              </button>

              {profile.baselineAmount > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-800 font-medium">
                    ✓ Baseline set: {formatCurrency(profile.baselineAmount)}/year
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={nextStep}
              disabled={!profile.baselineAmount}
              className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                profile.baselineAmount
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Exceptional Items */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Exceptional Items
          </h2>
          <p className="text-slate-700 font-medium mb-2">{getAgeMessage()}</p>
          <p className="text-sm text-slate-600 mb-6">
            💡 All amounts in today's money - we'll adjust for inflation in the calculator
          </p>

          {/* Travel Category */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3">🌍 Exceptional Travel</h3>
            <p className="text-sm text-slate-600 mb-4">Beyond your baseline holidays:</p>
            <div className="space-y-3">
              {EXCEPTIONAL_TEMPLATES.travel.map(template => {
                const selected = selectedItems.find(
                  item => item.category === 'travel' && item.type === template.type
                );
                return (
                  <div key={template.type} className="border border-slate-200 rounded-lg p-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleItem('travel', template)}
                        className="mt-1 mr-3 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{template.name}</div>
                        <div className="text-sm text-slate-600">
                          Suggested: {formatCurrency(template.defaultCost)}
                          {template.oneOff ? ' (one-off)' : ' per year'}
                        </div>
                      </div>
                    </label>

                    {selected && (
                      <div className="mt-3 pl-8 space-y-3">
                        <FormInput
                          label="Amount (£)"
                          name={`${template.type}-cost`}
                          type="number"
                          value={selected.cost}
                          onChange={(e) => updateItemField('travel', template.type, 'cost', parseFloat(e.target.value))}
                        />
                        <FormInput
                          label="Year of retirement"
                          name={`${template.type}-year`}
                          type="number"
                          value={selected.year || 1}
                          onChange={(e) => updateItemField('travel', template.type, 'year', parseInt(e.target.value))}
                          placeholder="1 = first year, 5 = fifth year, etc."
                        />
                        {!template.oneOff && (
                          <FormInput
                            label="Duration (years)"
                            name={`${template.type}-duration`}
                            type="number"
                            value={selected.duration || 5}
                            onChange={(e) => updateItemField('travel', template.type, 'duration', parseInt(e.target.value))}
                            placeholder="How many years?"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Purchase Category */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3">🏠 Major Purchases</h3>
            <div className="space-y-3">
              {EXCEPTIONAL_TEMPLATES.purchase.map(template => {
                const selected = selectedItems.find(
                  item => item.category === 'purchase' && item.type === template.type
                );
                return (
                  <div key={template.type} className="border border-slate-200 rounded-lg p-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleItem('purchase', template)}
                        className="mt-1 mr-3 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{template.name}</div>
                        <div className="text-sm text-slate-600">
                          Suggested: {formatCurrency(template.defaultCost)} (one-off)
                        </div>
                      </div>
                    </label>

                    {selected && (
                      <div className="mt-3 pl-8 space-y-3">
                        <FormInput
                          label="Amount (£)"
                          name={`${template.type}-cost`}
                          type="number"
                          value={selected.cost}
                          onChange={(e) => updateItemField('purchase', template.type, 'cost', parseFloat(e.target.value))}
                        />
                        <FormInput
                          label="Year of retirement"
                          name={`${template.type}-year`}
                          type="number"
                          value={selected.year || 1}
                          onChange={(e) => updateItemField('purchase', template.type, 'year', parseInt(e.target.value))}
                          placeholder="1 = first year, 5 = fifth year, etc."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Family Category */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3">👨‍👩‍👧‍👦 Family Support</h3>
            <div className="space-y-3">
              {EXCEPTIONAL_TEMPLATES.family.map(template => {
                const selected = selectedItems.find(
                  item => item.category === 'family' && item.type === template.type
                );
                return (
                  <div key={template.type} className="border border-slate-200 rounded-lg p-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleItem('family', template)}
                        className="mt-1 mr-3 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{template.name}</div>
                        <div className="text-sm text-slate-600">
                          Suggested: {formatCurrency(template.defaultCost)}
                          {template.oneOff ? ' (one-off)' : ' per year'}
                        </div>
                      </div>
                    </label>

                    {selected && (
                      <div className="mt-3 pl-8 space-y-3">
                        <FormInput
                          label="Amount (£)"
                          name={`${template.type}-cost`}
                          type="number"
                          value={selected.cost}
                          onChange={(e) => updateItemField('family', template.type, 'cost', parseFloat(e.target.value))}
                        />
                        <FormInput
                          label="Year of retirement"
                          name={`${template.type}-year`}
                          type="number"
                          value={selected.year || 1}
                          onChange={(e) => updateItemField('family', template.type, 'year', parseInt(e.target.value))}
                          placeholder="1 = first year, 5 = fifth year, etc."
                        />
                        {!template.oneOff && (
                          <FormInput
                            label="Duration (years)"
                            name={`${template.type}-duration`}
                            type="number"
                            value={selected.duration || 5}
                            onChange={(e) => updateItemField('family', template.type, 'duration', parseInt(e.target.value))}
                            placeholder="How many years?"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lifestyle Upgrades Category */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3">⭐ Lifestyle Upgrades</h3>
            <div className="space-y-3">
              {EXCEPTIONAL_TEMPLATES.upgrade.map(template => {
                const selected = selectedItems.find(
                  item => item.category === 'upgrade' && item.type === template.type
                );
                return (
                  <div key={template.type} className="border border-slate-200 rounded-lg p-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleItem('upgrade', template)}
                        className="mt-1 mr-3 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{template.name}</div>
                        <div className="text-sm text-slate-600">
                          Suggested: {formatCurrency(template.defaultCost)}
                          {template.oneOff ? ' (one-off)' : ' per year'}
                          {template.hasAnnualCost && ' + annual costs'}
                        </div>
                      </div>
                    </label>

                    {selected && (
                      <div className="mt-3 pl-8 space-y-3">
                        <FormInput
                          label={template.hasAnnualCost ? "Purchase Cost (£)" : "Amount (£)"}
                          name={`${template.type}-cost`}
                          type="number"
                          value={selected.cost}
                          onChange={(e) => updateItemField('upgrade', template.type, 'cost', parseFloat(e.target.value))}
                        />
                        {template.hasAnnualCost && (
                          <FormInput
                            label="Annual Running Costs (£)"
                            name={`${template.type}-annual`}
                            type="number"
                            value={selected.annualCost || 3000}
                            onChange={(e) => updateItemField('upgrade', template.type, 'annualCost', parseFloat(e.target.value))}
                          />
                        )}
                        <FormInput
                          label="Year of retirement"
                          name={`${template.type}-year`}
                          type="number"
                          value={selected.year || 1}
                          onChange={(e) => updateItemField('upgrade', template.type, 'year', parseInt(e.target.value))}
                          placeholder="1 = first year, 5 = fifth year, etc."
                        />
                        {!template.oneOff && (
                          <FormInput
                            label="Duration (years)"
                            name={`${template.type}-duration`}
                            type="number"
                            value={selected.duration || 5}
                            onChange={(e) => updateItemField('upgrade', template.type, 'duration', parseInt(e.target.value))}
                            placeholder="How many years?"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
            >
              Continue to Summary →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results Summary */}
      {step === 4 && (
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Your Retirement Lifestyle Profile
          </h2>

          <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-lg">
            <h3 className="text-xl font-bold text-sky-800 mb-2">
              {generateProfileName()}
            </h3>
          </div>

          {/* Baseline Summary */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2">BASELINE LIVING</h4>
            <p className="text-slate-700 mb-2">
              Day-to-day comfort: <span className="font-semibold">
                {profile.baselineTier === 'minimum' ? 'Essential' :
                 profile.baselineTier === 'moderate' ? 'Moderate' :
                 profile.baselineTier === 'comfortable' ? 'Comfortable' : 'Custom'}
              </span>
              {profile.baselineSource === 'plsa' && ' (PLSA)'}
            </p>
            <p className="text-2xl font-bold text-sky-700">
              {formatCurrency(profile.baselineAmount)}/year
            </p>
            <p className="text-sm text-slate-600 mt-2">
              (in today's money)
            </p>
          </div>

          {/* Exceptional Items Summary */}
          {selectedItems.length > 0 && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h4 className="font-bold text-slate-800 mb-3">EXCEPTIONAL ADDITIONS</h4>
              <p className="text-sm text-slate-600 mb-4">Beyond your baseline:</p>

              {selectedItems.filter(item => item.timing === 'oneOff').length > 0 && (
                <div className="mb-4">
                  <p className="font-medium text-slate-700 mb-2">One-off expenses:</p>
                  <ul className="space-y-1">
                    {selectedItems
                      .filter(item => item.timing === 'oneOff')
                      .map((item, idx) => (
                        <li key={idx} className="text-slate-700">
                          • {item.name}: {formatCurrency(item.cost)} (Year {item.year})
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {selectedItems.filter(item => item.timing === 'recurring').length > 0 && (
                <div className="mb-4">
                  <p className="font-medium text-slate-700 mb-2">Recurring additions:</p>
                  <ul className="space-y-1">
                    {selectedItems
                      .filter(item => item.timing === 'recurring')
                      .map((item, idx) => (
                        <li key={idx} className="text-slate-700">
                          • {item.name}: {formatCurrency(item.cost)}/year ({item.duration} years)
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Total Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-slate-800 mb-3">TOTAL ANNUAL NEED</h4>
            <p className="text-3xl font-bold text-slate-800">
              {formatCurrency(totals.totalAnnual)}/year
            </p>
            {totals.recurringAdditions > 0 && (
              <p className="text-sm text-slate-600 mt-1">
                (Baseline: {formatCurrency(totals.baselineAnnual)} + Recurring: {formatCurrency(totals.recurringAdditions)})
              </p>
            )}

            {totals.oneOffCosts > 0 && (
              <p className="text-slate-700 mt-3">
                Plus one-off costs: <span className="font-bold">{formatCurrency(totals.oneOffCosts)}</span>
              </p>
            )}

            <p className="text-sm text-slate-600 mt-3">
              💡 These amounts are in today's prices. The calculator will adjust for inflation.
            </p>
          </div>

          <div className="mt-6 flex justify-between gap-4">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              ← Edit
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
              >
                💾 Save Profile & Start Planning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
