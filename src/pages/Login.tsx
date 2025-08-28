import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Declare turnstile on window object
declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, options: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export default function FlippingAuthCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginTurnstileToken, setLoginTurnstileToken] = useState('');
  const [signupTurnstileToken, setSignupTurnstileToken] = useState('');
  const [loginWidgetId, setLoginWidgetId] = useState<string>('');
  const [signupWidgetId, setSignupWidgetId] = useState<string>('');

  const loginTurnstileRef = useRef<HTMLDivElement>(null);
  const signupTurnstileRef = useRef<HTMLDivElement>(null);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clean up any existing widgets first
    if (window.turnstile) {
      if (loginWidgetId) {
        window.turnstile.remove(loginWidgetId);
        setLoginWidgetId('');
      }
      if (signupWidgetId) {
        window.turnstile.remove(signupWidgetId);
        setSignupWidgetId('');
      }
    }

    // Initialize Turnstile widget for the currently visible side
    const initializeTurnstile = () => {
      if (!window.turnstile) return;

      // Small delay to ensure DOM is ready and previous widgets are cleaned up
      setTimeout(() => {
        if (!isFlipped && loginTurnstileRef.current) {
          // Clear any existing content first
          loginTurnstileRef.current.innerHTML = '';
          
          // Render login turnstile only if we're on login side
          const loginId = window.turnstile.render(loginTurnstileRef.current, {
            sitekey: '0x4AAAAAABhlh5hkImqzh_M4',
            theme: 'dark',
            callback: (token: string) => {
              setLoginTurnstileToken(token);
            },
            'error-callback': () => {
              setError('Captcha verification failed. Please try again.');
            }
          });
          setLoginWidgetId(loginId);
        }

        if (isFlipped && signupTurnstileRef.current) {
          // Clear any existing content first
          signupTurnstileRef.current.innerHTML = '';
          
          // Render signup turnstile only if we're on signup side
          const signupId = window.turnstile.render(signupTurnstileRef.current, {
            sitekey: '0x4AAAAAABhlh5hkImqzh_M4',
            theme: 'dark',
            callback: (token: string) => {
              setSignupTurnstileToken(token);
            },
            'error-callback': () => {
              setError('Captcha verification failed. Please try again.');
            }
          });
          setSignupWidgetId(signupId);
        }
      }, 100);
    };

    // Check if turnstile is already loaded
    if (window.turnstile) {
      initializeTurnstile();
    } else {
      // Wait for turnstile to load
      const checkTurnstile = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkTurnstile);
          initializeTurnstile();
        }
      }, 100);

      return () => clearInterval(checkTurnstile);
    }
  }, [isFlipped]); // Only depend on isFlipped

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      if (window.turnstile) {
        if (loginWidgetId) window.turnstile.remove(loginWidgetId);
        if (signupWidgetId) window.turnstile.remove(signupWidgetId);
      }
    };
  }, [loginWidgetId, signupWidgetId]);

  const handleFlip = () => {
    // Clean up current side's widget before flipping
    if (window.turnstile) {
      if (!isFlipped && loginWidgetId) {
        window.turnstile.remove(loginWidgetId);
        setLoginWidgetId('');
      }
      if (isFlipped && signupWidgetId) {
        window.turnstile.remove(signupWidgetId);
        setSignupWidgetId('');
      }
    }

    setIsFlipped(!isFlipped);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    
    // Reset turnstile tokens
    setLoginTurnstileToken('');
    setSignupTurnstileToken('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Get the current turnstile response
    let currentToken = loginTurnstileToken;
    if (!currentToken && window.turnstile && loginWidgetId) {
      currentToken = window.turnstile.getResponse(loginWidgetId);
    }

    // Check if turnstile token is available
    if (!currentToken) {
      setError('Please complete the captcha verification.');
      return;
    }

    setIsLoading(true);

    try {
      // Pass the captcha token to the signIn function
      await signIn(email, password, currentToken);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'Login failed');
      // Reset turnstile on error
      if (window.turnstile && loginWidgetId) {
        window.turnstile.reset(loginWidgetId);
        setLoginTurnstileToken('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Get the current turnstile response
    let currentToken = signupTurnstileToken;
    if (!currentToken && window.turnstile && signupWidgetId) {
      currentToken = window.turnstile.getResponse(signupWidgetId);
    }

    // Check if turnstile token is available
    if (!currentToken) {
      setError('Please complete the captcha verification.');
      return;
    }

    setIsLoading(true);

    try {
      // Pass the captcha token to the signUp function
      await signUp(email, password, currentToken);
      setSuccess('Account created! Please check your email to verify your account before signing in.');
    } catch (error: any) {
      setError(error.message || 'Sign up failed');
      // Reset turnstile on error
      if (window.turnstile && signupWidgetId) {
        window.turnstile.reset(signupWidgetId);
        setSignupTurnstileToken('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen-mobile flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4 sm:p-6 lg:p-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 sm:w-80 h-40 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 sm:w-80 h-40 sm:h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-20 sm:top-40 left-20 sm:left-40 w-30 sm:w-60 h-30 sm:h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div 
        className="relative z-10 w-full max-w-xs sm:max-w-md lg:max-w-4xl h-auto lg:h-[600px]"
        style={{ perspective: '1000px' }}
      >
        {/* Card Container */}
        <div 
          className={`relative w-full h-full transition-transform duration-700 ease-in-out transform-gpu`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Login Side (Front) */}
          <div 
            className="absolute inset-0 w-full h-full bg-white/10 backdrop-blur-xl rounded-xl lg:rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="flex flex-col lg:flex-row h-full"> 
              <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-0">
                <img
                  src="https://cdni.iconscout.com/illustration/premium/thumb/login-page-illustration-download-in-svg-png-gif-file-formats--app-developing-development-secure-mobile-webapp-and-pack-design-illustrations-3783954.png?f=webp"
                  alt="Welcome"
                  className="object-cover w-full h-full rounded-l-2xl"
                  style={{ minHeight: '100%', minWidth: '100%' }}
                />
              </div>
              
              {/* Right side - Login Form */}
              <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
                <div className="max-w-sm mx-auto w-full">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8 text-center">Sign In</h1>

                  {error && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <p className="text-green-300 text-sm">{success}</p>
                    </div>
                  )}

                  <form onSubmit={handleLogin}>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="relative group">
                        <input
                          type="email"
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-white/50 text-white transition-all duration-300 group-hover:bg-white/15 text-sm sm:text-base touch-manipulation"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="relative group">
                        <input
                          type="password"
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-white/50 text-white transition-all duration-300 group-hover:bg-white/15 text-sm sm:text-base touch-manipulation"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      
                      {/* Turnstile Widget */}
                      <div className="flex justify-center mt-3 sm:mt-4">
                        <div ref={loginTurnstileRef} className="scale-90 sm:scale-100"></div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation min-h-[44px]"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                          <span className="text-sm sm:text-base">Signing in...</span>
                        </div>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-white/70 text-sm sm:text-base">Don't have an account?</p>
                    <button 
                      onClick={handleFlip}
                      className="mt-2 text-indigo-300 hover:text-indigo-200 font-semibold transition-colors duration-300 hover:underline text-sm sm:text-base touch-manipulation p-2"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signup Side (Back) */}
          <div 
            className="absolute inset-0 w-full h-full bg-white/10 backdrop-blur-xl rounded-xl lg:rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="flex flex-col lg:flex-row h-full">
              {/* Left side - Signup Form */}
              <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
                <div className="max-w-sm mx-auto w-full">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8 text-center">Sign Up</h1>

                  {error && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <p className="text-green-300 text-sm">{success}</p>
                    </div>
                  )}

                  <form onSubmit={handleSignup} className="space-y-4 sm:space-y-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="relative group">
                        <input
                          type="email"
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder-white/50 text-white transition-all duration-300 group-hover:bg-white/15 text-sm sm:text-base touch-manipulation"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="relative group">
                        <input
                          type="password"
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder-white/50 text-white transition-all duration-300 group-hover:bg-white/15 text-sm sm:text-base touch-manipulation"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      
                      {/* Turnstile Widget */}
                      <div className="flex justify-center mt-3 sm:mt-4">
                        <div ref={signupTurnstileRef} className="scale-90 sm:scale-100"></div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 sm:py-3 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation min-h-[44px]"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                          <span className="text-sm sm:text-base">Creating account...</span>
                        </div>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-white/70 text-sm sm:text-base">Already have an account?</p>
                    <button 
                      onClick={handleFlip}
                      className="mt-2 text-purple-300 hover:text-purple-200 font-semibold transition-colors duration-300 hover:underline text-sm sm:text-base touch-manipulation p-2"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-0">
                <img
                  src="https://cdni.iconscout.com/illustration/premium/thumb/sign-up-illustration-download-in-svg-png-gif-file-formats--account-login-miscellaneous-pack-illustrations-5230178.png?f=webp"
                  alt="Welcome"
                  className="object-cover w-full h-full rounded-r-2xl"
                  style={{ minHeight: '100%', minWidth: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
