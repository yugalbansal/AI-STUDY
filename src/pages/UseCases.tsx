import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { GraduationCap, Code, BookOpen, Brain, Briefcase, Lightbulb, Users, Target } from 'lucide-react';

const useCases = [
  {
    icon: GraduationCap,
    title: "Students",
    description: "Perfect for exam preparation, homework help, and research",
    examples: [
      "Upload lecture slides and ask questions",
      "Generate study guides from textbooks",
      "Create practice quizzes from notes",
      "Get help with difficult concepts"
    ],
    color: "blue"
  },
  {
    icon: Code,
    title: "Developers & ML Engineers",
    description: "Build training datasets for AI models and fine-tuning",
    examples: [
      "Convert documents to JSONL format",
      "Create instruction-tuning datasets",
      "Build Q&A training pairs",
      "Prepare data for fine-tuning"
    ],
    color: "purple"
  },
  {
    icon: BookOpen,
    title: "Researchers",
    description: "Accelerate literature review and paper analysis",
    examples: [
      "Summarize academic papers instantly",
      "Extract key findings from PDFs",
      "Compare multiple research papers",
      "Generate literature review outlines"
    ],
    color: "green"
  },
  {
    icon: Briefcase,
    title: "Professionals",
    description: "Analyze business documents and reports efficiently",
    examples: [
      "Review contracts and legal documents",
      "Summarize meeting notes",
      "Extract insights from reports",
      "Create training materials"
    ],
    color: "orange"
  },
  {
    icon: Brain,
    title: "Educators",
    description: "Create engaging learning materials for students",
    examples: [
      "Generate quiz questions from content",
      "Create educational flashcards",
      "Develop interactive tutorials",
      "Build curriculum resources"
    ],
    color: "pink"
  },
  {
    icon: Lightbulb,
    title: "AI Enthusiasts",
    description: "Learn about AI by building real projects",
    examples: [
      "Experiment with dataset creation",
      "Learn prompt engineering",
      "Build custom AI assistants",
      "Explore LLM fine-tuning"
    ],
    color: "cyan"
  }
];

const successStories = [
  {
    quote: "Vector Mind AI helped me pass my medical exams. I uploaded my entire textbook and the AI explained complex concepts perfectly.",
    author: "Sarah K.",
    role: "Medical Student",
    avatar: "https://randomuser.me/api/portraits/women/21.jpg"
  },
  {
    quote: "I generated 10,000 training examples from my research papers in minutes. This would have taken weeks manually.",
    author: "Dr. James M.",
    role: "AI Researcher",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg"
  },
  {
    quote: "As a teacher, I create quiz questions for my students in seconds. It's like having a teaching assistant available 24/7.",
    author: "Maria L.",
    role: "High School Teacher",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg"
  }
];

export default function UseCases() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>Use Cases - Vector Mind AI | Students, Developers, Researchers</title>
        <meta name="description" content="Discover how students, developers, researchers, and professionals use Vector Mind AI. From exam preparation to AI training data generation - find your use case." />
        <meta name="keywords" content="vector mind use cases, ai for students, jsonl for developers, ai research tools, document analysis, study ai, training data generation use cases" />
        <meta property="og:title" content="Use Cases - Vector Mind AI" />
        <meta property="og:description" content="See how 50,000+ users leverage Vector Mind AI for studying, research, and AI development." />
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
              Use Cases
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Built for
              <span className="text-blue-600"> Everyone</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Whether you're a student preparing for exams, a developer building AI models,
              or a researcher analyzing papers - Vector Mind AI has you covered.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                  useCase.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900' :
                  useCase.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900' :
                  useCase.color === 'green' ? 'bg-green-100 dark:bg-green-900' :
                  useCase.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900' :
                  useCase.color === 'pink' ? 'bg-pink-100 dark:bg-pink-900' :
                  'bg-cyan-100 dark:bg-cyan-900'
                }`}>
                  <useCase.icon className={`w-7 h-7 ${
                    useCase.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    useCase.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    useCase.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    useCase.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                    useCase.color === 'pink' ? 'text-pink-600 dark:text-pink-400' :
                    'text-cyan-600 dark:text-cyan-400'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{useCase.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{useCase.description}</p>
                <ul className="space-y-2">
                  {useCase.examples.map((example, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {example}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: "50,000+", label: "Active Users" },
              { value: "1M+", label: "Documents Processed" },
              { value: "150+", label: "Countries" },
              { value: "10M+", label: "Datasets Generated" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-blue-100">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Success Stories
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              See how people are using Vector Mind AI
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {successStories.map((story, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={story.avatar}
                    alt={story.author}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{story.author}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{story.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 italic">"{story.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Stats */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted Across Industries
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              "Universities",
              "High Schools",
              "Research Labs",
              "Tech Companies",
              "Learning Centers",
              "Online Courses",
              "Libraries",
              "Training Teams"
            ].map((industry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
              >
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{industry}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Find Your Use Case
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of students, developers, and researchers already using Vector Mind AI
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Free Today
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}