  import React from 'react';
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
  import Login from './pages/Login';
  import Dashboard from './pages/Dashboard';
  import Chat from './pages/Chat';
  import Documents from './pages/Documents';
  import ImageGen from './pages/ImageGen';
  import Livecall from './pages/Livecall';
  import Landing from './pages/landing';
  import AuthCallback from './pages/AuthCallback';
  import { AuthProvider, useAuth } from './contexts/AuthContext';
  import { Toaster } from 'sonner';
 

  // Component to handle protected routes
  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      );
    }
    
    return user ? children : <Navigate to="/login" replace />;
  }

  // Component to handle public routes (redirect to dashboard if logged in)
  function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      );
    }
    
    return !user ? children : <Navigate to="/dashboard" replace />;
  }

  // App Content component that uses auth context
  function AppContent() {
    return (
      <div className="min-h-screen bg-slate-900 relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 w-full h-full">
          <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
        </div>

        {/* Content */}
        <div className="relative z-10">
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
            
            {/* Auth callback route - no protection needed */}
            <Route 
              path="/auth/callback" 
              element={<AuthCallback />} 
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
    return (
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    );
  }

  export default App;