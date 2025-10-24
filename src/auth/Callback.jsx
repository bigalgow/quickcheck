import { useEffect } from 'react';
import { useLogto } from '@logto/react';

export default function Callback() {
  const { isLoading } = useLogto();

  // After the provider processes the code on this page, navigate home.
  useEffect(() => {
    if (!isLoading) {
      // remove code/state from the URL and go back to the app
      window.location.replace('/');
    }
  }, [isLoading]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Signing you in…</h2>
      <p>You’ll be redirected in a moment.</p>
    </div>
  );
}
