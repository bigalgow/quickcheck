// src/components/BottomNav.jsx - Updated for your existing routes
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Only show bottom nav on mobile-specific routes
  const showOnRoutes = ['/mobile-home', '/profile'];
  const shouldShow = showOnRoutes.includes(location.pathname);
  
  if (!shouldShow) {
    return null; // Don't show on desktop routes
  }
  
  const tabs = [
    { 
      id: 'home', 
      icon: '🏠', 
      label: 'Home', 
      path: '/mobile-home',
      type: 'internal'
    },
    { 
      id: 'calculator', 
      icon: '🧮', 
      label: 'Calculate', 
      path: '/lifestyle',
      type: 'internal'
    },
    {
      id: 'magazine',
      icon: '📖',
      label: 'Magazine',
      action: () => window.open('https://www.retireplan.co.uk/development/ascent-magazine', '_blank'),
      type: 'external'
    },
    { 
      id: 'profile', 
      icon: '👤', 
      label: 'Profile', 
      path: '/profile',
      type: 'internal'
    },
  ];
  
  const handleTabClick = (tab) => {
    if (tab.type === 'external' && tab.action) {
      tab.action();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };
  
  const isActive = (tab) => {
    if (!tab.path) return false;
    return location.pathname === tab.path;
  };
  
  return (
    <nav style={styles.nav}>
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => handleTabClick(tab)}
          style={{
            ...styles.tab,
            ...(isActive(tab) ? styles.tabActive : {})
          }}
        >
          <span style={styles.icon}>{tab.icon}</span>
          <span style={{
            ...styles.label,
            ...(isActive(tab) ? styles.labelActive : {})
          }}>
            {tab.label}
            {tab.type === 'external' && <span style={styles.externalIcon}>↗</span>}
          </span>
        </button>
      ))}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
    zIndex: 1000,
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
  },
  tab: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    flex: 1,
    padding: '8px',
    transition: 'all 0.2s',
  },
  tabActive: {
    transform: 'translateY(-2px)',
  },
  icon: {
    fontSize: '24px',
    transition: 'transform 0.2s',
  },
  label: {
    fontSize: '11px',
    color: '#64748b',
    position: 'relative',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  labelActive: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  externalIcon: {
    fontSize: '9px',
    marginLeft: '2px',
    opacity: 0.6,
  },
};