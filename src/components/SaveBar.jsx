import { useLogto } from '@logto/react';

export default function SaveBar({ inputs, outputs }) {
  const { isAuthenticated, isLoading, signIn, getAccessToken } = useLogto();
  const login = () => signIn({ redirectUri: window.location.href });  // ADDED
  const save = async () => {
    if (!isAuthenticated) { await signIn(); return; }
    const token = await getAccessToken(import.meta.env.VITE_API_AUDIENCE);
    const payload = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      inputs,
      atRetirement: outputs,
    };
    const res = await fetch('/api/me/retireplan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) alert('Save failed');
    else alert('Saved!');
  };

  const openPlanner = async () => {
    if (!isAuthenticated) { await signIn(); return; }
    window.location.href = '/projection-planner';
  };

  // Guests can export JSON
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ inputs, atRetirement: outputs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'retireplan.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="savebar">
      <button disabled={isLoading} onClick={save}>
        {isAuthenticated ? 'Save profile' : 'Login to save'}
      </button>
      <button disabled={isLoading} onClick={openPlanner}>
        {isAuthenticated ? 'Open Projection Planner' : 'Login to continue'}
      </button>
      <button className="secondary" onClick={exportJson}>Export JSON</button>
      <button className="secondary no-print" onClick={() => window.print()}>Print summary</button>
    </div>
  );
}