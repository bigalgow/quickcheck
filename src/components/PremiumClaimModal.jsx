// src/components/PremiumClaimModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export default function PremiumClaimModal({ isOpen, onClose, onSuccess }) {
  const { getAccessToken } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleClaim = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const audience = import.meta.env.VITE_API_AUDIENCE;
      if (!audience) {
        throw new Error('API not configured');
      }

      const token = await getAccessToken(audience);
      const res = await fetch('/api/me/claim-premium', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim premium');
      }

      setStatus('success');

      // Notify parent after a short delay to show success state
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Claim error:', e);
      setStatus('error');
      setErrorMsg(e.message || 'Something went wrong');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={status === 'loading' ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {status === 'success' ? (
          // Success state
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Premium Activated!
            </h2>
            <p className="text-slate-600">
              You now have access to cloud sync.
            </p>
          </div>
        ) : (
          // Claim form
          <>
            <button
              onClick={onClose}
              disabled={status === 'loading'}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⭐</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Get Premium Access
              </h2>
              <p className="text-slate-600">
                Unlock cloud sync to save your retirement plan securely and access it from any device.
              </p>
            </div>

            {/* Beta offer banner */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <div className="font-semibold text-amber-800">Early Adopter Offer</div>
                  <div className="text-sm text-amber-700">
                    As an early user, you get premium access <strong>free</strong>.
                    No payment required.
                  </div>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="text-green-500">✓</span>
                <span>Save your plan to the cloud</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="text-green-500">✓</span>
                <span>Access from any device</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="text-green-500">✓</span>
                <span>Automatic sync across sessions</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="text-green-500">✓</span>
                <span>Encrypted & secure storage</span>
              </div>
            </div>

            {/* Error message */}
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium disabled:opacity-50"
              >
                Maybe Later
              </button>
              <button
                onClick={handleClaim}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-3 text-white bg-amber-500 rounded-lg hover:bg-amber-600 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Activating...
                  </>
                ) : (
                  <>
                    🎁 Claim Free Access
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
