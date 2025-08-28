import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroGeometric } from '../components/ui/shape-landing-hero';
import { ElegantShape } from '../components/ui/elegant-shape';
import { motion } from "framer-motion";

export default function Landing() {
    const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/Login');
  };
  return (
    <div className="min-h-screen-mobile flex flex-col bg-[#030303] overflow-x-hidden">
      {/* Hero section */}
      <div className="relative flex flex-col items-center justify-center min-h-[70vh] px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24">
        <div className="text-center max-w-4xl mx-auto">
          <HeroGeometric 
            badge="AI Study Platform"
            title1="Welcome to"
            title2="AI-Powered Learning"
          />
        </div>
        <button
          className="mt-6 sm:mt-8 px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-indigo-600 text-white text-base sm:text-lg font-semibold shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all touch-manipulation min-h-[44px] min-w-[44px]"
          onClick={handleGetStarted}
        >
          Get Started
        </button>
      </div>
      <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 1, ease: "easeOut" }}
  className="fixed bottom-4 left-4 right-4 sm:right-4 sm:left-auto z-10 text-white text-sm sm:text-lg md:text-xl font-semibold flex items-center justify-center sm:justify-end"
>
  Created with <span className="text-red-500 text-lg sm:text-xl md:text-2xl ml-1">❤️</span> by Yugal
</motion.div>


      {/* Shapes section */}
      <div className="relative w-full flex items-center justify-center mt-[50vh] sm:mt-[70vh] lg:mt-[100vh]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />
        
        <div className="absolute inset-0 overflow-hidden">
          <ElegantShape
            delay={0.3}
            width={300}
            height={80}
            rotate={12}
            gradient="from-indigo-500/[0.15]"
            className="left-[-10%] sm:left-[-5%] top-[20%]"
          />
          <ElegantShape
            delay={0.5}
            width={250}
            height={65}
            rotate={-15}
            gradient="from-rose-500/[0.15]"
            className="right-[-10%] sm:right-[0%] top-[60%]"
          />
          <ElegantShape
            delay={0.4}
            width={180}
            height={50}
            rotate={-8}
            gradient="from-violet-500/[0.15]"
            className="left-[5%] sm:left-[10%] bottom-[10%]"
          />
        </div>
      </div>
    </div>
  );
}