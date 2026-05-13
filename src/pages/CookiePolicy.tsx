import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Cookie, Shield, Settings, AlertTriangle, CheckCircle } from 'lucide-react';

const cookieTypes = [
  {
    name: "Essential Cookies",
    description: "Required for the website to function properly. These cannot be disabled.",
    examples: ["Authentication tokens", "Security tokens", "Load balancing"],
    required: true
  },
  {
    name: "Analytics Cookies",
    description: "Help us understand how visitors interact with our website.",
    examples: ["Page views", "User journey", "Performance metrics"],
    required: false
  },
  {
    name: "Functional Cookies",
    description: "Enable enhanced functionality and personalization.",
    examples: ["Language preferences", "Theme settings", "Saved preferences"],
    required: false
  },
  {
    name: "Marketing Cookies",
    description: "Used to track visitors across websites for advertising purposes.",
    examples: ["Ad personalization", "Campaign tracking", "Social media integration"],
    required: false
  }
];

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>Cookie Policy - Vector Mind AI | Cookie Declaration & Privacy</title>
        <meta name="description" content="Vector Mind AI Cookie Policy. Learn about the cookies we use, how to manage them, and your privacy rights. Transparent data practices." />
        <meta name="keywords" content="vector mind cookie policy, cookies, privacy policy, data protection, cookie consent, tracking, analytics, gdpr, ccpa" />
        <meta property="og:title" content="Cookie Policy - Vector Mind AI" />
        <meta property="og:description" content="Learn about cookies used on Vector Mind AI" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navbar1 />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              Privacy
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Cookie
              <span className="text-blue-600"> Policy</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              We use cookies to enhance your experience. This policy explains what cookies are,
              how we use them, and your choices regarding cookies.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Summary</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">We don't sell your data</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Your personal data is never sold to third parties.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-blue-500 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">You control cookies</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Manage or disable non-essential cookies anytime.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Cookie className="w-6 h-6 text-orange-500 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Essential cookies required</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Some cookies are necessary for the site to work.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Settings className="w-6 h-6 text-purple-500 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Cookie settings</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Update preferences in your browser or our settings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cookie Types */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Types of Cookies We Use</h2>
            <p className="text-gray-600 dark:text-gray-400">Understanding what cookies do and why we use them</p>
          </div>
          <div className="space-y-6">
            {cookieTypes.map((cookie, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{cookie.name}</h3>
                  {cookie.required ? (
                    <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm rounded-full">
                      Required
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm rounded-full">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{cookie.description}</p>
                <div className="flex flex-wrap gap-2">
                  {cookie.examples.map((example, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                      {example}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cookie Management */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Managing Your Cookies</h2>
            <p className="text-gray-600 dark:text-gray-400">You have several options to control cookies</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center"
            >
              <Settings className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Browser Settings</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Most browsers allow you to manage cookie preferences through their settings.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center"
            >
              <Shield className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Privacy Dashboard</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your preferences in your account settings.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center"
            >
              <AlertTriangle className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Third-Party Tools</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Use tools like Ghostery or Privacy Badger to manage tracking.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Third Party */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Third-Party Services</h2>
            <p className="text-gray-600 dark:text-gray-400">We work with trusted partners who also use cookies</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 space-y-4">
            {[
              { name: "Google Analytics", purpose: "Website analytics and performance" },
              { name: "Clerk", purpose: "User authentication and management" },
              { name: "Supabase", purpose: "Database and storage services" },
              { name: "Vercel", purpose: "Website hosting and CDN" }
            ].map((service, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600 last:border-0">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{service.name}</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{service.purpose}</p>
                </div>
                <a href="/privacy" className="text-blue-600 hover:underline text-sm">Privacy Policy</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Updates */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Policy Updates</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We may update this Cookie Policy from time to time. Any changes will be posted on this page
              with an updated "Last modified" date. We encourage you to review this policy periodically.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
              Last updated: May 13, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Questions?</h2>
          <p className="text-blue-100 mb-6">If you have any questions about our Cookie Policy, please contact us.</p>
          <a
            href="/contact"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}