import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, Building } from 'lucide-react';

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Zap,
    description: "Perfect for students and hobbyists",
    features: [
      "Unlimited document uploads",
      "Unlimited JSONL generation",
      "AI document chat",
      "Voice AI tutor",
      "Image generation (50/month)",
      "Vector search",
      "Basic JSONL formats",
      "Community support"
    ],
    cta: "Get Started Free",
    popular: false
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    icon: Star,
    description: "For power users and small teams",
    features: [
      "Everything in Free",
      "Unlimited image generation",
      "Advanced JSONL formats",
      "Custom schema builder",
      "Priority support",
      "API access",
      "Batch processing",
      "Team collaboration"
    ],
    cta: "Upgrade to Pro",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: Crown,
    description: "For organizations with advanced needs",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Advanced security",
      "SSO/SAML",
      "Audit logs",
      "Custom training"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

const faqs = [
  {
    question: "Is the free plan really unlimited?",
    answer: "Yes! Our free plan has no limits on document uploads or JSONL generation. We believe in making AI education accessible to everyone."
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer: "Absolutely. You can switch between plans at any time. Upgrades take effect immediately, and downgrades apply at the next billing cycle."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual plans."
  },
  {
    question: "Is there a refund policy?",
    answer: "Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact support for a full refund."
  },
  {
    question: "Do you offer discounts for education?",
    answer: "Yes! Students and educators get 50% off Pro plans. Contact us with your institution email for verification."
  }
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>Pricing - Vector Mind AI | Free JSONL Generator & AI Study Tools</title>
        <meta name="description" content="Vector Mind AI pricing: Free forever plan with unlimited JSONL generation. Pro at $9/month for power users. Enterprise plans available. Start free today." />
        <meta name="keywords" content="vector mind pricing, free jsonl generator, ai study tools pricing, premium ai tools, enterprise ai, student pricing, free forever" />
        <meta property="og:title" content="Pricing - Vector Mind AI | Free & Premium Plans" />
        <meta property="og:description" content="Start free with unlimited JSONL generation. Upgrade to Pro for advanced features." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navbar1 />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              Pricing
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Simple,
              <span className="text-blue-600"> Transparent</span> Pricing
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Start free, upgrade when you need more. No hidden fees, no surprises.
              50,000+ users trust Vector Mind AI.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg ${
                  plan.popular ? 'ring-2 ring-blue-500 transform md:-translate-y-4' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <plan.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {plan.cta}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Compare Plans
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Free</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Document uploads", "Unlimited", "Unlimited", "Unlimited"],
                  ["JSONL generation", "Unlimited", "Unlimited", "Unlimited"],
                  ["AI Chat", "✓", "✓", "✓"],
                  ["Voice AI Tutor", "✓", "✓", "✓"],
                  ["Image Generation", "50/mo", "Unlimited", "Unlimited"],
                  ["Custom JSONL formats", "-", "✓", "✓"],
                  ["API Access", "-", "✓", "✓"],
                  ["Priority Support", "-", "✓", "✓"],
                  ["Custom Integrations", "-", "-", "✓"],
                  ["SSO/SAML", "-", "-", "✓"]
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{row[0]}</td>
                    <td className="py-4 px-4 text-center">{row[1]}</td>
                    <td className="py-4 px-4 text-center text-blue-600 font-medium">{row[2]}</td>
                    <td className="py-4 px-4 text-center">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.details
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
              >
                <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700">
                  {faq.question}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-gray-600 dark:text-gray-400">
                  {faq.answer}
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Start Free Today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            No credit card required. Unlimited usage forever.
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}