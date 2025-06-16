import React, { useEffect, useRef } from 'react';
import { Monitor, Smartphone, Zap, Brain, Sparkles } from 'lucide-react';

const MobileBlocker: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const floatingElementsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Animate floating elements
    const animateFloatingElements = () => {
      floatingElementsRef.current.forEach((element, index) => {
        if (element) {
          const delay = index * 0.5;
          const duration = 3 + Math.random() * 2;
          element.style.animation = `float ${duration}s ease-in-out ${delay}s infinite alternate`;
        }
      });
    };

    animateFloatingElements();

    // Add dynamic background animation
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const moveX = (clientX - centerX) * 0.01;
      const moveY = (clientY - centerY) * 0.01;
      
      container.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20"></div>
      </div>

      {/* Floating Elements */}
      <div ref={containerRef} className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            ref={(el) => el && (floatingElementsRef.current[i] = el)}
            className="absolute opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 20 + 10}px`,
            }}
          >
            {i % 4 === 0 && <Brain className="text-purple-400" />}
            {i % 4 === 1 && <Zap className="text-blue-400" />}
            {i % 4 === 2 && <Sparkles className="text-pink-400" />}
            {i % 4 === 3 && <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          {/* 3D AI Robot Animation */}
          <div className="relative mb-8 flex justify-center">
            <div className="relative">
              {/* Robot Head */}
              <div className="w-24 h-24 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl mx-auto relative transform rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl">
                {/* Eyes */}
                <div className="absolute top-4 left-3 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="absolute top-4 right-3 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                
                {/* Mouth */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-purple-400 rounded-full"></div>
                
                {/* Antenna */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-slate-600 rounded-full"></div>
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-pink-400 rounded-full animate-bounce"></div>
              </div>
              
              {/* Robot Body */}
              <div className="w-16 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mx-auto mt-2 relative shadow-xl">
                {/* Chest Panel */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-6 bg-slate-700 rounded border border-slate-600">
                  <div className="w-full h-1 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full mt-2 animate-pulse"></div>
                </div>
                
                {/* Arms */}
                <div className="absolute top-4 -left-3 w-2 h-8 bg-slate-700 rounded-full transform -rotate-12 animate-pulse"></div>
                <div className="absolute top-4 -right-3 w-2 h-8 bg-slate-700 rounded-full transform rotate-12 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              </div>

              {/* Glowing Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-3xl blur-xl animate-pulse"></div>
            </div>
          </div>

          {/* Content Card */}
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-700/50 transform hover:scale-105 transition-all duration-300">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl mb-4 shadow-lg">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                Oops! Mobile Detected
              </h1>
              <p className="text-slate-400 text-lg">
                Sorry, this experience is optimized for desktop
              </p>
            </div>

            {/* Message */}
            <div className="text-center mb-8">
              <p className="text-slate-300 leading-relaxed mb-4">
                Our AI-powered platform delivers the best experience on larger screens with advanced features and seamless navigation.
              </p>
              <div className="flex items-center justify-center space-x-2 text-purple-400">
                <Brain className="w-5 h-5" />
                <span className="text-sm font-medium">Made by Yugal</span>
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Desktop Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-xl">
                  <Monitor className="w-10 h-10 text-cyan-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                <Monitor className="w-5 h-5 mr-2" />
                Please Switch to Desktop
              </div>
              <p className="text-slate-500 text-sm mt-3">
                For the best AI experience
              </p>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="flex justify-center mt-8 space-x-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

export default MobileBlocker;