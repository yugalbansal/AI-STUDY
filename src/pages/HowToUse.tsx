import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { BookOpen, Upload, MessageSquare, Download, Settings, HelpCircle, ChevronRight, CheckCircle, FileJson, MessageCircle, Mic, Image } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: "1. Upload Your Document",
    description: "Drag and drop PDF, DOCX, PPTX, or TXT files. Or paste text directly.",
    details: [
      "Maximum file size: 50MB per document",
      "Supports batch upload (up to 10 files)",
      "OCR for scanned PDFs",
      "Automatic text extraction"
    ]
  },
  {
    icon: MessageSquare,
    title: "2. Chat with Your Document",
    description: "Ask questions, get summaries, or extract specific information.",
    details: [
      "Natural language queries",
      "Context-aware responses",
      "Multi-document conversations",
      "Citation for all answers"
    ]
  },
  {
    icon: FileJson,
    title: "3. Generate JSONL Dataset",
    description: "Convert your document into JSONL format for AI training.",
    details: [
      "Multiple output formats",
      "Custom schema builder",
      "Batch export",
      "Preview before download"
    ]
  },
  {
    icon: Download,
    title: "4. Download & Use",
    description: "Get your formatted data and use it for AI model training.",
    details: [
      "Instant download",
      "Compatible with all ML frameworks",
      "Ready for fine-tuning",
      "100% free unlimited"
    ]
  }
];

const quickGuides = [
  {
    title: "Quick Start Guide",
    description: "Get up and running in 5 minutes",
    link: "#quick-start",
    icon: BookOpen
  },
  {
    title: "JSONL Format Guide",
    description: "Learn about JSONL and output formats",
    link: "#jsonl-guide",
    icon: FileJson
  },
  {
    title: "API Integration",
    description: "Use Vector Mind AI with your code",
    link: "#api-guide",
    icon: Settings
  },
  {
    title: "Troubleshooting",
    description: "Common issues and solutions",
    link: "#help",
    icon: HelpCircle
  }
];

export default function HowToUse() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>How to Use Vector Mind AI - Complete Guide</title>
        <meta name="description" content="Learn how to use Vector Mind AI: upload documents, chat with PDFs, generate JSONL datasets. Complete step-by-step guide with screenshots and examples." />
        <meta name="keywords" content="how to use vector mind ai, tutorial, getting started guide, jsonl generator tutorial, document chat tutorial, ai study tool guide, pdf to jsonl how to" />
        <meta property="og:title" content="How to Use Vector Mind AI - Complete Guide" />
        <meta property="og:description" content="Step-by-step tutorial: upload documents, chat with AI, generate JSONL datasets. Start in 5 minutes." />
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
              Documentation
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              How to Use
              <span className="text-blue-600"> Vector Mind AI</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              A complete guide to using our AI study platform. From uploading your first document
              to generating training datasets - we've got you covered.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickGuides.map((guide, index) => (
              <motion.a
                key={index}
                href={guide.link}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-center gap-3"
              >
                <guide.icon className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{guide.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{guide.description}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex flex-col md:flex-row gap-8 items-start"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Tutorial Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Video Tutorials</h2>
            <p className="text-gray-600 dark:text-gray-400">Watch these quick videos to learn faster</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Upload Your First Document", duration: "2:30" },
              { title: "Chat with PDF", duration: "3:15" },
              { title: "Generate JSONL Dataset", duration: "4:00" }
            ].map((video, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <PlayIcon />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">{video.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{video.duration}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Explore All Features</h2>
            <p className="text-gray-600 dark:text-gray-400">Everything Vector Mind AI can do for you</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: MessageCircle, title: "Document Chat", desc: "Ask questions and get instant answers from any document" },
              { icon: Mic, title: "Voice Conversations", desc: "Talk to your documents using natural voice commands" },
              { icon: FileJson, title: "JSONL Export", desc: "Convert documents to JSONL format for AI training" },
              { icon: Image, title: "Image Generation", desc: "Create visual aids and diagrams for your studies" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
              >
                <feature.icon className="w-10 h-10 text-blue-600 mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-16 bg-blue-50 dark:bg-gray-800">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Common Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Is Vector Mind AI really free?", a: "Yes! We offer a 100% free plan with unlimited documents and features." },
              { q: "What file formats are supported?", a: "PDF, DOCX, PPTX, TXT, and more. We also support scanned documents." },
              { q: "How is my data protected?", a: "We use enterprise-grade encryption and never use your documents for AI training." },
              { q: "Can I use this for commercial projects?", a: "Absolutely! Generated JSONL datasets are yours to use however you want." }
            ].map((faq, index) => (
              <motion.details
                key={index}
                className="bg-white dark:bg-gray-700 rounded-xl overflow-hidden"
              >
                <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                  {faq.q}
                  <ChevronRight className="w-5 h-5" />
                </summary>
                <div className="px-4 pb-4 text-gray-600 dark:text-gray-300">
                  {faq.a}
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
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 50,000+ students using Vector Mind AI
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start Free Now
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}