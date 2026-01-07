import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Hero } from '../components/ui/animated-hero';
import { Navbar1 } from '../components/ui/navbar-1';
import { motion } from "framer-motion";
import { BookOpen, MessageSquare, FileText, Mic, Sparkles, Zap, Shield, Users } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const handleKnowMore = () => {
    // Scroll to features section
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSignUp = () => {
    navigate('/login');
  };

  const features = [
    {
      icon: MessageSquare,
      title: "AI Chat Assistant",
      description: "Get instant answers and explanations with our intelligent AI tutor powered by cutting-edge language models."
    },
    {
      icon: Mic,
      title: "Voice Conversations",
      description: "Have natural voice conversations with your AI tutor for a more interactive learning experience."
    },
    {
      icon: FileText,
      title: "Document Analysis",
      description: "Upload and analyze documents, PDFs, and study materials with AI-powered insights and summaries."
    },
    {
      icon: Sparkles,
      title: "Image Generation",
      description: "Create custom educational visuals and diagrams to enhance your understanding of complex topics."
    }
  ];

  const stats = [
    { value: "10K+", label: "Active Learners" },
    { value: "95%", label: "Success Rate" },
    { value: "24/7", label: "AI Support" },
    { value: "50+", label: "Subjects Covered" }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get instant responses and quick document processing for seamless learning."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and protected with enterprise-grade security."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Join thousands of students achieving their academic goals together."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-x-hidden">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>Study AI - Your AI-Powered Learning Assistant | Free AI Tutor</title>
        <meta name="description" content="Study AI is a free AI-powered platform for students. Get instant answers, upload documents for analysis, generate images, and have voice conversations with your AI tutor." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yugal.site/" />
        <meta property="og:title" content="Study AI - Your AI-Powered Learning Assistant" />
        <meta property="og:description" content="Free AI tutor platform with chat, document analysis, voice conversations, and image generation for students." />
        <meta property="og:image" content="https://yugal.site/og-image.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Study AI - Your AI-Powered Learning Assistant" />
        <meta name="twitter:description" content="Free AI tutor with chat, docs, voice & image generation." />
        <meta name="twitter:image" content="https://yugal.site/og-image.png" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://yugal.site/" />
      </Helmet>

      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-gray-50 to-transparent">
        <Navbar1 onGetStarted={handleSignUp} />
      </div>

      {/* Hero Section with Animated Component */}
      <section className="relative pt-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/30 via-transparent to-purple-100/30 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Hero onKnowMore={handleKnowMore} onSignUp={handleSignUp} />
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 px-4 bg-white/50">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Learning
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Everything you need to excel in your studies, powered by advanced AI technology
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-white backdrop-blur-sm rounded-xl p-6 border-2 border-gray-200 hover:border-indigo-400 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <feature.icon className="relative w-12 h-12 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="relative text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="relative text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose AI Study Platform?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Built with students in mind, designed for success
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-indigo-200 mb-4">
                  <benefit.icon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-center overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
            <div className="relative z-10">
              <BookOpen className="w-16 h-16 text-white/90 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of students already using AI to achieve their academic goals
              </p>
              <button
                onClick={handleSignUp}
                className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 min-h-[44px]"
              >
                Get Started for Free
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-gray-200 bg-white">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-gray-600"
          >
            <p className="mb-2">
              Created with <span className="text-red-500">❤️</span> by Yugal
            </p>
            <p className="text-sm text-gray-500">
              © 2025 AI Study Platform. All rights reserved.
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}