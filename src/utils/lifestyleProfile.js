// src/utils/lifestyleProfile.js
// Utility functions for saving/loading lifestyle profile to/from Logto custom field

/**
 * Save lifestyle profile to Logto custom field via backend API
 * @param {object} profile - The lifestyle profile data
 * @param {function} getAccessToken - Function to get access token from auth context
 * @returns {Promise<boolean>} - Success status
 */
export async function saveLifestyleProfile(profile, getAccessToken) {
  try {
    const audience = import.meta.env.VITE_API_AUDIENCE;
    if (!audience) {
      console.info('ℹ️ VITE_API_AUDIENCE not configured - lifestyle profile save disabled');
      return false;
    }

    const token = await getAccessToken(audience);

    const res = await fetch('/api/me/retireplan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        lifestyleProfile: profile
      })
    });

    if (!res.ok) {
      if (res.status === 404) {
        console.info('ℹ️ API endpoint not available (OK in local dev)');
      } else {
        console.error('Save lifestyle profile failed:', res.status, await res.text());
      }
      return false;
    }

    console.log('✅ Lifestyle profile saved successfully');
    return true;
  } catch (e) {
    console.error('Error saving lifestyle profile:', e);
    return false;
  }
}

/**
 * Load lifestyle profile from Logto custom field via backend API
 * @param {function} getAccessToken - Function to get access token from auth context
 * @returns {Promise<object|null>} - The lifestyle profile or null if not found
 */
export async function loadLifestyleProfile(getAccessToken) {
  try {
    const audience = import.meta.env.VITE_API_AUDIENCE;
    if (!audience) {
      console.info('ℹ️ VITE_API_AUDIENCE not configured - lifestyle profile load disabled');
      return null;
    }

    const token = await getAccessToken(audience);

    const res = await fetch('/api/me/retireplan', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 404) {
        console.info('ℹ️ API endpoint not available (OK in local dev)');
      } else {
        console.warn('Load lifestyle profile failed:', res.status);
      }
      return null;
    }

    const data = await res.json();
    return data?.lifestyleProfile || null;
  } catch (e) {
    console.error('Error loading lifestyle profile:', e);
    return null;
  }
}

/**
 * Delete lifestyle profile from Logto custom field
 * @param {function} getAccessToken - Function to get access token from auth context
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteLifestyleProfile(getAccessToken) {
  try {
    const audience = import.meta.env.VITE_API_AUDIENCE;
    if (!audience) {
      return false;
    }

    const token = await getAccessToken(audience);

    const res = await fetch('/api/me/retireplan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        lifestyleProfile: null
      })
    });

    if (!res.ok) {
      console.error('Delete lifestyle profile failed:', res.status);
      return false;
    }

    console.log('✅ Lifestyle profile deleted successfully');
    return true;
  } catch (e) {
    console.error('Error deleting lifestyle profile:', e);
    return false;
  }
}

/**
 * Transform exceptional items from lifestyle profile to event format for Module 2
 * @param {Array} exceptionalItems - Array of exceptional items from profile
 * @param {number} retirementAge - User's retirement age
 * @returns {Array} - Array of events in Module 2 format
 */
export function transformProfileItemsToEvents(exceptionalItems, retirementAge) {
  if (!exceptionalItems || exceptionalItems.length === 0) {
    return [];
  }

  return exceptionalItems.map(item => {
    const isOneOff = item.timing === 'oneOff';
    const eventAge = retirementAge + (item.year || 1);

    // Base event structure
    const event = {
      id: `profile-${item.category}-${item.type}`,
      name: item.name,
      age: eventAge,
      amount: item.cost || 0,
      type: 'expense', // All profile items are expenses
      isRecurring: !isOneOff,
      recurringYears: isOneOff ? 0 : (item.duration || 5)
    };

    return event;
  });
}
