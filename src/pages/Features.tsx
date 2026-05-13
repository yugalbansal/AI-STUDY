import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { FileJson, MessageSquare, Mic, Image, BookOpen, Brain, Zap, Shield, Database, Sparkles } from 'lucide-react';

const features = [
  {
    icon: FileJson,
    title: "JSONL Dataset Generator",
    description: "Convert PDFs, DOCX, PPTX, and more into JSONL format for AI model training. No coding required.",
    tags: ["Free", "Batch Processing", "High Quality"],
    color: "blue"
  },
  {
    icon: MessageSquare,
    title: "AI Document Chat",
    description: "Upload any document and chat with it instantly. Get answers, summaries, and insights in seconds.",
    tags: ["24/7 Available", "Multi-format", "Smart Answers"],
    color: "purple"
  },
  {
    icon: Mic,
    title: "Voice AI Tutor",
    description: "Have voice conversations with your study materials. Perfect for language learning and oral practice.",
    tags: ["Natural Voice", "Multiple Languages", "24/7"],
    color: "green"
  },
  {
    icon: Image,
    title: "AI Image Generation",
    description: "Create custom diagrams, illustrations, and visual aids for your studies. Turn concepts into visuals.",
    tags: ["DALL-E 3", "Unlimited", "Custom Styles"],
    color: "orange"
  },
  {
    icon: BookOpen,
    title: "Smart Note Taking",
    description: "AI-powered note organization and summarization. Automatically extract key points from lectures.",
    tags: ["Auto-Organize", "Searchable", "Export"],
    color: "pink"
  },
  {
    icon: Brain,
    title: "Personalized Learning",
    description: "Adaptive learning paths based on your progress. The more you use it, the smarter it gets.",
    tags: ["AI-Powered", "Custom Plans", "Progress Tracking"],
    color: "indigo"
  },
  {
    icon: Database,
    title: "Vector Search",
    description: "Semantic search across all your documents. Find exactly what you need using natural language.",
    tags: ["Semantic", "Fast", "Accurate"],
    color: "cyan"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Your data is encrypted and secure. We never use your documents for training our models.",
    tags: ["AES-256", "GDPR Compliant", "Private"],
    color: "emerald"
  },
];

const detailedFeatures = [
  {
    title: "Multi-Format Document Processing",
    description: "Upload PDFs, DOCX, PPTX, TXT, and more. Our AI extracts text, tables, and images with high accuracy.",
    items: [
      "PDF with complex layouts",
      "Word documents with formatting",
      "PowerPoint presentations",
      "Plain text files",
      "Scanned documents (OCR)"
    ]
  },
  {
    title: "Advanced JSONL Export Options",
    description: "Customize your JSONL output with various schemas and formats.",
    items: [
      "Chat format (prompt/completion)",
      "Instruction tuning format",
      "Conversational format",
      "Custom schema builder",
      "Batch export"
    ]
  },
  {
    title: "AI Study Modes",
    description: "Different learning modes for different needs.",
    items: [
      "Quiz generation",
      "Flashcard creation",
      "Concept explanation",
      "Practice problems",
      "Essay feedback"
    ]
  }
];

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>Features - Vector Mind AI | JSONL Generator & AI Study Tools</title>
        <meta name="description" content="Discover all features of Vector Mind AI: free JSONL dataset generator, AI document chat, voice tutor, image generation, and more. Perfect for students and developers." />
        <meta name="keywords" content="vector mind features, jsonl generator features, ai study tools, document chat, voice ai tutor, ai image generation, vector search, free ai tools features" />
        <meta property="og:title" content="Features - Vector Mind AI | Complete AI Study Platform" />
        <meta property="og:description" content="All the AI tools you need: JSONL generator, document chat, voice tutor, image generation. 100% free for students." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vector Mind AI Features" />
        <meta name="twitter:description" content="JSONL generator, AI chat, voice tutor & more. All free for students." />
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
              Features
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Everything You Need to
              <span className="text-blue-600"> Succeed</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Powerful AI tools designed specifically for students and developers.
              All features are free, no credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                  feature.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900' :
                  feature.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900' :
                  feature.color === 'green' ? 'bg-green-100 dark:bg-green-900' :
                  feature.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900' :
                  feature.color === 'pink' ? 'bg-pink-100 dark:bg-pink-900' :
                  feature.color === 'indigo' ? 'bg-indigo-100 dark:bg-indigo-900' :
                  feature.color === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-900' :
                  'bg-emerald-100 dark:bg-emerald-900'
                }`}>
                  <feature.icon className={`w-7 h-7 ${
                    feature.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    feature.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    feature.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    feature.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                    feature.color === 'pink' ? 'text-pink-600 dark:text-pink-400' :
                    feature.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                    feature.color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
                    'text-emerald-600 dark:text-emerald-400'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{feature.description}</p>
                <div className="flex flex-wrap gap-2">
                  {feature.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Features */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Deep Dive
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Learn more about our powerful capabilities
            </p>
          </div>
          <div className="space-y-12">
            {detailedFeatures.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{section.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{section.description}</p>
                <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Vector Mind AI?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Compare with other solutions in the market
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-3 gap-8 p-8">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-4">Other Tools</h3>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li>❌ Limited free tier</li>
                  <li>❌ Pay per document</li>
                  <li>❌ Basic JSONL export</li>
                  <li>❌ No voice features</li>
                  <li>❌ Single document only</li>
                </ul>
              </div>
              <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 -mt-8">
                <h3 className="text-lg font-bold text-blue-600 mb-4">Vector Mind AI</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li>✅ 100% Free forever</li>
                  <li>✅ Unlimited documents</li>
                  <li>✅ Advanced JSONL export</li>
                  <li>✅ Voice AI tutor</li>
                  <li>✅ Batch processing</li>
                </ul>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-4">Traditional</h3>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li>⏱️ Manual conversion</li>
                  <li>⏱️ Hours of work</li>
                  <li>⏱️ Error-prone</li>
                  <li>⏱️ No AI assistance</li>
                  <li>⏱️ Limited support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Start Using All Features Free
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            No credit card required. No limits. Just powerful AI tools for learning.
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Get Started Now
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}