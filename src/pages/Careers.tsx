import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Briefcase, Code, Brain, Search, Mail, MapPin, Clock, Send, ChevronRight } from 'lucide-react';

const jobOpenings = [
  {
    title: "Frontend Developer",
    type: "Full-time",
    location: "Remote",
    description: "Build beautiful, performant user interfaces for our AI education platform using React, TypeScript, and modern web technologies.",
    requirements: [
      "Proficiency in React, TypeScript, and Tailwind CSS",
      "Experience with state management (Zustand/Redux)",
      "Understanding of responsive design and accessibility",
      "Experience with animations (Framer Motion preferred)"
    ],
    color: "blue"
  },
  {
    title: "AI Developer",
    type: "Full-time",
    location: "Remote",
    description: "Work on cutting-edge AI features including document processing, natural language understanding, and machine learning pipelines.",
    requirements: [
      "Strong Python skills with experience in ML frameworks",
      "Knowledge of LLM APIs and prompt engineering",
      "Experience with vector databases and embeddings",
      "Understanding of RAG architectures"
    ],
    color: "purple"
  },
  {
    title: "SEO Specialist",
    type: "Part-time / Contract",
    location: "Remote",
    description: "Help improve our search rankings, drive organic traffic, and build our content strategy for global visibility.",
    requirements: [
      "Proven SEO experience with measurable results",
      "Knowledge of technical SEO and site optimization",
      "Content strategy and keyword research skills",
      "Experience with analytics tools (GA, Search Console)"
    ],
    color: "green"
  },
  {
    title: "Backend Engineer",
    type: "Full-time",
    location: "Remote",
    description: "Build scalable APIs and services to power our AI features, document processing, and user management systems.",
    requirements: [
      "Experience with Node.js, Python, or Go",
      "Knowledge of PostgreSQL and database design",
      "Experience with cloud services (AWS/Vercel)",
      "Understanding of API design and security"
    ],
    color: "orange"
  },
  {
    title: "UI/UX Designer",
    type: "Contract",
    location: "Remote",
    description: "Design intuitive and beautiful user experiences for our platform. Transform complex AI features into simple, accessible interfaces.",
    requirements: [
      "Strong portfolio showcasing web/mobile designs",
      "Proficiency in Figma or similar tools",
      "Understanding of design systems",
      "Experience with user research and testing"
    ],
    color: "pink"
  },
  {
    title: "Technical Writer",
    type: "Part-time",
    location: "Remote",
    description: "Create clear, helpful documentation and tutorials to help users get the most out of Vector Mind AI.",
    requirements: [
      "Excellent written communication in English",
      "Ability to explain technical concepts simply",
      "Experience writing developer docs or tutorials",
      "Basic understanding of JSONL/AI concepts is a plus"
    ],
    color: "cyan"
  }
];

const benefits = [
  { icon: Clock, title: "Flexible Hours", description: "Work when you're most productive" },
  { icon: MapPin, title: "Remote First", description: "Work from anywhere in the world" },
  { icon: Brain, title: "Learn & Grow", description: "Work with cutting-edge AI technology" },
  { icon: Briefcase, title: "Impact Work", description: "Shape the future of AI education" }
];

export default function Careers() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>Careers - Join Vector Mind AI | Work with Cutting-Edge AI Technology</title>
        <meta name="description" content="Join Vector Mind AI team! We're hiring Frontend Developers, AI Engineers, SEO Specialists, and more. Remote work, flexible hours, and the chance to shape the future of AI education." />
        <meta name="keywords" content="vector mind careers, jobs, hiring, frontend developer jobs, ai developer jobs, remote jobs, work from home, seo specialist jobs, tech careers, ai education jobs" />
        <meta property="og:title" content="Careers - Join Vector Mind AI" />
        <meta property="og:description" content="Build the future of AI education. Join our remote team of innovators." />
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
              We're Hiring!
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Join Our
              <span className="text-blue-600"> Mission</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Help us revolutionize AI education. We're looking for passionate individuals
              to build the future of accessible AI learning tools.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Work With Us?</h2>
            <p className="text-gray-600 dark:text-gray-400">We offer flexibility, growth, and the chance to make an impact</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Open Positions</h2>
            <p className="text-gray-600 dark:text-gray-400">Find your perfect role and help shape the future of AI education</p>
          </div>
          <div className="space-y-6">
            {jobOpenings.map((job, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                        job.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                        job.color === 'green' ? 'bg-green-100 text-green-700' :
                        job.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        job.color === 'pink' ? 'bg-pink-100 text-pink-700' :
                        'bg-cyan-100 text-cyan-700'
                      }`}>
                        {job.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-3">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{job.description}</p>
                    <ul className="space-y-2">
                      {job.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <ChevronRight className="w-4 h-4 text-blue-500" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="md:text-right">
                    <a
                      href="mailto:yugal@yugalbansal.in?subject=Application for {job.title}"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      Apply Now
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">How to Apply</h2>
            <p className="text-blue-100 mb-6">
              Send your resume and a brief introduction to our founder directly.
              We're excited to hear about your experience and vision!
            </p>
            <a
              href="mailto:yugal@yugalbansal.in?subject=Career Application - Vector Mind AI"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Send className="w-5 h-5" />
              Send Application
            </a>
            <p className="text-blue-100 mt-4 text-sm">Email: yugal@yugalbansal.in</p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Values</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Innovation", desc: "We push boundaries and embrace new ideas" },
              { title: "Impact", desc: "Every line of code helps students worldwide" },
              { title: "Growth", desc: "Continuous learning and improvement for all" }
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{value.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}