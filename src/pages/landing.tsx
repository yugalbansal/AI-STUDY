import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Hero } from '../components/ui/animated-hero';
import { Navbar1 } from '../components/ui/navbar-1';
import { DatasetGenerationSteps } from '../components/ui/dataset-generation-steps';
import { FeaturesSection } from '../components/ui/features-section';
import { Features8 } from '../components/ui/features-8';
import { Features10 } from '../components/ui/features-10';
import { QuantumTimeline } from '../components/ui/premium-process-timeline';
import { FAQSection } from '../components/ui/faq-section';
import { Footer } from '../components/ui/footer';
import { motion } from "framer-motion";
import { BookOpen, Zap, Shield, Users } from 'lucide-react';
import { TubesBackground } from '../components/ui/neon-flow';

export default function Landing() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const handleKnowMore = () => {
    // Scroll to features section
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSignUp = () => {
    // If already signed in, go to dashboard
    if (isSignedIn) {
      navigate('/dashboard');
    } else {
      // Otherwise go to login page
      navigate('/login');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 overflow-x-hidden">
      <Helmet>
        {/* Primary Meta Tags - Optimized for Dataset Generation & AI Study Keywords */}
        <title>Vector Mind AI: Free JSONL Dataset Generator + AI Study Tools</title>
        <meta name="description" content="Generate JSONL training datasets from PDFs instantly. Free AI study assistant with document chat, voice tutor, and dataset creation. No signup required." />
        <meta name="keywords" content="free jsonl generator, pdf to jsonl converter, create training datasets online, ai fine tuning data generator, jsonl dataset maker, machine learning dataset creator, llm training data free, document to jsonl, generate datasets from pdf, free ai study assistant, ai document chat, vector search learning, ai homework helper, intelligent tutoring system" />
        
        {/* Open Graph / Facebook - Enhanced for Dataset Generation & Learning */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vectormind.site/" />
        <meta property="og:title" content="Vector Mind AI: Free JSONL Dataset Generator + AI Study Tools" />
        <meta property="og:description" content="Generate JSONL training datasets from PDFs instantly. Free AI study assistant with document chat, voice tutor, and dataset creation. No signup required." />
        <meta property="og:image" content="https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Vector Mind AI - Smart Study Assistant Platform" />
        <meta property="og:site_name" content="Vector Mind AI" />
        
        {/* Twitter Card - Enhanced */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@VectorMindAI" />
        <meta name="twitter:creator" content="@VectorMindAI" />
        <meta name="twitter:title" content="Vector Mind AI - Free AI Study Assistant for Students" />
        <meta name="twitter:description" content="AI-powered study tool with document analysis, intelligent chat, voice tutoring & image generation. Trusted by 10K+ students. Free forever! 🚀" />
        <meta name="twitter:image" content="https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.png" />
        <meta name="twitter:image:alt" content="Vector Mind AI Logo - Smart Study Assistant" />
        
        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Vector Mind AI",
            "alternateName": "VectorMind Study Assistant & Dataset Generator",
            "description": "Vector Mind AI: Generate JSONL training datasets from PDF, DOCX, PPTX documents for FREE. Plus AI-powered study assistant with document analysis, intelligent chat, voice tutoring, and image generation for students and AI developers",
            "url": "https://vectormind.site/",
            "applicationCategory": "EducationalApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "1247",
              "bestRating": "5"
            },
            "featureList": [
              "Generate JSONL Datasets from Documents",
              "AI Training Data Creator",
              "Dataset Generator for Fine-tuning",
              "AI-Powered Document Analysis",
              "Intelligent Chat Tutoring",
              "Voice AI Conversations",
              "Image Generation",
              "Vector Search Technology",
              "Personalized Learning Paths"
            ]
          })}
        </script>
        
        {/* Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Vector Mind AI",
            "url": "https://vectormind.site/",
            "logo": "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.png",
            "description": "AI-powered educational technology platform helping students learn smarter with advanced AI tools",
            "sameAs": [
              "https://twitter.com/VectorMindAI",
              "https://linkedin.com/company/vectormind-ai"
            ]
          })}
        </script>
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://vectormind.site/" />
        
        {/* Additional SEO tags */}
        <meta name="author" content="Vector Mind AI" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="alternate" hrefLang="en" href="https://vectormind.site/" />
      </Helmet>

      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-gray-50 dark:from-zinc-900 to-transparent">
        <Navbar1 onGetStarted={handleSignUp} />
      </div>
      {/* <TubesBackground /> */}
      {/* Hero Section with Animated Component */}
      <section id="home" className="relative pt-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-transparent to-blue-100/30 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Hero onKnowMore={handleKnowMore} onSignUp={handleSignUp} />
        </div>
      </section>

      {/* Dataset Generation Steps - NEW FEATURE */}
      <DatasetGenerationSteps />

      {/* How AI Study Works Section Header */}
      <div className="py-12 px-4 bg-white dark:bg-zinc-900 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
        >
          How AI Study Works
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
        >
          Discover how Vector Mind AI's advanced 3-layer RAG architecture processes your documents and delivers precise answers
        </motion.p>
      </div>

      {/* How It Works Timeline - AI Study Features */}
      <section id="how-it-works" className="py-16 md:py-20 px-4 bg-gradient-to-b from-white via-gray-50 to-white dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
        <QuantumTimeline />
      </section>

      {/* Features Section - New Component */}
      <section id="features">
        <FeaturesSection />
      </section>

      {/* Additional Features Section */}
      <Features8 />

      {/* Advanced Features Section */}
      <Features10 />

      {/* FAQ Section with Schema Markup */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}