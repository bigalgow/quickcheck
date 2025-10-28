// src/components/ui/FormInput.jsx
import React from 'react';

export default function FormInput({ label, name, type, value, onChange, min, max, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  );
}
