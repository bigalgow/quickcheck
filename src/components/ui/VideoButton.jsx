// src/components/ui/VideoButton.jsx
import React from 'react';

export default function VideoButton({ title, description, videoUrl, className = '' }) {
  return (
    <div className={`bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 text-sm"
        >
          Watch Video Guide
        </a>
      )}
    </div>
  );
}
