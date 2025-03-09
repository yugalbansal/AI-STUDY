import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HeroGeometric } from '../components/ui/shape-landing-hero';
import { ElegantShape } from '../components/ui/elegant-shape';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#030303]">
      {/* Hero section */}
      <div className="absolute inset-0 h-1/2">
        <HeroGeometric 
          badge="AI Study Platform"
          title1="Welcome to"
          title2="AI-Powered Learning"
        />
      </div>

      {/* Login section with elegant shapes */}
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

        <div className="relative z-10 w-full max-w-md p-8 bg-black/40 backdrop-blur-lg rounded-lg shadow-xl border border-white/10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-500/10 p-4">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-white/30 text-white"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-white/30 text-white"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}