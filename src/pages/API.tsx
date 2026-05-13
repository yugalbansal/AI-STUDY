import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Code, Terminal, Database, Key, BookOpen, Zap, Shield, Globe } from 'lucide-react';

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/documents/upload",
    description: "Upload a document for processing",
    example: `{
  "file": "binary",
  "type": "pdf|docx|pptx",
  "options": {
    "extract_images": true,
    "ocr": true
  }
}`
  },
  {
    method: "POST",
    path: "/api/v1/chat",
    description: "Chat with your uploaded documents",
    example: `{
  "document_id": "doc_123",
  "message": "What is this document about?",
  "history": []
}`
  },
  {
    method: "POST",
    path: "/api/v1/jsonl/generate",
    description: "Generate JSONL dataset from documents",
    example: `{
  "document_ids": ["doc_123", "doc_456"],
  "format": "chat|instruction|conversational",
  "count": 1000
}`
  },
  {
    method: "GET",
    path: "/api/v1/documents",
    description: "List all uploaded documents",
    example: `{
  "limit": 20,
  "offset": 0
}`
  },
  {
    method: "DELETE",
    path: "/api/v1/documents/:id",
    description: "Delete a specific document",
    example: `{
  "id": "doc_123"
}`
  }
];

const features = [
  {
    icon: Globe,
    title: "RESTful API",
    description: "Modern REST API design with standard HTTP methods and response codes"
  },
  {
    icon: Zap,
    title: "Fast Response",
    description: "Optimized endpoints with sub-second response times for all operations"
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "All API requests require authentication. TLS encryption for all data in transit"
  },
  {
    icon: BookOpen,
    title: "Comprehensive Docs",
    description: "Detailed documentation with examples for every endpoint"
  }
];

export default function API() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>API Documentation - Vector Mind AI | Developer API for JSONL Generation</title>
        <meta name="description" content="Vector Mind AI API documentation for developers. Integrate document processing, AI chat, and JSONL generation into your applications. REST API with Python, Node.js SDKs." />
        <meta name="keywords" content="vector mind api, api documentation, jsonl api, document processing api, ai chat api, developer api, rest api, python api, nodejs api, api integration" />
        <meta property="og:title" content="API Documentation - Vector Mind AI" />
        <meta property="og:description" content="Complete API documentation for integrating Vector Mind AI into your applications" />
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
              API Documentation
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Build with
              <span className="text-blue-600"> Vector Mind AI</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Integrate our powerful AI features into your applications. Document processing,
              AI chat, and JSONL generation via a simple REST API.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Authentication</h2>
            <p className="text-gray-600 dark:text-gray-400">All API requests require authentication via API keys</p>
          </div>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-2xl p-6 font-mono text-sm overflow-x-auto">
            <p className="text-gray-400 mb-2"># Include in request header</p>
            <p className="text-green-400">Authorization: Bearer YOUR_API_KEY</p>
            <p className="text-gray-400 mt-4 mb-2"># Get your API key from dashboard settings</p>
            <p className="text-blue-400">API-Key: vm_live_xxxxxxxxxxxxx</p>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">API Endpoints</h2>
            <p className="text-gray-600 dark:text-gray-400">Complete reference of all available endpoints</p>
          </div>
          <div className="space-y-6">
            {endpoints.map((endpoint, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-gray-900 dark:text-white font-mono">{endpoint.path}</code>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-3">{endpoint.description}</p>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-900">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Example Request:</p>
                  <pre className="text-sm text-gray-800 dark:text-gray-300 font-mono overflow-x-auto">
                    {endpoint.example}
                  </pre>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SDKs */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Official SDKs</h2>
            <p className="text-gray-600 dark:text-gray-400">Quick integration with our official client libraries</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Python</h3>
              <code className="text-green-400 text-sm">pip install vectormind</code>
              <div className="mt-4">
                <pre className="text-gray-400 text-xs font-mono">from vectormind import Client
client = Client("YOUR_API_KEY")
doc = client.documents.upload("file.pdf")</pre>
              </div>
            </div>
            <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Node.js</h3>
              <code className="text-green-400 text-sm">npm install vectormind-sdk</code>
              <div className="mt-4">
                <pre className="text-gray-400 text-xs font-mono">import { VectorMind } from 'vectormind-sdk';
const client = new VectorMind('YOUR_API_KEY');
const doc = await client.documents.upload('file.pdf');</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rate Limits</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Free Tier</p>
                <p className="text-2xl font-bold text-blue-600">100 req/min</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Pro Tier</p>
                <p className="text-2xl font-bold text-blue-600">1000 req/min</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Enterprise</p>
                <p className="text-2xl font-bold text-blue-600">Unlimited</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Get Your API Key
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start building with Vector Mind AI today
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Get API Access
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}