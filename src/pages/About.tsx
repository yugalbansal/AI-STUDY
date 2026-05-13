import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Users, Target, Zap, Award, Globe, Heart } from 'lucide-react';

const stats = [
  { value: "50,000+", label: "Active Users" },
  { value: "1M+", label: "Documents Processed" },
  { value: "10M+", label: "JSONL Datasets Generated" },
  { value: "150+", label: "Countries" },
];

const team = [
  {
    name: "Yugal Bansal",
    role: "Founder & Lead Developer",
    bio: "Passionate BTech CSE student building AI-powered education tools. Building the future of accessible AI education.",
    avatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo"
  },
];

const values = [
  {
    icon: Heart,
    title: "Student-First",
    description: "Every feature we build starts with understanding student needs. We prioritize accessibility and ease of use."
  },
  {
    icon: Zap,
    title: "Innovation",
    description: "We're constantly pushing boundaries in AI education, adding new features that make learning faster and more effective."
  },
  {
    icon: Globe,
    title: "Global Impact",
    description: "We believe AI education should be available to everyone, everywhere, regardless of background or resources."
  },
  {
    icon: Award,
    title: "Excellence",
    description: "We maintain the highest standards in data privacy, security, and platform reliability."
  }
];

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>About Vector Mind AI - Democratizing AI Education</title>
        <meta name="description" content="Learn about Vector Mind AI's mission to make AI education accessible to everyone. Join 50,000+ students worldwide using our free JSONL generator and AI study tools." />
        <meta name="keywords" content="about vector mind ai, ai education company, democratize ai learning, free ai tools for students, jsonl generator about us" />
        <meta property="og:title" content="About Vector Mind AI - Democratizing AI Education" />
        <meta property="og:description" content="Our mission is to make AI education accessible to everyone. Learn how we're helping students worldwide." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Vector Mind AI" />
        <meta name="twitter:description" content="Join 50,000+ students using Vector Mind AI for free JSONL generation and AI study assistance." />
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
              Our Story
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Empowering Students with
              <span className="text-blue-600"> AI Education</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Vector Mind AI was born from a simple idea: everyone deserves access to powerful AI tools for learning.
              What started as a JSONL dataset generator has grown into a comprehensive AI study platform serving
              students in 150+ countries.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4">
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
                <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                We believe that the future of education lies in AI-powered personalized learning.
                Our platform gives students and developers free access to tools that were previously
                available only to large corporations and research institutions.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Whether you're a student preparing for exams, a researcher building training datasets,
                or a developer fine-tuning AI models, Vector Mind AI provides the tools you need to succeed.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8"
            >
              <Target className="w-16 h-16 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                By 2027, we aim to help
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  500,000+ students worldwide
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  10M+ documents processed
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  100+ educational institutions
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Values
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              These principles guide everything we do at Vector Mind AI
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{value.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Passionate experts dedicated to transforming AI education
            </p>
          </div>
          <div className="max-w-md mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-blue-500"
                />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 dark:text-gray-400">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Join Our Community
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start using Vector Mind AI today and be part of the education revolution
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