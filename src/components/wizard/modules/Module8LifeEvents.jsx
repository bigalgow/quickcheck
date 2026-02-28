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

export default function Module8LifeEvents({ data, onDataChange, onNext }) {
  const [showHelp, setShowHelp] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
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

  const events = data.lifeEvents || [];

  // Count imported lifestyle events (more reliable than URL param count)
  const importedCount = useMemo(() => {
    const count = events.filter(ev => ev.source === 'lifestyleProfile').length;
    console.log('Module8 events:', events.map(e => ({ name: e.name, source: e.source })));
    console.log('Imported count:', count);
    return count;
  }, [events]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setNewEvent((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

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

    if (isNaN(age) || age < 0) {
      alert('Please enter a valid age.');
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
      {/* Import success banner */}
      {importedCount > 0 && !bannerDismissed && (
        <div className="mb-6 bg-teal-50 border border-teal-300 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 text-teal-800">
              <span className="text-xl mt-0.5">✓</span>
              <div>
                <span className="font-semibold block">
                  {importedCount} lifestyle goal{importedCount !== 1 ? 's' : ''} imported
                </span>
                <span className="text-sm text-teal-700 mt-1 block">
                  Your goals from Lifestyle Designer are shown below. You can edit amounts, timing,
                  or add more events to fine-tune your retirement plan.
                </span>
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-teal-600 hover:text-teal-800 text-xl font-bold px-2 flex-shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

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

      <div className="space-y-8">
        {/* Add/Edit Event Form */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
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
              min={currentAge}
              placeholder={Math.ceil(currentAge)}
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
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-slate-800">{event.name}</span>
                      {event.source === 'lifestyleProfile' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 rounded-full">
                          Lifestyle Plan
                        </span>
                      )}
                    </div>
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
          💡 <strong>Note:</strong> Life events are applied to your 25-year projection. Income
          events (like inheritance or property sales) increase available funds, while expense events
          (purchases, gifts) draw down your savings. Recurring events repeat for the specified
          number of years starting from the age you enter.
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
