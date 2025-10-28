// src/components/ui/HelpText.jsx
import React from 'react';

export default function HelpText({ isVisible, children }) {
  if (!isVisible) return null;

  return (
    <div className="bg-sky-50 border-l-4 border-sky-500 p-4 mb-4">
      <p className="text-sm text-slate-700">{children}</p>
    </div>
  );
}
