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
        <div className="min-h-screen bg-gray-50">
          {/* Navbar */}
          <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-40">
            <Navbar />
          </nav>

          {/* Background */}
          <div className="fixed inset-0 w-full h-full">
            <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
            <Boxes className="!fixed inset-0" />
          </div>

          {/* Main content */}
          <main className="pt-16 relative z-10">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/images" element={<ImageGen />} />
              <Route path="/livecall" element={<Livecall />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;