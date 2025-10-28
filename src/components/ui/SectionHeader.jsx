// src/components/ui/SectionHeader.jsx
import React from 'react';

export default function SectionHeader({ title, helpId, toggleHelp, isVisible }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      {toggleHelp && (
        <button
          onClick={() => toggleHelp(helpId)}
          className="text-sm text-sky-600 hover:text-sky-700"
        >
          {isVisible ? '✕ Hide Help' : '? Show Help'}
        </button>
      )}
    </div>
  );
}
