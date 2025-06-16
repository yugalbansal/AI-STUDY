import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroGeometric } from '../components/ui/shape-landing-hero';
import { ElegantShape } from '../components/ui/elegant-shape';

export default function Landing() {
    const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/Login');
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#030303]">
      {/* Hero section */}
      {/* <div className="absolute inset-0 h-1/2"> */}
      <div className="relative flex flex-col items-center justify-center h-[60vh] mt-12">
        <HeroGeometric 
          badge="AI Study Platform"
          title1="Welcome to"
          title2="AI-Powered Learning"
        />
        <button
          className="mt-0 px-8 py-3 rounded-lg bg-indigo-600 text-white text-lg font-semibold shadow-lg hover:bg-indigo-700 transition"
          onClick={handleGetStarted}
        >
          Get Started
        </button>
      </div>

      {/* Shapes section */}
      <div className="relative w-full flex items-center justify-center mt-[100vh]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />
        
        <div className="absolute inset-0 overflow-hidden">
          <ElegantShape
            delay={0.3}
            width={400}
            height={100}
            rotate={12}
            gradient="from-indigo-500/[0.15]"
            className="left-[-5%] top-[20%]"
          />
          <ElegantShape
            delay={0.5}
            width={300}
            height={80}
            rotate={-15}
            gradient="from-rose-500/[0.15]"
            className="right-[0%] top-[60%]"
          />
          <ElegantShape
            delay={0.4}
            width={200}
            height={60}
            rotate={-8}
            gradient="from-violet-500/[0.15]"
            className="left-[10%] bottom-[10%]"
          />
        </div>
      </div>
    </div>
  );
}