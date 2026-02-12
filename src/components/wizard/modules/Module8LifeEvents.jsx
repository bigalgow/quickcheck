// src/components/wizard/modules/Module8LifeEvents.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import HelpText from '../../ui/HelpText';
import FormInput from '../../ui/FormInput';
import { formatCurrency } from '../../../utils/money';
import { yearsBetween } from '../../../logic/atRetirement';

const EVENT_TYPES = {
  expense: 'Expense',
  income: 'Income',
};

function toDate(val) {
  if (val instanceof Date) return val;
  if (typeof val === 'string') return new Date(val + 'T00:00:00');
  return new Date(NaN);
}

// Suggested life events by category
const SUGGESTED_EVENTS = {
  travel: [
    { name: 'Bucket list trip (world cruise, safari)', amount: 15000, type: 'expense', isRecurring: false },
    { name: 'Extended travel (6+ weeks abroad)', amount: 8000, type: 'expense', isRecurring: false },
    { name: 'Regular long-haul holidays', amount: 5000, type: 'expense', isRecurring: true, recurringYears: 10 },
    { name: 'Annual European breaks', amount: 2500, type: 'expense', isRecurring: true, recurringYears: 10 },
  ],
  purchases: [
    { name: 'New car', amount: 25000, type: 'expense', isRecurring: false },
    { name: 'Home improvements', amount: 15000, type: 'expense', isRecurring: false },
    { name: 'Caravan/motorhome', amount: 30000, type: 'expense', isRecurring: false },
    { name: 'Major appliances upgrade', amount: 5000, type: 'expense', isRecurring: false },
  ],
  family: [
    { name: 'House deposit for child', amount: 50000, type: 'expense', isRecurring: false },
    { name: 'Grandchildren education fund', amount: 10000, type: 'expense', isRecurring: true, recurringYears: 10 },
    { name: 'Regular family support', amount: 3000, type: 'expense', isRecurring: true, recurringYears: 10 },
    { name: 'Wedding contribution', amount: 15000, type: 'expense', isRecurring: false },
  ],
  lifestyle: [
    { name: 'Second property (holiday home)', amount: 150000, type: 'expense', isRecurring: false },
    { name: 'Boat purchase', amount: 40000, type: 'expense', isRecurring: false },
    { name: 'Hobby/sports equipment', amount: 5000, type: 'expense', isRecurring: false },
    { name: 'Golf club membership', amount: 2000, type: 'expense', isRecurring: true, recurringYears: 10 },
  ],
};

const CATEGORIES = [
  { key: 'travel', title: 'Travel & Experiences', icon: '✈️' },
  { key: 'purchases', title: 'Major Purchases', icon: '🏠' },
  { key: 'family', title: 'Family Support', icon: '👨‍👩‍👧' },
  { key: 'lifestyle', title: 'Lifestyle Upgrades', icon: '⛵' },
];

