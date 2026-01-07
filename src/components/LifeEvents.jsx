import React, { useState, useMemo, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import SectionHeader from "./ui/SectionHeader";
import HelpText from "./ui/HelpText";
import FormInput from "./ui/FormInput";
import VideoButton from "./ui/VideoButton";
import { formatCurrency } from "../utils/money";

const helpText = {
  lifeEventsHelp: "Add planned lifestyle events that might affect your financial plan, like a new car purchase, home improvements, or a gift of money.",
};

const EVENT_TYPES = {
  expense: "Expense",
  income: "Income",
};

export default function LifeEvents({ currentAge, retirementAge, events, setEvents, helpVisibility, setHelpVisibility }) {
  const [newEvent, setNewEvent] = useState({
    id: uuidv4(),
    age: "",
    amount: "",
    name: "",
    type: "expense",
    isRecurring: false,
    recurringYears: "",
  });

  const [editingId, setEditingId] = useState(null);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setNewEvent((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleEditClick = useCallback((event) => {
    setNewEvent(event);
    setEditingId(event.id);
  }, []);

  const toggleHelp = useCallback((helpId) => {
    setHelpVisibility(prev => ({
      ...prev,
      [helpId]: !prev[helpId]
    }));
  }, [setHelpVisibility]);

  const handleSaveEvent = useCallback(() => {
    if (!newEvent.name || !newEvent.age || !newEvent.amount) {
      // Use an alert() replacement as the original code did.
      // In a real application, a custom modal would be better.
      alert("Please fill in all required fields.");
      return;
    }
    
    // Validation
    const age = parseInt(newEvent.age, 10);
    const amount = parseFloat(newEvent.amount);
    
    if (isNaN(age) || age < 0) {
      alert("Please enter a valid age.");
      return;
    }
    
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid amount.");
      return;
    }

    // Create event with parsed numeric values
    const eventToSave = {
      ...newEvent,
      age,
      amount,
      recurringYears: newEvent.recurringYears ? parseInt(newEvent.recurringYears, 10) : 0
    };

    if (editingId) {
      // CRITICAL FIX: When editing a profile event, mark it as 'manual' so smart merge doesn't overwrite it
      const originalEvent = events.find(ev => ev.id === editingId);
      if (originalEvent?.source === 'lifestyleProfile') {
        console.log('🔧 Converting profile event to manual event (edited by user)');
        console.log('  Event:', originalEvent.name);
        console.log('  Old amount:', originalEvent.amount, '→ New amount:', amount);
        eventToSave.source = 'manual'; // Mark as manual so it won't be overwritten by profile reload
      }
      setEvents(events.map(ev => ev.id === editingId ? eventToSave : ev));
    } else {
      setEvents((prev) => [...prev, eventToSave]);
    }
    setEditingId(null);
    setNewEvent({
      id: uuidv4(),
      age: "",
      amount: "",
      name: "",
      type: "expense",
      isRecurring: false,
      recurringYears: "",
    });
  }, [newEvent, events, setEvents, editingId]);

  const handleDeleteEvent = useCallback((id) => {
    const eventToDelete = events.find(ev => ev.id === id);
    if (eventToDelete?.source === 'lifestyleProfile') {
      console.log('🗑️ Deleting profile event - will stay deleted (not re-imported)');
      console.log('  Event:', eventToDelete.name);
      // Note: Event will be removed from lifeEvents array
      // Smart merge will NOT re-add it because it only adds NEW profile events
      // But we should mark it somehow so it doesn't come back...
      // Actually, current smart merge uses NEW IDs each time, so deleted events won't match
    }
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }, [setEvents, events]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.age - b.age);
  }, [events]);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">

      {/* Lifestyle Events Video Guide - Hidden for now
      <VideoButton
        title="Model Lifestyle Events"
        description="Understand how to plan for significant purchases, inheritances, and other major financial events that could affect your retirement."
        videoUrl="https://app.heygen.com/embeds/dec85cc7eec44d70a24cf40a6221f01c"
        className="w-full mb-6"
      />
      */}

      <div className="bg-slate-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800">
          Lifestyle Events
        </h2>
        {toggleHelp && (
          <button
            onClick={() => toggleHelp('lifeEventsHelp')}
            className="text-xs sm:text-sm font-normal text-sky-600 hover:text-sky-700"
          >
            {helpVisibility.lifeEventsHelp ? '✕ Hide Help' : '? Show Help'}
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6">
          <HelpText isVisible={helpVisibility.lifeEventsHelp}>
            {helpText.lifeEventsHelp}
          </HelpText>
          <p className="text-slate-600 text-base mb-4 sm:mb-6">
            Add specific lifestyle events that may impact your financial plan during retirement.
          </p>

        {/* Form for adding/editing a new event */}
        <div key="life-events-form" className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 space-y-4 sm:space-y-6">
          {/* Mobile-friendly responsive layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              label={`Amount (£)`}
              name="amount"
              type="number"
              value={newEvent.amount}
              onChange={handleInputChange}
              placeholder="e.g., 20000"
            />
            <div>
              <label htmlFor="eventType" className="text-base font-medium text-slate-700 block mb-2">Type</label>
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

          {/* Recurring event section with better spacing */}
          <div className="flex flex-wrap items-start gap-6 pt-6 mt-4 pb-8 border-t border-slate-200">
            <label className="inline-flex items-center gap-3 text-base font-medium text-slate-700">
              <input
                type="checkbox"
                name="isRecurring"
                checked={newEvent.isRecurring}
                onChange={handleInputChange}
                className="form-checkbox focus:ring-0 focus:outline-none w-5 h-5"
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
            {editingId ? "Save Changes" : "+ Add Event"}
          </button>
        </div>

        {/* List of events */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Your Events</h3>
          {sortedEvents.length === 0 ? (
            <p className="text-center text-base text-slate-500">No events added yet.</p>
          ) : (
            <ul className="space-y-3">
              {sortedEvents.map((event) => (
                <li key={event.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between gap-4 transition-all hover:shadow-md">
                  <div>
                    <span className="font-semibold text-base text-slate-800">{event.name}</span>
                    <span className="block text-base text-slate-500">
                      at age {event.age}
                      {event.isRecurring && ` for ${event.recurringYears} years`}
                      :
                      <span className={`ml-1 font-mono font-medium ${event.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
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
    </div>
  );
}
