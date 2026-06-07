import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Clock, Calendar, ArrowRight, Search, BookOpen, FileJson, Brain, Zap, Lightbulb, TrendingUp } from 'lucide-react';

const blogPosts = [
  {
    id: 10,
    slug: "supercharging-study-sessions-thinking-ai",
    title: "Supercharging Study Sessions with Advanced Thinking Models",
    excerpt: "Learn how Vector Mind utilizes advanced thinking models to render live, collapsible reasoning traces—giving you a premium learning experience.",
    category: "AI Education",
    categoryIcon: Brain,
    date: "2026-06-07",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
    featured: true,
    tags: ["thinking model", "reasoning trace", "vector mind", "ai education"]
  },
  {
    id: 9,
    slug: "vectormind-puter-js-zero-cost-edge-ai",
    title: "How Vector Mind Integrates Puter.js for Zero-Cost, Edge-Side AI",
    excerpt: "Discover how Vector Mind utilizes Puter.js to deliver fast, secure, and completely free AI completions directly from the client side without API keys or token limits.",
    category: "Technical Guide",
    categoryIcon: FileJson,
    date: "2026-06-07",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
    featured: true,
    tags: ["puter.js", "client-side ai", "zero cost completed", "edge ai completed", "vector mind"]
  },
  {
    id: 1,
    slug: "complete-guide-pdf-to-jsonl-conversion",
    title: "Complete Guide to PDF to JSONL Conversion for AI Training",
    excerpt: "Learn how to transform PDF documents into high-quality JSONL datasets for training large language models. Step-by-step tutorial with best practices.",
    category: "Technical Guide",
    categoryIcon: FileJson,
    date: "2026-05-13",
    readTime: "15 min read",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80",
    featured: true,
    tags: ["pdf to jsonl", "jsonl converter", "ai training data", "dataset creation"]
  },
  {
    id: 2,
    slug: "jsonl-format-complete-tutorial-2026",
    title: "JSONL Format: Complete Tutorial for AI Model Training in 2026",
    excerpt: "Master JSONL format for AI training. Learn about different schemas, best practices, and how to create high-quality training datasets.",
    category: "Tutorial",
    categoryIcon: Brain,
    date: "2026-05-12",
    readTime: "12 min read",
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80",
    featured: true,
    tags: ["jsonl format", "json lines", "ai training", "llm", "data format"]
  },
  {
    id: 3,
    slug: "ai-study-tools-ace-exams",
    title: "How to Use AI Study Tools to Ace Your Exams in 2026",
    excerpt: "Discover the best AI-powered study tools and techniques to improve your exam preparation. From document analysis to practice tests.",
    category: "Study Tips",
    categoryIcon: Zap,
    date: "2026-05-11",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
    featured: true,
    tags: ["ai study tools", "exam preparation", "study tips", "ai tutoring"]
  },
  {
    id: 4,
    slug: "free-jsonl-generator-online",
    title: "Best Free JSONL Generator Online in 2026 - Complete Comparison",
    excerpt: "Compare the top free JSONL generators available online. Find the best tool for converting documents to AI training data without spending a dime.",
    category: "Tools Review",
    categoryIcon: Lightbulb,
    date: "2026-05-10",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    featured: false,
    tags: ["free jsonl generator", "jsonl converter free", "ai dataset generator"]
  },
  {
    id: 5,
    slug: "document-chat-ai-explained",
    title: "Document Chat with AI Explained: The Future of Reading",
    excerpt: "Learn how AI-powered document chat works and how it revolutionizes how we read, analyze, and extract information from documents.",
    category: "AI Education",
    categoryIcon: BookOpen,
    date: "2026-05-09",
    readTime: "9 min read",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad9ed?w=800&q=80",
    featured: false,
    tags: ["document chat", "ai chat", "pdf chat", "document analysis"]
  },
  {
    id: 6,
    slug: "llm-fine-tuning-beginners-guide",
    title: "LLM Fine-Tuning for Beginners: Complete Start Guide 2026",
    excerpt: "Everything you need to know about fine-tuning large language models. From preparing data to training your first model.",
    category: "Machine Learning",
    categoryIcon: TrendingUp,
    date: "2026-05-08",
    readTime: "14 min read",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad9ed?w=800&q=80",
    featured: false,
    tags: ["llm fine-tuning", "fine-tuning guide", "language model", "ai training"]
  },
  {
    id: 7,
    slug: "ai-education-future-2026",
    title: "The Future of AI in Education: Trends and Predictions for 2026",
    excerpt: "Explore the latest trends in AI-powered education. From personalized learning to AI tutors, discover what's shaping the future of education.",
    category: "AI Education",
    categoryIcon: Brain,
    date: "2026-05-07",
    readTime: "11 min read",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    featured: false,
    tags: ["ai education", "future of education", "ai trends", "personalized learning"]
  },
  {
    id: 8,
    slug: "batch-jsonl-generation-guide",
    title: "How to Generate JSONL Datasets in Batch: Scalable AI Training",
    excerpt: "Learn efficient methods for generating large-scale JSONL datasets. Save time and resources with batch processing techniques.",
    category: "Technical Guide",
    categoryIcon: Zap,
    date: "2026-05-06",
    readTime: "13 min read",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    featured: false,
    tags: ["batch jsonl", "dataset generation", "ai training data", "batch processing"]
  }
];

