// src/components/BottomNav.jsx - Updated for your existing routes
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if viewing on mobile/tablet device (including iPad)
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);

  React.useEffect(() => {
    const checkMobileOrTablet = () => {
      // Show on screens up to 1024px (includes phones and tablets/iPads)
      const isSmallScreen = window.innerWidth <= 1024;

      // Also detect touch capability for better tablet detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setIsMobileOrTablet(isSmallScreen || isTouchDevice);
    };

    checkMobileOrTablet();
    window.addEventListener('resize', checkMobileOrTablet);

    return () => window.removeEventListener('resize', checkMobileOrTablet);
  }, []);

  // Only show on mobile/tablet devices
  if (!isMobileOrTablet) {
    return null;
  }
  
  const tabs = [
    {
      id: 'magazine',
      icon: '📰',
      label: 'Ascent Magazine',
      action: () => window.open('https://www.retireplan.co.uk/ascent-magazine', '_blank'),
      type: 'external'
    },
    {
      id: 'library',
      icon: '📚',
      label: 'Library',
      action: () => window.open('https://www.retireplan.co.uk/development/library-search-1-column-wip', '_blank'),
      type: 'external'
    },
    {
      id: 'goal-planner',
      icon: '🎯',
      label: 'Goal Planner',
      action: () => window.open('https://www.retireplan.co.uk/development/goal-planner', '_blank'),
      type: 'external'
    },
    {
      id: 'help',
      icon: '❓',
      label: 'Help',
      action: () => window.open('https://www.retireplan.co.uk/development/help-page', '_blank'),
      type: 'external'
    },
    {
      id: 'account',
      icon: '👤',
      label: 'Account',
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