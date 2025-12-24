// src/pages/Profile.jsx
import React from 'react';
import { useAuth } from '../auth/AuthProvider';

export default function Profile() {
  const { isAuthenticated, userInfo, signIn, signOut } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Profile</h1>
      </div>

      {isAuthenticated ? (
        <div style={styles.content}>
          <div style={styles.profileCard}>
            <div style={styles.avatar}>
              {userInfo?.name?.charAt(0).toUpperCase() || userInfo?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <h2 style={styles.name}>{userInfo?.name || 'User'}</h2>
            <p style={styles.email}>{userInfo?.email}</p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Account</h3>
            <button onClick={signOut} style={styles.signOutButton}>
              Sign Out
            </button>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>About</h3>
            <p style={styles.aboutText}>
              RetirePlan QuickCheck helps you plan your retirement with confidence.
              Calculate your retirement income, explore lifestyle options, and view
              25-year projections.
            </p>
          </div>
        </div>
      ) : (
        <div style={styles.content}>
          <div style={styles.signInPrompt}>
            <p style={styles.promptText}>Sign in to save your retirement plans and access them from any device.</p>
            <button onClick={signIn} style={styles.signInButton}>
              Sign In
            </button>
          </div>
        </div>
      )}
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
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    padding: '20px 16px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
  },
  content: {
    padding: '16px',
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#0ea5e9',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '600',
    margin: '0 auto 16px',
  },
  name: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
  },
  email: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  signOutButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  aboutText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
  },
  signInPrompt: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  promptText: {
    margin: '0 0 24px 0',
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.6',
  },
  signInButton: {
    padding: '12px 32px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
