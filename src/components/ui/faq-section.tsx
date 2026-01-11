import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is Vector Mind AI and how does it help students study?",
    answer: "Vector Mind AI is a free, comprehensive AI-powered study assistant designed specifically for students. It combines advanced vector search technology with intelligent tutoring to help you learn more effectively. Upload your study materials (PDFs, Word docs), chat with an AI tutor for instant explanations, practice with voice conversations, and even generate visual aids. Our platform uses semantic understanding to provide personalized learning support 24/7."
  },
  {
    question: "How does the AI document analysis feature work?",
    answer: "Our AI document analysis uses advanced vector embeddings and semantic search to understand your documents deeply. Simply upload any study material (textbooks, lecture notes, research papers) and our AI instantly indexes the content. You can then ask natural language questions, and the AI will search through your documents to provide accurate, contextual answers with citations. It's like having a personal tutor who has read and memorized all your study materials!"
  },
  {
    question: "Is Vector Mind AI really free? Are there any hidden costs?",
    answer: "Yes, Vector Mind AI is completely free! There are no hidden fees, premium tiers, or usage limits. We believe quality education should be accessible to everyone. All features including AI chat, document analysis, voice conversations, and image generation are 100% free forever. Our mission is to help students succeed, not to profit from education."
  },
  {
    question: "What makes Vector Mind AI different from ChatGPT or other AI tools?",
    answer: "Unlike general-purpose AI chatbots, Vector Mind AI is specifically designed for learning and studying. Our key advantages include: (1) Vector search technology that remembers and searches through YOUR uploaded documents, (2) Persistent chat history for continuous learning, (3) Voice AI tutoring for interactive practice, (4) Document analysis optimized for academic materials, and (5) A student-focused interface designed for study workflows. We're not just an AI chat - we're a complete learning ecosystem."
  },
  {
    question: "Can I use Vector Mind AI for exam preparation and homework help?",
    answer: "Absolutely! Vector Mind AI is perfect for exam preparation and homework assistance. Upload your course materials, textbooks, or class notes, then quiz yourself with the AI tutor. Ask practice questions, get concept explanations, create study summaries, and even generate visual diagrams. The AI adapts to your learning style and can explain concepts in multiple ways until you understand. Many students use it for last-minute exam reviews, essay brainstorming, and solving complex problems step-by-step."
  },
  {
    question: "How secure is my study data? Is my information private?",
    answer: "Your privacy and data security are our top priorities. All your documents, chat history, and personal information are encrypted and stored securely. We never sell your data to third parties or use it for advertising. Your uploaded study materials are private to your account only. We comply with GDPR and industry-standard security practices. You can delete your data anytime from your account settings."
  },
  {
    question: "What file formats can I upload for document analysis?",
    answer: "Vector Mind AI supports all common document formats including PDF, Microsoft Word (.doc, .docx), plain text (.txt), and more. You can upload lecture slides, textbooks, research papers, class notes, and study guides. Each document is processed using advanced AI to extract and index the content for intelligent search and question-answering."
  },
  {
    question: "How does the voice AI tutor work? Do I need special equipment?",
    answer: "The voice AI tutor allows you to have natural spoken conversations with your AI assistant - perfect for practicing presentations, learning pronunciation, or hands-free studying. You don't need any special equipment! Just use your computer or phone's built-in microphone. Speak naturally, ask questions out loud, and the AI will respond with voice. It's like having a study partner available 24/7."
  },
  {
    question: "Can Vector Mind AI help with multiple subjects and topics?",
    answer: "Yes! Vector Mind AI is subject-agnostic and can help with virtually any topic - mathematics, science, history, literature, programming, languages, business, and more. Our AI is trained on diverse knowledge and uses your uploaded materials to provide subject-specific assistance. Whether you're studying calculus, Shakespeare, chemistry, or Spanish, Vector Mind adapts to your needs."
  },
  {
    question: "How accurate is the AI? Can I trust the answers for my studies?",
    answer: "Vector Mind AI uses state-of-the-art language models (Gemini) known for accuracy and reliability. When answering from your uploaded documents, it provides citations so you can verify. However, like any AI tool, it's designed to ASSIST your learning, not replace critical thinking. We recommend cross-referencing important information with your course materials and instructors. The AI is excellent for explanations, study help, and understanding concepts, but always verify critical facts for exams and assignments."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Generate FAQ Schema for rich snippets in search results
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section id="faq" className="py-20 px-4 bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-zinc-900 dark:via-blue-950/20 dark:to-zinc-900">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            Frequently Asked Questions
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Know
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Common questions about Vector Mind AI's features, pricing, and how our AI study assistant can help you succeed
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-zinc-700 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  {faq.question}
                </h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    id={`faq-answer-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-gray-700 dark:text-gray-300 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* CTA Below FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Still have questions? We're here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Get Started Free
            </a>
            <a
              href="mailto:support@vectormind.site"
              className="px-8 py-3 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold rounded-lg border-2 border-gray-300 dark:border-zinc-600 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300"
            >
              Contact Support
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
