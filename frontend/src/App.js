import React, { useEffect, useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import InboxPage from './pages/InboxPage';
import EmailPage from './pages/EmailPage';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/email/:id" element={<EmailPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors />
    </div>
  );
}

export default App;