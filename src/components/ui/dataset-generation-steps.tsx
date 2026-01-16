"use client";

import { motion } from 'framer-motion';
import { UserPlus, Upload, Database, Download } from 'lucide-react';

export const DatasetGenerationSteps = () => {
  const steps = [
    {
      number: "01",
      icon: UserPlus,
      title: "Create Account",
      description: "Sign up for free in 30 seconds",
      details: ["No credit card required", "Instant access", "100% free forever"],
      gradient: "from-blue-500 to-blue-600"
    },
    {
      number: "02",
      icon: Upload,
      title: "Upload Documents",
      description: "Upload PDF, DOCX, PPTX & more",
      details: ["Drag & drop files", "Multiple formats", "Auto processing"],
      gradient: "from-purple-500 to-purple-600"
    },
    {
      number: "03",
      icon: Database,
      title: "Generate Dataset",
      description: "Go to Documents → Click Generate",
      details: ["One-click generation", "JSONL format", "AI-optimized Q&A pairs"],
      gradient: "from-green-500 to-green-600"
    },
    {
      number: "04",
      icon: Download,
      title: "Download & Use",
      description: "Get your ready-to-use JSONL dataset",
      details: ["Instant download", "Fine-tuning ready", "Use anywhere"],
      gradient: "from-orange-500 to-orange-600"
    }
  ];

  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-white via-blue-50/20 to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block mb-4"
          >
            <span className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-semibold">
              🔥 NEW FEATURE
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Generate JSONL Datasets in 4 Easy Steps
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Transform your documents into high-quality training datasets for AI fine-tuning.
            From PDF to JSONL in minutes - completely free!
          </motion.p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector Line (hidden on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-700 z-0" />
              )}

              {/* Card */}
              <div className="relative bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-zinc-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 z-10">
                {/* Number Badge */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-100 dark:to-gray-200 rounded-full flex items-center justify-center text-white dark:text-gray-900 font-bold text-lg shadow-lg">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${step.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  {step.description}
                </p>

                {/* Details */}
                <ul className="space-y-2">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
