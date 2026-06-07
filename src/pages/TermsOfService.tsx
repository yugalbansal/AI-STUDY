import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertCircle, Scale } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Helmet>
        <title>Terms of Service - Vector Mind AI</title>
        <meta name="description" content="Vector Mind AI Terms of Service - Rules and guidelines for using our platform" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 mb-6 shadow-2xl">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Last updated: June 7, 2026
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Acceptance of Terms */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              By accessing or using Vector Mind AI (available at <strong>vectormind.site</strong>), you agree to be bound by these Terms of Service and all applicable laws and regulations.
              If you do not agree with any part of these terms, please do not use the service.
            </p>
          </div>

          {/* Eligibility */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Eligibility
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              You must be at least <strong>13 years old</strong> to use Vector Mind AI.
              By using the platform, you represent and warrant that you meet this age requirement.
              If you are under 18, you should have parental or guardian consent.
            </p>
          </div>

          {/* Account Responsibilities */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Account Responsibilities
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">When you create an account, you are responsible for:</p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Maintaining the confidentiality of your account credentials</li>
              <li>• All activities that occur under your account</li>
              <li>• Providing accurate and up-to-date information</li>
              <li>• Notifying us immediately of any unauthorized access</li>
              <li>• Not sharing your account with others</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              We are not responsible for unauthorized access caused by user negligence or compromised credentials.
            </p>
          </div>

          {/* Acceptable Use */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Acceptable Use
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">You agree <strong>not</strong> to:</p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Use the service for any illegal, harmful, or fraudulent activities</li>
              <li>• Attempt to hack, reverse-engineer, or compromise system security</li>
              <li>• Upload viruses, malware, or malicious code</li>
              <li>• Abuse, spam, or overload the platform (e.g., excessive API calls)</li>
              <li>• Impersonate others or misrepresent your identity</li>
              <li>• Violate intellectual property rights of Vector Mind AI or third parties</li>
              <li>• Use AI outputs to create misleading, defamatory, or harmful content</li>
              <li>• Scrape or extract data using automated tools without permission</li>
              <li>• Bypass rate limits, paywalls, or access controls</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              We reserve the right to suspend or terminate accounts that violate these rules without prior notice.
            </p>
          </div>

          {/* AI-Generated Content */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. AI-Generated Content
            </h2>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">Important Disclaimer</h3>
                  <p className="text-amber-800 dark:text-amber-400 text-sm">
                    AI-generated responses are for educational and informational purposes only. They should not be used as professional advice.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
               Vector Mind AI uses advanced AI models via <strong>Puter.js client-side processing</strong> (including GPT, Claude, Gemini, and others) to provide intelligent responses. AI requests are processed through anonymous browser sessions — no Puter account is created on your behalf. However, we <strong>do not guarantee</strong>:
             </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Accuracy or completeness of AI-generated content</li>
              <li>• Suitability for professional, medical, legal, or financial decisions</li>
              <li>• Freedom from errors, biases, or outdated information</li>
            </ul>
             <p className="text-gray-700 dark:text-gray-300 mt-3">
               <strong>Use AI outputs responsibly</strong> and verify critical information independently.
             </p>
             <p className="text-gray-700 dark:text-gray-300 mt-3">
               AI chat processing uses a <strong>session-based free quota</strong> provided by Puter.js. If the free quota is exhausted, you can refresh the page or use an incognito window to obtain a new session. This is by design and not a platform limitation.
             </p>
          </div>

          {/* Intellectual Property */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Intellectual Property
            </h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>
                <strong>Platform Ownership:</strong> All design, code, branding, logos, and features of Vector Mind AI are owned by us and protected by copyright and trademark laws.
              </p>
              <p>
                <strong>Your Content:</strong> You retain ownership of content you upload (documents, chat messages, voice recordings). By using the service, you grant us a limited license to process this content to provide our services.
              </p>
              <p>
                <strong>AI Outputs:</strong> AI-generated content is provided "as is". While you may use AI outputs, we do not claim ownership of them, but we also do not guarantee their originality or uniqueness.
              </p>
            </div>
          </div>

          {/* Service Availability */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Service Availability
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              We strive to keep Vector Mind AI available 24/7, but we <strong>do not guarantee</strong> uninterrupted or error-free service.
              We may modify, suspend, or discontinue features at any time, with or without notice, for maintenance, updates, or other reasons.
            </p>
          </div>

          {/* Limitation of Liability */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. Limitation of Liability
            </h2>
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-5 mb-3">
              <p className="text-red-900 dark:text-red-300 font-semibold">
                Vector Mind AI is provided "AS IS" without warranties of any kind.
              </p>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              To the fullest extent permitted by law, we are <strong>not liable</strong> for:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Data loss, corruption, or unauthorized access</li>
              <li>• AI inaccuracies, errors, or misleading outputs</li>
              <li>• Service downtime, interruptions, or performance issues</li>
              <li>• Indirect, incidental, consequential, or punitive damages</li>
               <li>• Third-party service failures (Clerk, Supabase, Google, Puter.js, etc.)</li>
              <li>• Loss of profits, revenue, or business opportunities</li>
            </ul>
          </div>

          {/* Termination */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              9. Termination
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We may suspend or terminate your account if:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• You violate these Terms of Service</li>
              <li>• Your usage poses security, legal, or abuse risks</li>
              <li>• We discontinue the service</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              You may stop using the service and delete your account at any time through Settings.
            </p>
          </div>

          {/* Governing Law */}
          <div className="bg-white dark:bg-zinc-800/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-zinc-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              10. Governing Law
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              These Terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved through good faith negotiation or, if necessary, through appropriate legal channels.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-zinc-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Need Help?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              For questions or concerns regarding these Terms of Service, please visit our Settings page.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              <Scale className="w-5 h-5" />
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
