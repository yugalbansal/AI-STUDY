import { useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import { SimplifiedAIImageGenerator } from '@/components/ui/simplified-ai-gen';
import { Sparkles, Zap, Palette, Image as ImageIcon } from 'lucide-react';

export default function ImageGen() {
  const handleCtaClick = useCallback(() => {
    document.getElementById('image-generator-section')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <Helmet>
        <title>Image Generator - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="relative min-h-screen bg-white dark:bg-zinc-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 dark:from-blue-600/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/20 dark:from-purple-600/5 to-transparent rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-gray-200 dark:border-zinc-700 mb-6">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI-Powered Creation</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Create Stunning AI Generated Images Instantly
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8">
              Transform your ideas into breathtaking visuals using advanced AI. Generate high-quality images from simple text descriptions.
            </p>
            <button
              onClick={handleCtaClick}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-500 dark:to-teal-500 text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95"
            >
              <Sparkles className="h-5 w-5" />
              Start Creating Now
            </button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-gray-200 dark:border-zinc-700 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Generate high-quality content in seconds with our optimized AI models.</p>
            </div>
            
            <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-gray-200 dark:border-zinc-700 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 dark:from-teal-600 dark:to-emerald-700 flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Diverse Styles</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">From photorealistic to artistic, create content in any style you can imagine.</p>
            </div>
            
            <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-gray-200 dark:border-zinc-700 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 flex items-center justify-center mb-4">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Multi-Modal</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Multiple AI models available to match your creative vision perfectly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section id="image-generator-section" className="relative py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-start">
            {/* Left Column - Information Cards */}
            <div className="space-y-6 order-2 lg:order-1">
              {/* Tips Card */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-900 rounded-3xl p-8 border border-gray-200 dark:border-zinc-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pro Tips</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 border border-gray-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Crafting Perfect Prompts</h3>
                    <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-sm">Be specific about subject, setting, lighting, and camera angle</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-sm">Include style keywords: "cinematic", "watercolor", "macro photography"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-sm">Add technical details: "soft studio lighting", "bokeh effect", "35mm film"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-sm">Use negative prompts to avoid unwanted elements</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 border border-gray-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">What You Can Create</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">📸 Marketing</div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">Social media content, product shots, hero images</p>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">🎨 Artwork</div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">Digital art, illustrations, creative designs</p>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">🖼️ Portraits</div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">Professional headshots, character designs</p>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">🏞 Landscapes</div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">Scenic views, environment concepts, backgrounds</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Playbooks */}
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-8 border border-gray-200 dark:border-zinc-700 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Use Cases</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950/50 dark:to-cyan-900/50 rounded-2xl p-5 border border-blue-200 dark:border-cyan-900">
                    <div className="text-2xl mb-2">🎯</div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Brand Assets</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Generate consistent visuals for campaigns, social media, and marketing materials.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-900/50 rounded-2xl p-5 border border-teal-200 dark:border-emerald-900">
                    <div className="text-2xl mb-2">🖼️</div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Product Mockups</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Create professional product shots and lifestyle images for e-commerce.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-950/50 dark:to-blue-900/50 rounded-2xl p-5 border border-cyan-200 dark:border-blue-900">
                    <div className="text-2xl mb-2">🎨</div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Creative Projects</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Explore artistic styles and create unique illustrations for your projects.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/50 dark:to-teal-900/50 rounded-2xl p-5 border border-emerald-200 dark:border-teal-900">
                    <div className="text-2xl mb-2">📱</div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Content Creation</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Generate engaging visuals for blogs, presentations, and social media posts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Generator Component */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-24">
              <SimplifiedAIImageGenerator />
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
