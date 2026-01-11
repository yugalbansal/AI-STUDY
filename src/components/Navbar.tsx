import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignOutButton, useUser } from '@clerk/clerk-react';
import { BookOpen, MessageSquare, LayoutDashboard, LogOut, Menu, X, Image, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserProfile from './UserProfile';
import { DarkModeToggle } from './DarkModeToggle';

interface NavbarProps {
  /**
   * When true (default), the navbar positions itself using a fixed, full-width layout.
   * When false, positioning is left to the parent component.
   */
  isFixed?: boolean;
  /**
   * Optional additional classes to apply to the outer wrapper.
   */
  className?: string;
}

export default function Navbar({ isFixed = true, className = '' }: NavbarProps = {}) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const containerClasses = [
    'flex justify-center w-full py-6 px-4 bg-gradient-to-b from-gray-50 via-gray-50 to-transparent dark:from-zinc-900 dark:via-zinc-900 dark:to-transparent pointer-events-none',
    isFixed ? 'fixed top-0 left-0 right-0 z-50' : 'relative z-40',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <nav className="flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50 dark:border-zinc-700/50 w-full max-w-5xl relative pointer-events-auto">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center mr-4">
          <motion.div
            className="w-10 h-10 mr-2 overflow-hidden"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            whileHover={{ rotate: 10 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src="https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.svg" 
              alt="Vector Mind AI Logo" 
              className="w-full h-full object-cover scale-150"
              style={{ display: 'block', margin: 0, padding: 0 }}
            />
          </motion.div>
          <span className="font-semibold text-gray-900 dark:text-white hidden sm:block">Vector Mind AI</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center space-x-1">
            <Link
              to="/dashboard"
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              to="/chat"
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-sm font-medium"
            >
              Chat
            </Link>
            <Link
              to="/documents"
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-sm font-medium"
            >
              Documents
            </Link>
            <Link
              to="/images"
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-sm font-medium"
            >
              Images
            </Link>
            <Link
              to="/livecall"
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-sm font-medium"
            >
              Live Call
            </Link>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <DarkModeToggle />
            <UserProfile />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <DarkModeToggle />
          <button
            onClick={toggleMenu}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden pointer-events-auto"
            onClick={toggleMenu}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-zinc-900 shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-8 h-8 mr-3">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="16" fill="url(#paint0_linear_mobile)" />
                      <defs>
                        <linearGradient id="paint0_linear_mobile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#3B82F6" />
                          <stop offset="1" stopColor="#1E40AF" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
                </div>
                <button
                  onClick={toggleMenu}
                  className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  onClick={toggleMenu}
                >
                  <LayoutDashboard className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
                <Link
                  to="/chat"
                  className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  onClick={toggleMenu}
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Chat
                </Link>
                <Link
                  to="/documents"
                  className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  onClick={toggleMenu}
                >
                  <BookOpen className="h-5 w-5 mr-3" />
                  Documents
                </Link>
                <Link
                  to="/images"
                  className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  onClick={toggleMenu}
                >
                  <Image className="h-5 w-5 mr-3" />
                  Images
                </Link>
                <Link
                  to="/livecall"
                  className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  onClick={toggleMenu}
                >
                  <Phone className="h-5 w-5 mr-3" />
                  Live Call
                </Link>
                <div className="pt-4">
                  <SignOutButton redirectUrl="/">
                    <button className="flex items-center w-full px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg rounded-xl transition-all">
                      <LogOut className="h-5 w-5 mr-3" />
                      Sign Out
                    </button>
                  </SignOutButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}