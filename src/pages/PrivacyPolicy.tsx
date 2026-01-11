import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Server, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Helmet>
        <title>Privacy Policy - Vector Mind AI</title>
        <meta name="description" content="Vector Mind AI Privacy Policy - How we collect, use, and protect your data" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Last updated: January 11, 2026
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Introduction */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Introduction
            </h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                Welcome to Vector Mind AI. Your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your information when you use our services at <strong>vectormind.site</strong>.
              </p>
              <p>
                By using Vector Mind AI, you agree to the practices described in this policy.
              </p>
            </div>
          </div>

          {/* Information We Collect */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              2. Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" />
                  Account Information
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li>• Email address</li>
                  <li>• Name (first and last name)</li>
                  <li>• Authentication method (email/password or Google sign-in)</li>
                  <li>• Profile information (optional)</li>
                </ul>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Authentication is securely managed using <strong>Clerk</strong>, a trusted third-party provider.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Server className="w-5 h-5 text-purple-500" />
                  Usage Data
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li>• Pages visited and features used</li>
                  <li>• Login timestamps and session data</li>
                  <li>• Device and browser information (non-identifying)</li>
                  <li>• IP addresses (for security purposes only)</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  Content You Provide
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li>• Chat conversations and AI interactions</li>
                  <li>• Uploaded documents (PDFs, text files)</li>
                  <li>• Voice recordings for transcription</li>
                  <li>• Generated images and prompts</li>
                </ul>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-3">
                  We do not sell or misuse your content.
                </p>
              </div>
            </div>
          </div>

          {/* How We Use Your Information */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Authenticate and manage user accounts</li>
              <li>• Provide AI-powered features (chat, document analysis, voice transcription, image generation)</li>
              <li>• Store and retrieve your documents and conversation history</li>
              <li>• Improve platform performance and user experience</li>
              <li>• Ensure security and prevent abuse</li>
              <li>• Communicate important service updates</li>
            </ul>
          </div>

          {/* Third-Party Services */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              4. Third-Party Services
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Vector Mind AI uses the following trusted services:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🔐 Authentication</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Clerk</strong> - User authentication and OAuth
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💾 Database</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Supabase</strong> - Secure data storage
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🤖 AI Services</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Google Gemini, Groq, AssemblyAI, ElevenLabs</strong>
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🎨 Image Generation</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Google AI Studio</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Data Security */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Data Security
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We take reasonable measures to protect your data:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Secure authentication with industry-standard encryption</li>
              <li>• Encrypted communication (HTTPS/TLS)</li>
              <li>• Access-controlled databases with row-level security</li>
              <li>• Regular security audits and updates</li>
              <li>• Password hashing (never stored in plain text)</li>
            </ul>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
              However, no system is 100% secure. Please use strong passwords.
            </p>
          </div>

          {/* Your Rights */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Your Rights
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">You have the right to:</p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Access your personal data</li>
              <li>• Update or correct your account information</li>
              <li>• Request deletion of your account and data</li>
              <li>• Export your data (chat history, documents)</li>
              <li>• Withdraw consent for data processing</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-zinc-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Questions?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              If you have any concerns about this Privacy Policy, please visit our Settings page.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              <MessageSquare className="w-5 h-5" />
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