const categories = [
  { name: "All", count: 10, icon: BookOpen },
  { name: "Technical Guide", count: 3, icon: FileJson },
  { name: "Tutorial", count: 1, icon: Brain },
  { name: "Study Tips", count: 1, icon: Zap },
  { name: "Tools Review", count: 1, icon: Lightbulb },
  { name: "AI Education", count: 3, icon: BookOpen },
  { name: "Machine Learning", count: 1, icon: TrendingUp },
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>Blog - Vector Mind AI | Latest Articles on JSONL, AI & Machine Learning</title>
        <meta name="description" content="Read the latest articles on JSONL format, PDF to JSONL conversion, AI study tools, LLM fine-tuning, and machine learning. Expert guides from Vector Mind AI." />
        <meta name="keywords" content="vector mind blog, jsonl blog, ai education blog, machine learning articles, pdf to jsonl tutorial, llm fine-tuning guide, ai study tips, jsonl generator, document chat ai, free ai tools" />
        <meta property="og:title" content="Blog - Vector Mind AI | JSONL, AI & Education" />
        <meta property="og:description" content="Expert articles on JSONL generation, AI study tools, and machine learning. Free guides and tutorials." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vector Mind AI Blog" />
        <meta name="twitter:description" content="Latest articles on AI education, JSONL, and machine learning." />
        <link rel="canonical" href="https://vectormind.site/blog" />
      </Helmet>

      <Navbar1 />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              📝 Vector Mind AI Blog
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Latest Insights on
              <span className="text-blue-600"> AI & JSONL</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Expert articles, tutorials, and guides on JSONL format, AI study tools, machine learning,
              and the future of education. Written by AI experts at Vector Mind AI.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles, topics, keywords..."
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 px-4 bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category, index) => (
              <Link
                key={index}
                to="#"
                className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                  index === 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900'
                }`}
              >
                <category.icon className="w-4 h-4" />
                {category.name}
                <span className={`text-xs px-2 py-0.5 rounded-full ${index === 0 ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  {category.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">⭐ Featured</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Editor's Picks</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.filter(p => p.featured).map((post, index) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                      <post.categoryIcon className="w-3 h-3" />
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      {post.date}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <Clock className="w-4 h-4" />
                      {post.readTime}
                    </div>
                  </div>
                </div>
              </motion.article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      <section className="py-16 px-4 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Latest Articles</h2>
            <span className="text-blue-600 font-medium flex items-center gap-1 cursor-pointer hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {blogPosts.filter(p => !p.featured).map((post, index) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <span className="text-xs text-blue-600 font-medium">{post.category}</span>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{post.date}</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </motion.article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Tags */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Popular Topics</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["JSONL Format", "PDF to JSONL", "AI Training Data", "LLM Fine-tuning", "Document Chat", "AI Study Tools", "Machine Learning", "Python", "Dataset Creation", "AI Education"].map((tag, index) => (
              <Link
                key={index}
                to={`/blog?tag=${tag.toLowerCase().replace(/ /g, '-')}`}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 transition-colors text-sm"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Stay Updated with AI Trends
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest articles on JSONL, AI education, and machine learning delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Subscribe
            </button>
          </div>
          <p className="text-blue-200 text-sm mt-4">Join 10,000+ readers. No spam, unsubscribe anytime.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}