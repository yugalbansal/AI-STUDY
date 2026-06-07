import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import ImageGen from './pages/ImageGen';
import GeneratedImages from './pages/GeneratedImages';
import Livecall from './pages/Livecall';
import Landing from './pages/landing';
import SSOCallback from './pages/SSOCallback';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import About from './pages/About';
import Features from './pages/Features';
import HowToUse from './pages/HowToUse';
import UseCases from './pages/UseCases';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Blog from './pages/Blog';
import Careers from './pages/Careers';
import BlogPost from './pages/BlogPost';
import API from './pages/API';
import Status from './pages/Status';
import CookiePolicy from './pages/CookiePolicy';
import { ClerkAuthProvider } from './contexts/ClerkAuthContext';
import ConsentGate from './components/ConsentGate';
import PuterGate from './components/PuterGate';
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

  return (
    <ConsentGate>
      <PuterGate>
        <>{children}</>
      </PuterGate>
    </ConsentGate>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkAuthProvider>
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
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/sso-callback" element={<SSOCallback />} />
              <Route path="/about" element={<About />} />
              <Route path="/features" element={<Features />} />
              <Route path="/how-to-use" element={<HowToUse />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/api-docs" element={<API />} />
              <Route path="/status" element={<Status />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />

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
                path="/generated-images"
                element={
                  <ProtectedRoute>
                    <GeneratedImages />
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
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
        <Toaster />
      </ClerkAuthProvider>
    </BrowserRouter>
  );
}

export default App;