export default function Module8LifeEvents({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    id: uuidv4(),
    age: '',
    amount: '',
    name: '',
    type: 'expense',
    isRecurring: false,
    recurringYears: '',
  });

  // Calculate current age from DOB
  const currentAge = useMemo(() => {
    const dob = toDate(data.inputs?.dateOfBirth);
    if (isNaN(dob.getTime())) return 18;
    const today = new Date();
    return Math.floor(yearsBetween(dob, today));
  }, [data.inputs?.dateOfBirth]);

  // Get retirement age for minimum event age
  const retirementAge = useMemo(() => {
    return parseInt(data.inputs?.retirementAge) || currentAge;
  }, [data.inputs?.retirementAge, currentAge]);

  const events = data.lifeEvents || [];

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setNewEvent((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleSuggestionClick = useCallback((suggestion) => {
    // Pre-fill form with suggestion
    setNewEvent({
      id: uuidv4(),
      age: data.inputs?.retirementAge || '',
      amount: suggestion.amount.toString(),
      name: suggestion.name,
      type: suggestion.type,
      isRecurring: suggestion.isRecurring,
      recurringYears: suggestion.recurringYears?.toString() || '',
    });
    setEditingId(null);
    setShowSuggestions(false); // Collapse after selection
    // Scroll to form
    window.scrollTo({ top: document.getElementById('event-form')?.offsetTop - 100, behavior: 'smooth' });
  }, [data.inputs?.retirementAge]);

  const handleEditClick = useCallback((event) => {
    setNewEvent(event);
    setEditingId(event.id);
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!newEvent.name || !newEvent.age || !newEvent.amount) {
      alert('Please fill in all required fields.');
      return;
    }

    const age = parseInt(newEvent.age, 10);
    const amount = parseFloat(newEvent.amount);

    if (isNaN(age) || age < retirementAge) {
      alert(`Life events must be at or after your retirement age (${retirementAge}).`);
      return;
    }

    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const eventToSave = {
      ...newEvent,
      age,
      amount,
      recurringYears: newEvent.recurringYears ? parseInt(newEvent.recurringYears, 10) : 0,
    };

    let updatedEvents;
    if (editingId) {
      // Editing existing event
      const originalEvent = events.find((ev) => ev.id === editingId);
      if (originalEvent?.source === 'lifestyleProfile') {
        eventToSave.source = 'manual'; // Mark as manual so it won't be overwritten
      }
      updatedEvents = events.map((ev) => (ev.id === editingId ? eventToSave : ev));
    } else {
      // Adding new event
      updatedEvents = [...events, eventToSave];
    }

    onDataChange({ lifeEvents: updatedEvents });
    setEditingId(null);
    setNewEvent({
      id: uuidv4(),
      age: '',
      amount: '',
      name: '',
      type: 'expense',
      isRecurring: false,
      recurringYears: '',
    });
  }, [newEvent, events, onDataChange, editingId]);

  const handleDeleteEvent = useCallback(
    (id) => {
      const updatedEvents = events.filter((event) => event.id !== id);
      onDataChange({ lifeEvents: updatedEvents });
    },
    [events, onDataChange]
  );

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.age - b.age);
  }, [events]);

  return (
    <div className="p-6">
      {/* Help text */}
      <div className="mb-6">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          {showHelp ? '✕ Hide Help' : '? Show Help'}
        </button>
        <HelpText isVisible={showHelp}>
          Add planned lifestyle events that might affect your financial plan during retirement,
          like a new car purchase, home improvements, travel expenses, or an inheritance. Events
          can be one-off (single year) or recurring (multiple years). Income events (e.g.,
          inheritance, property sale) increase available funds, while expense events (e.g.,
          purchases, gifts) reduce them.
        </HelpText>
      </div>

      {/* Suggested Events Panel */}
      <div className="mb-6">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-lg hover:from-sky-100 hover:to-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-left">
              <div className="font-semibold text-slate-800">Browse Common Life Events</div>
              <div className="text-sm text-slate-600">Click to see suggested events you can add</div>
            </div>
          </div>
          <span className="text-2xl text-sky-600">{showSuggestions ? '▲' : '▼'}</span>
        </button>

        {showSuggestions && (
          <div className="mt-4 border-2 border-sky-200 rounded-lg overflow-hidden">
            {CATEGORIES.map((category) => (
              <div key={category.key} className="border-b border-slate-200 last:border-b-0">
                <div className="bg-slate-50 px-6 py-3 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  <span>{category.title}</span>
                </div>
                <div className="bg-white">
                  {SUGGESTED_EVENTS[category.key].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-6 py-3 text-left hover:bg-sky-50 border-b border-slate-100 last:border-b-0 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 group-hover:text-sky-700">
                          {suggestion.name}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {suggestion.isRecurring
                            ? `£${suggestion.amount.toLocaleString()}/year for ${suggestion.recurringYears} years`
                            : `£${suggestion.amount.toLocaleString()} one-off`}
                        </div>
                      </div>
                      <span className="text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Add →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-slate-50 px-6 py-3 text-sm text-slate-600">
              💡 Click any suggestion to pre-fill the form below with editable values
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Add/Edit Event Form */}
        <div id="event-form" className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {editingId ? 'Edit Event' : 'Add Life Event'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <FormInput
              label="Age"
              name="age"
              type="number"
              value={newEvent.age}
              onChange={handleInputChange}
              min={retirementAge}
              placeholder={retirementAge}
            />
            <FormInput
              label="Event Name"
              name="name"
              type="text"
              value={newEvent.name}
              onChange={handleInputChange}
              placeholder="e.g., New Car"
            />
            <FormInput
              label="Amount (£)"
              name="amount"
              type="number"
              value={newEvent.amount}
              onChange={handleInputChange}
              placeholder="e.g., 20000"
            />
            <div>
              <label htmlFor="eventType" className="text-base font-medium text-slate-700 block mb-2">
                Type
              </label>
              <select
                id="eventType"
                name="type"
                value={newEvent.type}
                onChange={handleInputChange}
                className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="expense">{EVENT_TYPES.expense}</option>
                <option value="income">{EVENT_TYPES.income}</option>
              </select>
            </div>
          </div>

          {/* Recurring event section */}
          <div className="flex flex-wrap items-start gap-6 pt-4 mt-4 border-t border-slate-200">
            <label className="inline-flex items-center gap-3 text-base font-medium text-slate-700">
              <input
                type="checkbox"
                name="isRecurring"
                checked={newEvent.isRecurring}
                onChange={handleInputChange}
                className="w-5 h-5"
              />
              <span>Recurring Event?</span>
            </label>
            {newEvent.isRecurring && (
              <div className="min-w-[200px]">
                <FormInput
                  label="Years to recur"
                  name="recurringYears"
                  type="number"
                  value={newEvent.recurringYears}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="e.g., 5"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSaveEvent}
            className="w-full py-2 mt-6 rounded-md border border-sky-600 bg-sky-500 text-white hover:bg-sky-600 transition-colors"
          >
            {editingId ? 'Save Changes' : '+ Add Event'}
          </button>
        </div>

        {/* List of events */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Events</h3>
          {sortedEvents.length === 0 ? (
            <p className="text-center text-base text-slate-500 py-8">
              No events added yet. Add life events above to include them in your projection.
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedEvents.map((event) => (
                <li
                  key={event.id}
                  className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between gap-4 transition-all hover:shadow-md"
                >
                  <div>
                    <span className="font-semibold text-base text-slate-800">{event.name}</span>
                    <span className="block text-base text-slate-500">
                      at age {event.age}
                      {event.isRecurring && ` for ${event.recurringYears} years`}:
                      <span
                        className={`ml-1 font-mono font-medium ${
                          event.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {event.type === 'income' ? '+' : '-'}
                        {formatCurrency(event.amount)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(event)}
                      className="px-3 py-2 text-base rounded-md border border-blue-500 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="px-3 py-2 text-base rounded-md border border-red-500 bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Note:</strong> Life events are applied to your 25-year post-retirement projection,
          starting from your retirement age ({retirementAge}). Income events (like inheritance or property sales)
          increase available funds, while expense events (purchases, gifts) draw down your savings.
          Recurring events repeat for the specified number of years starting from the age you enter.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-md font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          Continue to Drawdown Sequencing →
        </button>
      </div>
    </div>
  );
}
