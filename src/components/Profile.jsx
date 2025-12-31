// src/pages/Profile.jsx
import React from 'react';
import { useAuth } from '../auth/AuthProvider';

export default function Profile() {
  const { isAuthenticated, userInfo, signIn, signOut } = useAuth();
  
  const menuItems = [
    {
      id: 'saved-plans',
      icon: '📊',
      title: 'My Saved Plans',
      description: 'View your retirement profiles',
      action: () => console.log('Navigate to saved plans'),
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: 'Settings',
      description: 'App preferences and notifications',
      action: () => console.log('Navigate to settings'),
    },
    {
      id: 'website',
      icon: '🌐',
      title: 'Visit Full Website',
      description: 'Open retireplan.co.uk',
      action: () => window.open('https://retireplan.co.uk', '_blank'),
    },
    {
      id: 'help',
      icon: '❓',
      title: 'Help & Support',
      description: 'Get help with the app',
      action: () => window.open('https://retireplan.co.uk/help', '_blank'),
    },
    {
      id: 'feedback',
      icon: '💬',
      title: 'Send Feedback',
      description: 'Help us improve RetirePlan',
      action: () => window.open('mailto:feedback@retireplan.co.uk?subject=App Feedback'),
    },
  ];
  
  return (
    <div style={styles.container}>
      {/* Profile Header */}
      <div style={styles.header}>
        <div style={styles.avatar}>
          {isAuthenticated && userInfo?.email 
            ? userInfo.email.charAt(0).toUpperCase()
            : '?'}
        </div>
        
        {isAuthenticated ? (
          <div style={styles.userInfo}>
            <h2 style={styles.userName}>
              {userInfo?.name || userInfo?.email || 'User'}
            </h2>
            <p style={styles.userEmail}>{userInfo?.email}</p>
          </div>
        ) : (
          <div style={styles.userInfo}>
            <h2 style={styles.userName}>Not Signed In</h2>
            <p style={styles.userEmail}>Sign in to save your plans</p>
          </div>
        )}
      </div>
      
      {/* Auth Button */}
      <div style={styles.section}>
        {isAuthenticated ? (
          <button onClick={signOut} style={styles.authButton}>
            Sign Out
          </button>
        ) : (
          <button onClick={signIn} style={styles.authButtonPrimary}>
            Sign In
          </button>
        )}
      </div>
      
      {/* Menu Items */}
      <div style={styles.section}>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={item.action}
            style={styles.menuItem}
          >
            <div style={styles.menuIcon}>{item.icon}</div>
            <div style={styles.menuContent}>
              <div style={styles.menuTitle}>{item.title}</div>
              <div style={styles.menuDescription}>{item.description}</div>
            </div>
            <div style={styles.menuArrow}>→</div>
          </button>
        ))}
      </div>
      
      {/* App Info */}
      <div style={styles.section}>
        <div style={styles.appInfo}>
          <p style={styles.appInfoText}>RetirePlan PWA</p>
          <p style={styles.appInfoText}>Version 1.0.0</p>
          <p style={styles.appInfoText}>
            © {new Date().getFullYear()} RetirePlan
          </p>
        </div>
      </div>
      
      {/* Bottom spacing for nav */}
      <div style={styles.bottomSpacer} />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    paddingBottom: '80px',
  },
  header: {
    background: 'white',
    padding: '32px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '32px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '4px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#64748b',
  },
  section: {
    padding: '16px 20px',
  },
  authButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    background: 'white',
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  authButtonPrimary: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#0ea5e9',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  menuItem: {
    width: '100%',
    background: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    marginBottom: '8px',
    textAlign: 'left',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  menuIcon: {
    fontSize: '28px',
    flexShrink: 0,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  menuDescription: {
    fontSize: '14px',
    color: '#64748b',
  },
  menuArrow: {
    fontSize: '20px',
    color: '#cbd5e1',
  },
  appInfo: {
    textAlign: 'center',
    padding: '20px',
  },
  appInfoText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '4px',
  },
  bottomSpacer: {
    height: '20px',
  },
};
