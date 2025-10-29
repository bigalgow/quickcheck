// src/components/ui/FormInput.jsx
import React from 'react';

export default function FormInput({ label, name, type, value, onChange, min, max, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-base font-medium text-slate-700 mb-2">
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
        className="w-full max-w-sm rounded-md border-2 border-slate-300 px-3 py-2 text-base h-11 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
      />
    </div>
  );
}
