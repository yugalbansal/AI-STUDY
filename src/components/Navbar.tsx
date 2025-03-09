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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center px-2 py-2 text-white hover:text-blue-400">
              <BookOpen className="h-6 w-6" />
              <span className="ml-2 font-semibold hidden sm:block">AI Study Platform</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-white hover:text-blue-400 focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center px-3 py-2 text-white hover:text-blue-400"
            >
              <LayoutDashboard className="h-5 w-5 mr-1" />
              Dashboard
            </Link>
            <Link
              to="/documents"
              className="flex items-center px-3 py-2 text-white hover:text-blue-400"
            >
              <BookOpen className="h-5 w-5 mr-1" />
              Documents
            </Link>
            <Link
              to="/chat"
              className="flex items-center px-3 py-2 text-white hover:text-blue-400"
            >
              <MessageSquare className="h-5 w-5 mr-1" />
              Chat
            </Link>
            <Link
              to="/images"
              className="flex items-center px-3 py-2 text-white hover:text-blue-400"
            >
              <Image className="h-5 w-5 mr-1" />
              Images
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 text-white hover:text-red-400"
            >
              <LogOut className="h-5 w-5 mr-1" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center px-4 py-2 text-white hover:text-blue-400 hover:bg-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            <LayoutDashboard className="h-5 w-5 mr-2" />
            Dashboard
          </Link>
          <Link
            to="/documents"
            className="flex items-center px-4 py-2 text-white hover:text-blue-400 hover:bg-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Documents
          </Link>
          <Link
            to="/chat"
            className="flex items-center px-4 py-2 text-white hover:text-blue-400 hover:bg-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Chat
          </Link>
          <Link
            to="/images"
            className="flex items-center px-4 py-2 text-white hover:text-blue-400 hover:bg-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            <Image className="h-5 w-5 mr-2" />
            Images
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-white hover:text-red-400 hover:bg-white/5"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}