"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Layers, Zap, CheckCircle } from 'lucide-react';

// A simple utility function to merge class names
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// --- Component Props & Data Types ---

interface ProcessStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  details: string[];
  duration: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface QuantumTimelineProps {
  steps?: ProcessStep[];
  defaultStep?: string;
}

// --- Default Data ---
const DEMO_STEPS: ProcessStep[] = [
  {
    id: "01",
    title: "Upload & Process",
    subtitle: "Smart Document Integration",
    description: "Upload your study materials, PDFs, and documents. Our system automatically processes and indexes your content for instant AI-powered access.",
    details: ["PDF Text Extraction", "Document Parsing", "Content Chunking", "Metadata Indexing"],
    duration: "Instant",
    icon: Upload,
  },
  {
    id: "02",
    title: "Multi-Layer Analysis",
    subtitle: "3-Layered RAG Architecture",
    description: "Your documents are analyzed through our advanced 3-layer retrieval system combining vector embeddings, keyword matching, and document-level context.",
    details: ["Vector Embeddings (1536D)", "Hybrid Search (RRF)", "Document-Level Context", "Semantic Analysis"],
    duration: "Real-time",
    icon: Layers,
  },
  {
    id: "03",
    title: "AI Processing",
    subtitle: "Intelligent Matching & Ranking",
    description: "Advanced algorithms process your query using semantic similarity, keyword relevance, and diversity selection to find the most relevant information.",
    details: ["Similarity Scoring", "MMR Diversification", "Relevance Ranking", "Context Assembly"],
    duration: "Real-time",
    icon: Zap,
  },
  {
    id: "04",
    title: "Best Results",
    subtitle: "Precision Answers Delivered",
    description: "Receive accurate, context-aware responses with source citations. Our system ensures you get the most relevant information from your documents.",
    details: ["Source Attribution", "Confidence Scoring", "Context-Rich Responses", "Citation Links"],
    duration: "Instant",
    icon: CheckCircle,
  },
];


// --- Main Timeline Component ---

