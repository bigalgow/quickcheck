// src/components/PWAInstallBanner.jsx
import React, { useState, useEffect } from 'react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
    
    if (isInstalled) {
      return; // Don't show banner if already installed
    }

    // Check if user dismissed banner in this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) {
      return;
    }

    // Listen for the install prompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show banner after 3 seconds (let user browse first)
      setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA installed');
    } else {
      console.log('❌ PWA installation declined');
    }

    // Hide banner and clear prompt
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  if (!showBanner || !deferredPrompt) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <div style={styles.icon}>📱</div>
        <div style={styles.content}>
          <h3 style={styles.title}>Install RetirePlan</h3>
          <p style={styles.description}>
            Get quick access to your retirement planning tools
          </p>
        </div>
        <div style={styles.actions}>
          <button onClick={handleInstallClick} style={styles.installButton}>
            Install
          </button>
          <button onClick={handleDismiss} style={styles.dismissButton}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: '16px',
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    animation: 'slideUp 0.3s ease-out',
  },
  banner: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
    padding: '20px',
    maxWidth: '500px',
    width: '100%',
    pointerEvents: 'auto',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    border: '1px solid #e2e8f0',
  },
  icon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.4',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  installButton: {
    background: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.2s',
  },
  dismissButton: {
    background: 'transparent',
    color: '#64748b',
    border: 'none',
    padding: '4px 8px',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};

// Add animation keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @media (max-width: 640px) {
      /* Mobile adjustments */
    }
  `;
  document.head.appendChild(styleSheet);
}