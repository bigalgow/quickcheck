// src/components/DCPotWizard.jsx
import React, { useState, useEffect } from 'react';

export default function DCPotWizard({ totalValue, onTotalChange }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pots, setPots] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Load pots from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('retireplan-dc-pots');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPots(data.pots || []);
      } catch (e) {
        console.warn('Failed to load DC pots:', e);
      }
    }
  }, []);

  // Save pots to localStorage and update total whenever pots change
  useEffect(() => {
    if (pots.length > 0) {
      localStorage.setItem('retireplan-dc-pots', JSON.stringify({ pots }));
      const total = pots.reduce((sum, pot) => sum + (parseFloat(pot.value) || 0), 0);
      onTotalChange(total);
    } else if (pots.length === 0 && localStorage.getItem('retireplan-dc-pots')) {
      // Clear localStorage if all pots deleted
      localStorage.removeItem('retireplan-dc-pots');
    }
  }, [pots, onTotalChange]);

  const addPot = () => {
    const newPot = {
      id: Date.now().toString(),
      nickname: '',
      value: 0,
      lastUpdated: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };
    setPots([...pots, newPot]);
    setEditingId(newPot.id);
  };

  const updatePot = (id, field, value) => {
    setPots(pots.map(pot =>
      pot.id === id ? { ...pot, [field]: value } : pot
    ));
  };

  const deletePot = (id) => {
    setPots(pots.filter(pot => pot.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const total = pots.reduce((sum, pot) => sum + (parseFloat(pot.value) || 0), 0);

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.toggleButton}
        type="button"
      >
        {isExpanded ? '▼' : '▶'} DC Pension Pots ({pots.length})
        {pots.length > 0 && <span style={styles.totalBadge}>Total: £{total.toLocaleString()}</span>}
      </button>

      {isExpanded && (
        <div style={styles.wizardContent}>
          <div style={styles.header}>
            <p style={styles.description}>
              Track your individual DC pension pots. The total will automatically update the DC Pot input above.
            </p>
          </div>

          {pots.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No pension pots added yet. Click "Add Pot" to get started.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nickname</th>
                    <th style={styles.th}>Value (£)</th>
                    <th style={styles.th}>Last Updated</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pots.map(pot => (
                    <tr key={pot.id} style={styles.tr}>
                      <td style={styles.td}>
                        <input
                          type="text"
                          value={pot.nickname}
                          onChange={(e) => updatePot(pot.id, 'nickname', e.target.value)}
                          placeholder="e.g., Company Pension"
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={pot.value}
                          onChange={(e) => updatePot(pot.id, 'value', e.target.value)}
                          placeholder="0"
                          style={styles.input}
                          min="0"
                          step="1"
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="date"
                          value={pot.lastUpdated}
                          onChange={(e) => updatePot(pot.id, 'lastUpdated', e.target.value)}
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => deletePot(pot.id)}
                          style={styles.deleteButton}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={styles.totalRow}>
                    <td style={styles.td}><strong>Total</strong></td>
                    <td style={styles.td}><strong>£{total.toLocaleString()}</strong></td>
                    <td style={styles.td} colSpan="2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={addPot}
            style={styles.addButton}
            type="button"
          >
            + Add Pot
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    marginTop: '8px',
    marginBottom: '16px',
  },
  toggleButton: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.2s',
  },
  totalBadge: {
    marginLeft: 'auto',
    background: '#0ea5e9',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
  },
  wizardContent: {
    marginTop: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '16px',
    background: '#ffffff',
  },
  header: {
    marginBottom: '16px',
  },
  description: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px',
    borderBottom: '2px solid #e2e8f0',
    color: '#475569',
    fontWeight: '600',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '10px',
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '14px',
  },
  deleteButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  totalRow: {
    borderTop: '2px solid #cbd5e1',
    background: '#f8fafc',
  },
  addButton: {
    background: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};
