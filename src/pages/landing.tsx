import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Hero } from '../components/ui/animated-hero';
import { Navbar1 } from '../components/ui/navbar-1';
import { FeaturesSection } from '../components/ui/features-section';
import { Features8 } from '../components/ui/features-8';
import { Features10 } from '../components/ui/features-10';
import { QuantumTimeline } from '../components/ui/premium-process-timeline';
import { Footer } from '../components/ui/footer';
import { motion } from "framer-motion";
import { BookOpen, Zap, Shield, Users } from 'lucide-react';

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
        {/* Primary Meta Tags */}
        <title>Vector Mind AI - Your AI-Powered Learning Assistant | Free AI Tutor</title>
        <meta name="description" content="Vector Mind AI is a free AI-powered platform for students. Get instant answers, upload documents for analysis, generate images, and have voice conversations with your AI tutor." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vectormind.site/" />
        <meta property="og:title" content="Vector Mind AI - Your AI-Powered Learning Assistant" />
        <meta property="og:description" content="Free AI tutor platform with chat, document analysis, voice conversations, and image generation for students." />
        <meta property="og:image" content="https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vector Mind AI - Your AI-Powered Learning Assistant" />
        <meta name="twitter:description" content="Free AI tutor with chat, docs, voice & image generation." />
        <meta name="twitter:image" content="https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.png" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://vectormind.site/" />
      </Helmet>

      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-gray-50 dark:from-zinc-900 to-transparent">
        <Navbar1 onGetStarted={handleSignUp} />
      </div>

      {/* Hero Section with Animated Component */}
      <section id="home" className="relative pt-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-transparent to-blue-100/30 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Hero onKnowMore={handleKnowMore} onSignUp={handleSignUp} />
        </div>
      </section>

      {/* How It Works Timeline */}
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

      {/* Footer */}
      <Footer />
    </div>
  );
}