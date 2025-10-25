import React from 'react';
import { useHandleSignInCallback } from '@logto/react';

export default function Callback() {
  const { isLoading, error } = useHandleSignInCallback(() => {
    window.location.replace('/');
  });
  if (error) return <div style={{padding:24}}><h2>Sign-in error</h2><pre>{String(error)}</pre></div>;
  return <div style={{padding:24}}><h2>Redirecting…</h2>{isLoading && <p>Completing sign-in…</p>}</div>;
}
