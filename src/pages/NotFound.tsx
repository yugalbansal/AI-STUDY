import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

export default function NotFound() {
  const { isSignedIn } = useAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col font-sans">
      <Helmet>
        <title>Page Not Found - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Navbar1 />

      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center max-w-xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Animated Illustration */}
          <div className="relative mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
            <FileQuestion className="w-12 h-12" />
            <motion.span 
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>

          <h1 className="text-7xl font-black tracking-tight text-gray-900 dark:text-white">
            404
          </h1>
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-200">
            Page Not Found
          </h2>

          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-md">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={isSignedIn ? "/dashboard" : "/"}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-xs px-6 py-3 rounded-full transition-all shadow-md active:scale-95 w-full sm:w-auto justify-center"
            >
              <Home className="w-3.5 h-3.5" />
              {isSignedIn ? "Back to Dashboard" : "Back to Home"}
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-slate-200 font-semibold text-xs px-6 py-3 rounded-full border border-gray-200 dark:border-zinc-700 transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back
            </button>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
