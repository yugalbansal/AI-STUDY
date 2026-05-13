import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown, MessageCircle, Mail, BookOpen, FileJson, Shield, Zap } from 'lucide-react';

const faqCategories = [
  {
    icon: Zap,
    title: "Getting Started",
    faqs: [
      {
        question: "How do I get started with Vector Mind AI?",
        answer: "Simply create a free account, upload your first document (PDF, DOCX, PPTX), and start chatting! No credit card required."
      },
      {
        question: "Is Vector Mind AI really free?",
        answer: "Yes! Our free plan includes unlimited document uploads, JSONL generation, AI chat, voice tutor, and 50 image generations per month. No hidden fees, no catches."
      },
      {
        question: "What documents can I upload?",
        answer: "We support PDF, DOCX, PPTX, TXT, and more. Our system also handles scanned documents using OCR technology."
      },
      {
        question: "How long does it take to process a document?",
        answer: "Most documents are processed within seconds. Large documents or batch uploads may take 1-2 minutes."
      }
    ]
  },
  {
    icon: FileJson,
    title: "JSONL & Data Generation",
    faqs: [
      {
        question: "What is JSONL format?",
        answer: "JSONL (JSON Lines) is a format where each line is a valid JSON object. It's widely used for training AI models because it's easy to process and stream."
      },
      {
        question: "What JSONL formats do you support?",
        answer: "We support chat format, instruction tuning format, conversational format, and custom schemas. You can customize the output to match your training pipeline."
      },
      {
        question: "Can I export in other formats?",
        answer: "Currently we export to JSONL. Contact us if you need CSV, JSON, or other formats."
      },
      {
        question: "Is there a limit on JSONL generation?",
        answer: "No limits on our free plan! Generate as many datasets as you need."
      }
    ]
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    faqs: [
      {
        question: "Is my data secure?",
        answer: "Absolutely. We use AES-256 encryption for all data in transit and at rest. Your documents are processed in isolated environments and never used to train our models."
      },
      {
        question: "Do you use my documents for AI training?",
        answer: "Never! Your documents are used only to provide you with answers and generate datasets. We don't include them in any training data."
      },
      {
        question: "Where is my data stored?",
        answer: "All data is stored in secure, SOC 2 compliant data centers. We comply with GDPR, CCPA, and other privacy regulations."
      },
      {
        question: "Can I delete my data?",
        answer: "Yes! You can delete any document or your entire account at any time. All data is permanently removed within 30 days."
      }
    ]
  },
  {
    icon: MessageCircle,
    title: "Support & Billing",
    faqs: [
      {
        question: "How do I get help if I have issues?",
        answer: "You can reach our support team via email (support@vectormind.site), live chat, or join our Discord community. We typically respond within 24 hours."
      },
      {
        question: "What happens if I exceed my free plan limits?",
        answer: "Nothing! There's no limit on document uploads, chat, or JSONL generation. Image generation has a 50/month limit on the free plan."
      },
      {
        question: "Can I upgrade to Pro?",
        answer: "Yes! Pro costs $9/month and gives you unlimited image generation, advanced JSONL formats, API access, and priority support."
      },
      {
        question: "Do you offer refunds?",
        answer: "We offer a 30-day money-back guarantee for Pro plans. Contact support if you're not satisfied."
      }
    ]
  }
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>FAQ - Vector Mind AI | Frequently Asked Questions</title>
        <meta name="description" content="Find answers to common questions about Vector Mind AI, JSONL generation, pricing, security, and getting started. Fast, free, and secure AI study tools." />
        <meta name="keywords" content="vector mind faq, frequently asked questions, ai study tools faq, jsonl generator faq, free ai chat faq, help center, support, troubleshooting" />
        <meta property="og:title" content="FAQ - Vector Mind AI" />
        <meta property="og:description" content="Get answers to all your questions about Vector Mind AI" />
        <meta property="og:type" content="website" />
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
              FAQ
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Frequently Asked
              <span className="text-blue-600"> Questions</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Everything you need to know about Vector Mind AI. Can't find an answer?
              Contact our support team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: "Getting Started Guide", link: "/how-to-use" },
              { icon: FileJson, label: "JSONL Documentation", link: "/blog" },
              { icon: Mail, label: "Contact Support", link: "/contact" },
              { icon: MessageCircle, label: "Community Forum", link: "#" }
            ].map((link, index) => (
              <a
                key={index}
                href={link.link}
                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-center gap-3"
              >
                <link.icon className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          {faqCategories.map((category, catIndex) => (
            <motion.div
              key={catIndex}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                  <category.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category.title}</h2>
              </div>
              <div className="space-y-4">
                {category.faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden group"
                  >
                    <summary className="p-5 cursor-pointer flex items-center justify-between font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
                      {faq.question}
                      <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-5 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Still Have Questions?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="/login"
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}