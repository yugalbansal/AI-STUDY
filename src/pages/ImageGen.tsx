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
        <title>Image Generator - Study AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="relative min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 mb-6">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">AI-Powered Creation</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Create Stunning AI Generated Images Instantly
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8">
              Transform your ideas into breathtaking visuals using advanced AI. Generate high-quality images from simple text descriptions.
            </p>
            <button
              onClick={handleCtaClick}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95"
            >
              <Sparkles className="h-5 w-5" />
              Start Creating Now
            </button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600 text-sm">Generate high-quality content in seconds with our optimized AI models.</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Diverse Styles</h3>
              <p className="text-gray-600 text-sm">From photorealistic to artistic, create content in any style you can imagine.</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-4">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Modal</h3>
              <p className="text-gray-600 text-sm">Multiple AI models available to match your creative vision perfectly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section id="image-generator-section" className="relative py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-start">
            {/* Left Column - Information Cards */}
            <div className="space-y-6 order-2 lg:order-1">
              {/* Tips Card */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Pro Tips</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Crafting Perfect Prompts</h3>
                    <ul className="space-y-3 text-gray-700">
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

                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">What You Can Create</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">📸 Marketing</div>
                        <p className="text-gray-600 text-xs">Social media content, product shots, hero images</p>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">� Artwork</div>
                        <p className="text-gray-600 text-xs">Digital art, illustrations, creative designs</p>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">�️ Portraits</div>
                        <p className="text-gray-600 text-xs">Professional headshots, character designs</p>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">� Landscapes</div>
                        <p className="text-gray-600 text-xs">Scenic views, environment concepts, backgrounds</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Playbooks */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Use Cases</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
                    <div className="text-2xl mb-2">🎯</div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Brand Assets</h3>
                    <p className="text-sm text-gray-700">
                      Generate consistent visuals for campaigns, social media, and marketing materials.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-purple-200">
                    <div className="text-2xl mb-2">🖼️</div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Product Mockups</h3>
                    <p className="text-sm text-gray-700">
                      Create professional product shots and lifestyle images for e-commerce.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-5 border border-pink-200">
                    <div className="text-2xl mb-2">🎨</div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Creative Projects</h3>
                    <p className="text-sm text-gray-700">
                      Explore artistic styles and create unique illustrations for your projects.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200">
                    <div className="text-2xl mb-2">📱</div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Content Creation</h3>
                    <p className="text-sm text-gray-700">
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
