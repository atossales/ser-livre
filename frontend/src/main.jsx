import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AcceptInvite from './pages/AcceptInvite';
import ResetPassword from './pages/ResetPassword';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/convite/:token" element={<AcceptInvite />} />
      <Route path="/redefinir-senha/:token" element={<ResetPassword />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
