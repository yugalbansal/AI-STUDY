import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import ImageGen from './pages/ImageGen';
import Livecall from './pages/Livecall';
import Landing from './pages/landing';
import MobileBlocker from './components/MobileBlocker';
import { AuthProvider } from './contexts/AuthContext';
import { Boxes } from './components/ui/background-boxes';

function App() {
  // Check if the device is mobile (screens smaller than 768px)
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // If mobile, show the mobile blocker
  if (isMobile) {
    return <MobileBlocker />;
  }

  // Desktop view - your original app
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
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
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