export const QuantumTimeline = ({ steps = DEMO_STEPS, defaultStep }: QuantumTimelineProps) => {
  const [activeStep, setActiveStep] = useState(defaultStep || steps[0]?.id);

  const activeStepData = steps.find(step => step.id === activeStep);
  const activeIndex = steps.findIndex(step => step.id === activeStep);

  return (
    <div className="w-full max-w-6xl mx-auto p-8 font-sans bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800">
      {/* Top Navigation */}
      <TimelineNav steps={steps} activeStep={activeStep} onStepClick={setActiveStep} />

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeStepData && (
          <motion.div
            key={activeStepData.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 grid md:grid-cols-2 gap-12"
          >
            <TimelineContent step={activeStepData} />
            <TimelineVisualization step={activeStepData} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Timeline */}
      <BottomTimeline steps={steps} activeIndex={activeIndex} onStepClick={setActiveStep} />
    </div>
  );
};

// --- Sub-components ---

const TimelineNav = ({ steps, activeStep, onStepClick }: { steps: ProcessStep[], activeStep: string, onStepClick: (id: string) => void }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center font-bold">
        <Layers className="w-5 h-5" />
      </div>
      <span className="text-xl font-bold text-slate-800 dark:text-white">How It Works</span>
    </div>
    <div className="hidden md:flex items-center gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-full">
      {steps.map(step => (
        <button
          key={step.id}
          onClick={() => onStepClick(step.id)}
          className={cn(
            "px-4 py-1 rounded-full text-sm font-semibold transition-colors",
            activeStep === step.id
              ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-zinc-700"
          )}
        >
          {step.id}
        </button>
      ))}
    </div>
  </div>
);

const TimelineContent = ({ step }: { step: ProcessStep }) => (
  <div>
    <span className="text-sm font-bold text-blue-500">{step.id}</span>
    <h2 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">{step.title}</h2>
    <p className="mt-1 text-slate-600 dark:text-slate-400">{step.subtitle}</p>
    <p className="mt-4 text-slate-700 dark:text-slate-300">{step.description}</p>
    <div className="mt-6 grid sm:grid-cols-2 gap-4">
      {step.details.map((detail, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-5 h-5 bg-green-500/10 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-xs">✓</div>
          <span className="text-sm text-slate-700 dark:text-slate-300">{detail}</span>
        </div>
      ))}
    </div>
    <div className="mt-6 flex items-center gap-3 p-3 bg-slate-100 dark:bg-zinc-800 rounded-lg">
      <span className="text-blue-500">⚡</span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Processing Time: {step.duration}</span>
    </div>
  </div>
);

const TimelineVisualization = ({ step }: { step: ProcessStep }) => {
  const Icon = step.icon;
  
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-full max-w-sm">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-3xl blur-2xl"></div>
        
        {/* Main card */}
        <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-zinc-700">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Icon className="w-10 h-10 text-white" />
            </div>
          </div>
          
          {/* Animated bars/visualization based on step */}
          <div className="space-y-3">
            {step.id === "01" && (
              <>
                <div className="h-3 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}
                  />
                </div>
                <div className="h-3 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600"
                    initial={{ width: "0%" }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}
                  />
                </div>
                <div className="h-3 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                    initial={{ width: "0%" }}
                    animate={{ width: "70%" }}
                    transition={{ duration: 1, delay: 0.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}
                  />
                </div>
              </>
            )}
            
            {step.id === "02" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 bg-blue-500/20 dark:bg-blue-500/30 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-300 dark:bg-zinc-700 mx-2"></div>
                  <div className="w-16 h-16 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-300 dark:bg-zinc-700 mx-2"></div>
                  <div className="w-16 h-16 bg-green-500/20 dark:bg-green-500/30 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-xs text-slate-600 dark:text-slate-400">Vector → Keyword → Document</div>
                </div>
              </div>
            )}
            
            {step.id === "03" && (
              <div className="space-y-4">
                {[92, 88, 85, 78].map((score, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      i === 0 ? "bg-green-500/20 text-green-600" :
                      i === 1 ? "bg-blue-500/20 text-blue-600" :
                      i === 2 ? "bg-purple-500/20 text-purple-600" :
                      "bg-orange-500/20 text-orange-600"
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          i === 0 ? "bg-gradient-to-r from-green-500 to-green-600" :
                          i === 1 ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                          i === 2 ? "bg-gradient-to-r from-purple-500 to-purple-600" :
                          "bg-gradient-to-r from-orange-500 to-orange-600"
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{score}%</span>
                  </motion.div>
                ))}
              </div>
            )}
            
            {step.id === "04" && (
              <div className="space-y-4">
                <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">High Confidence</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-green-200 dark:bg-green-900/30 rounded"></div>
                    <div className="h-2 bg-green-200 dark:bg-green-900/30 rounded w-4/5"></div>
                    <div className="h-2 bg-green-200 dark:bg-green-900/30 rounded w-3/5"></div>
                  </div>
                </div>
                <div className="text-xs text-center text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
                  <span>Source:</span>
                  <span className="text-blue-500 font-semibold">Document_A.pdf</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BottomTimeline = ({ steps, activeIndex, onStepClick }: { steps: ProcessStep[], activeIndex: number, onStepClick: (id: string) => void }) => (
  <div className="mt-16">
    <div className="relative w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-full">
      <motion.div
        className="absolute h-1 bg-blue-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-4 h-4 -top-1.5 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.2)]"
        initial={{ left: '0%' }}
        animate={{ left: `calc(${(activeIndex / (steps.length - 1)) * 100}% - 8px)` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
    </div>
    <div className="mt-4 flex justify-between">
      {steps.map((step, i) => (
        <button key={step.id} onClick={() => onStepClick(step.id)} className="text-center w-1/4">
          <span className={cn(
            "text-sm font-semibold transition-colors",
            i <= activeIndex ? "text-blue-500" : "text-slate-500 dark:text-slate-400"
          )}>
            {step.id}
          </span>
          <p className={cn(
            "text-xs mt-1 transition-colors",
            i <= activeIndex ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
          )}>
            {step.title.split(' ')[0]}
          </p>
        </button>
      ))}
    </div>
  </div>
);
