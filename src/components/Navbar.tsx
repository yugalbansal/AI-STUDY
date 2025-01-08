import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, MessageSquare, LayoutDashboard, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/dashboard" className="flex items-center px-2 py-2 text-gray-700 hover:text-blue-600">
              <BookOpen className="h-6 w-6" />
              <span className="ml-2 font-semibold">AI Study Platform</span>
            </Link>
          </div>

          <div className="flex space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600"
            >
              <LayoutDashboard className="h-5 w-5 mr-1" />
              Dashboard
            </Link>
            <Link
              to="/documents"
              className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600"
            >
              <BookOpen className="h-5 w-5 mr-1" />
              Documents
            </Link>
            <Link
              to="/chat"
              className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600"
            >
              <MessageSquare className="h-5 w-5 mr-1" />
              Chat
            </Link>
            <button
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="flex items-center px-3 py-2 text-gray-700 hover:text-red-600"
            >
              <LogOut className="h-5 w-5 mr-1" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}