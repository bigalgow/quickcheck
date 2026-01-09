// src/components/BottomNav.jsx
import React from 'react';

export default function BottomNav() {

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
      label: 'Magazine',
      action: () => window.open('https://www.retireplan.co.uk/ascent-magazine', '_blank'),
      type: 'external'
    },
    {
      id: 'library',
      icon: '📚',
      label: 'Library',
      action: () => window.open('https://www.retireplan.co.uk/library-search-1-column-wip', '_blank'),
      type: 'external'
    },
    {
      id: 'goal-planner',
      icon: '🎯',
      label: 'Goal Planner',
      action: () => window.open('https://www.retireplan.co.uk/goal-planner', '_blank'),
      type: 'external'
    },
    {
      id: 'help',
      icon: '❓',
      label: 'Help',
      action: () => window.open('https://www.retireplan.co.uk/help-page', '_blank'),
      type: 'external'
    },
  ];
  
  return (
    <nav style={styles.nav}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={tab.action}
          style={styles.tab}
        >
          <span style={styles.icon}>{tab.icon}</span>
          <span style={styles.label}>
            {tab.label}
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
  icon: {
    fontSize: '24px',
    transition: 'transform 0.2s',
  },
  label: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
};