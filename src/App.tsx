  import React from 'react';
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
  import { useAuth } from '@clerk/clerk-react';
  import Login from './pages/Login';
  import Dashboard from './pages/Dashboard';
  import Chat from './pages/Chat';
  import Documents from './pages/Documents';
  import ImageGen from './pages/ImageGen';
  import Livecall from './pages/Livecall';
  import Landing from './pages/landing';
  import SSOCallback from './pages/SSOCallback';
  import { ClerkAuthProvider } from './contexts/ClerkAuthContext';
  import { Toaster } from 'sonner';
 

  // Component to handle protected routes
  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isSignedIn, isLoaded } = useAuth();

    if (!isLoaded) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      );
    }

    if (!isSignedIn) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  }

  function App() {
    return (
      <ClerkAuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-900 relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 w-full h-full">
              <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <Routes> 
                {/* Public routes - no authentication required */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/sso-callback" element={<SSOCallback />} />
                  
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
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
          <Toaster />
        </BrowserRouter>
      </ClerkAuthProvider>
    );
  }

  export default App;