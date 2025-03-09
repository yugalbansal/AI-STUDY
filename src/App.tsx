import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import ImageGen from './pages/ImageGen';
import Livecall from './pages/Livecall';
import { AuthProvider } from './contexts/AuthContext';
import { Boxes } from './components/ui/background-boxes';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 relative overflow-hidden">
          {/* Background */}
          <div className="fixed inset-0 w-full h-full">
            <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
            <Boxes className="!fixed inset-0" />
          </div>

          {/* Content */}
          <div className="relative z-10">
            <Navbar />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/images" element={<ImageGen />} />
              <Route path="/livecall" element={<Livecall />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;