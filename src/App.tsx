  import React from 'react';
  import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  import { AuthProvider, useAuth } from './contexts/AuthContext';
  import { Boxes } from './components/ui/background-boxes';
 

  // Component to handle protected routes
  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
  }

  // Component to handle public routes (redirect to dashboard if logged in)
  function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    return !user ? children : <Navigate to="/dashboard" replace />;
  }

  // App Content component that uses auth context
  function AppContent() {
    return (
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
            {/* Public routes - redirect to dashboard if logged in */}
            
            <Route 
              path="/" 
              element={
                <PublicRoute>
                  <Landing />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
              
            {/* Protected routes - require authentication */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents" 
              element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/images" 
              element={
                <ProtectedRoute>
                  <ImageGen />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/livecall" 
              element={
                <ProtectedRoute>
                  <Livecall />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </div>
    );
  }

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
        <HashRouter>
          <AppContent />
        </HashRouter>
      </AuthProvider>
    );
  }

  export default App;