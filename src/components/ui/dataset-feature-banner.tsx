import { motion } from 'framer-motion';
import { Database, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const DatasetFeatureBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            New Feature Available
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Generate JSONL Training Datasets
            <br />
            <span className="text-blue-100">from Your Documents - FREE!</span>
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-blue-50 mb-8 max-w-3xl mx-auto">
            Transform PDF, DOCX, PPTX files into high-quality JSONL datasets perfect for AI model fine-tuning.
            Upload → Generate → Download. It's that simple!
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Multiple Formats</h3>
              <p className="text-blue-100 text-sm">PDF, DOCX, PPTX, TXT and more supported</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">AI-Optimized</h3>
              <p className="text-blue-100 text-sm">Perfect Q&A pairs for LLM fine-tuning</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">One-Click</h3>
              <p className="text-blue-100 text-sm">Generate datasets in seconds, not hours</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              type="button"
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl font-semibold px-8 py-6 text-lg group"
            >
              Start Generating Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-blue-50 text-sm">
              ✓ No credit card required ✓ Free forever ✓ Instant access
            </p>
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <p className="text-blue-100 mb-4">Trusted by developers and AI enthusiasts worldwide</p>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">10K+</div>
                <div className="text-blue-100 text-sm">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-blue-100 text-sm">Datasets Generated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">100%</div>
                <div className="text-blue-100 text-sm">Free Forever</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
