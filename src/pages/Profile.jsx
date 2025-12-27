// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { loadUnifiedData, saveUnifiedData } from '../utils/persist';

export default function Profile() {
  const { isAuthenticated, userInfo, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [scenarioName, setScenarioName] = useState('');
  const [message, setMessage] = useState('');

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) {
      setMessage('Please enter a scenario name');
      return;
    }

    // Load current calculator data from localStorage
    const data = loadUnifiedData();

    if (!data || !data.inputs) {
      setMessage('No calculator data found. Please use the calculator first.');
      return;
    }

    // Add metadata
    const scenarioData = {
      ...data,
      scenarioName: scenarioName.trim(),
      savedAt: new Date().toISOString(),
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(scenarioData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenarioName.trim().toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setMessage(`✅ Scenario "${scenarioName}" saved to your device`);
    setScenarioName('');

    setTimeout(() => setMessage(''), 3000);
  };

  const handleLoadScenario = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate data structure
      if (!data.inputs) {
        setMessage('Invalid scenario file');
        return;
      }

      // Save to localStorage
      saveUnifiedData(data);

      setMessage(`✅ Scenario loaded. Navigating to calculator...`);

      // Navigate to calculator after a brief delay
      setTimeout(() => {
        navigate('/calculator');
      }, 1500);

    } catch (error) {
      setMessage('❌ Failed to load scenario. Invalid JSON file.');
      console.error('Load scenario error:', error);
    }

    // Reset file input
    event.target.value = '';
  };

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

          {/* Scenario Management Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Scenario Management</h3>
            <p style={styles.sectionDescription}>
              Save your retirement plans as scenarios to compare different options or test various assumptions.
            </p>

            {/* Save Scenario */}
            <div style={styles.scenarioAction}>
              <label style={styles.label}>Save Current Scenario</label>
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g., Conservative Plan"
                  style={styles.textInput}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveScenario()}
                />
                <button onClick={handleSaveScenario} style={styles.saveButton}>
                  💾 Save to Device
                </button>
              </div>
            </div>

            {/* Load Scenario */}
            <div style={styles.scenarioAction}>
              <label style={styles.label}>Load Scenario from Device</label>
              <label style={styles.fileButton}>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleLoadScenario}
                  style={{ display: 'none' }}
                />
                📂 Browse Files
              </label>
            </div>

            {/* Message */}
            {message && (
              <div style={{
                ...styles.message,
                ...(message.includes('❌') ? styles.messageError : styles.messageSuccess)
              }}>
                {message}
              </div>
            )}
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
  sectionDescription: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  scenarioAction: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  textInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  fileButton: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  message: {
    marginTop: '16px',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
  },
  messageSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  messageError: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
};
