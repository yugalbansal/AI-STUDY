import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, MessageSquare, LayoutDashboard, LogOut, Menu, X, Image } from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white/10 backdrop-blur-md shadow-lg border-b border-white/10 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center px-2 py-2 text-white hover:text-blue-400 transition-colors">
              <BookOpen className="h-6 w-6 flex-shrink-0" />
              <span className="ml-2 font-semibold hidden xs:block text-sm sm:text-base">AI Study Platform</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-white hover:text-blue-400 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all touch-manipulation"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Desktop and Tablet menu */}
          <div className="hidden md:flex md:items-center md:space-x-2 lg:space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center px-2 lg:px-3 py-2 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all text-sm lg:text-base"
            >
              <LayoutDashboard className="h-4 lg:h-5 w-4 lg:w-5 mr-1" />
              <span className="hidden lg:block">Dashboard</span>
            </Link>
            <Link
              to="/documents"
              className="flex items-center px-2 lg:px-3 py-2 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all text-sm lg:text-base"
            >
              <BookOpen className="h-4 lg:h-5 w-4 lg:w-5 mr-1" />
              <span className="hidden lg:block">Documents</span>
            </Link>
            <Link
              to="/chat"
              className="flex items-center px-2 lg:px-3 py-2 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all text-sm lg:text-base"
            >
              <MessageSquare className="h-4 lg:h-5 w-4 lg:w-5 mr-1" />
              <span className="hidden lg:block">Chat</span>
            </Link>
            <Link
              to="/livecall"
              className="flex items-center px-2 lg:px-3 py-2 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all text-sm lg:text-base"
            >
              <MessageSquare className="h-4 lg:h-5 w-4 lg:w-5 mr-1" />
              <span className="hidden lg:block">Live Call</span>
            </Link>
            <Link
              to="/images"
              className="flex items-center px-2 lg:px-3 py-2 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all text-sm lg:text-base"
            >
              <Image className="h-4 lg:h-5 w-4 lg:w-5 mr-1" />
              <span className="hidden lg:block">Images</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center px-2 lg:px-3 py-2 text-white hover:text-red-400 hover:bg-white/10 rounded-md transition-all text-sm lg:text-base"
            >
              <LogOut className="h-4 lg:h-5 w-4 lg:w-5 mr-1" />
              <span className="hidden lg:block">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile and Tablet menu */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t border-white/10 bg-white/5 backdrop-blur-md`}>
        <div className="pt-2 pb-3 space-y-1 px-2">
          <Link
            to="/dashboard"
            className="flex items-center px-4 py-3 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all touch-manipulation"
            onClick={() => setIsMenuOpen(false)}
          >
            <LayoutDashboard className="h-5 w-5 mr-3 flex-shrink-0" />
            Dashboard
          </Link>
          <Link
            to="/documents"
            className="flex items-center px-4 py-3 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all touch-manipulation"
            onClick={() => setIsMenuOpen(false)}
          >
            <BookOpen className="h-5 w-5 mr-3 flex-shrink-0" />
            Documents
          </Link>
          <Link
            to="/chat"
            className="flex items-center px-4 py-3 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all touch-manipulation"
            onClick={() => setIsMenuOpen(false)}
          >
            <MessageSquare className="h-5 w-5 mr-3 flex-shrink-0" />
            Chat
          </Link>
          <Link
            to="/livecall"
            className="flex items-center px-4 py-3 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all touch-manipulation"
            onClick={() => setIsMenuOpen(false)}
          >
            <MessageSquare className="h-5 w-5 mr-3 flex-shrink-0" />
            Live Call
          </Link>
          <Link
            to="/images"
            className="flex items-center px-4 py-3 text-white hover:text-blue-400 hover:bg-white/10 rounded-md transition-all touch-manipulation"
            onClick={() => setIsMenuOpen(false)}
          >
            <Image className="h-5 w-5 mr-3 flex-shrink-0" />
            Images
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-white hover:text-red-400 hover:bg-white/10 rounded-md transition-all touch-manipulation"
          >
            <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}