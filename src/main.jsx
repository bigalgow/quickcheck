import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import AuthProvider from './auth/AuthProvider.jsx';
import Callback from './auth/Callback.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <HashRouter>
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </HashRouter>
  </AuthProvider>
);


