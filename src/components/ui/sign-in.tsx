import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DarkModeToggle } from '../DarkModeToggle';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);


// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isLoading?: boolean;
  isSignUpMode?: boolean;
  showNavbar?: boolean;
  /** Called when signup-mode user ticks both consent checkboxes (for logging) */
  onConsentChanged?: (accepted: { terms: boolean; privacy: boolean }) => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-2 rounded-2xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-gray-200 dark:border-zinc-700 p-3 w-52 shadow-lg`}>
    <img src={testimonial.avatarSrc} className="h-8 w-8 object-cover rounded-xl" alt="avatar" />
    <div className="text-xs leading-snug">
      <p className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">{testimonial.name}</p>
      <p className="text-gray-600 dark:text-gray-400 text-[10px]">{testimonial.handle}</p>
      <p className="mt-0.5 text-gray-700 dark:text-gray-300">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-gray-900 tracking-tighter">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  isLoading = false,
  showNavbar = false,
  isSignUpMode = false,
  onConsentChanged,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Whether consent is fully given (only enforced for sign-up)
  const consentGiven = !isSignUpMode || (termsAccepted && privacyAccepted);

  // Notify parent whenever consent changes
  const handleTermsChange = (checked: boolean) => {
    setTermsAccepted(checked);
    onConsentChanged?.({ terms: checked, privacy: privacyAccepted });
  };
  const handlePrivacyChange = (checked: boolean) => {
    setPrivacyAccepted(checked);
    onConsentChanged?.({ terms: termsAccepted, privacy: checked });
  };

  const buttonText = isSignUpMode 
    ? (isLoading ? 'Creating Account...' : 'Create Account')
    : (isLoading ? 'Signing In...' : 'Sign In');
  
  const toggleText = isSignUpMode
    ? 'Already have an account?'
    : 'New to our platform?';
  
  const toggleLinkText = isSignUpMode
    ? 'Sign In'
    : 'Create Account';
  
  const resetPasswordText = isSignUpMode
    ? 'Back to Sign In'
    : 'Reset password';

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw] bg-white dark:bg-zinc-950">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-6 pt-6">
        <div className="w-full max-w-md">
          {showNavbar && (
            <div className="mb-6 flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-full shadow-md border border-gray-200/50 dark:border-zinc-700/50">
              <Link to="/" className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Back to Home</span>
              </Link>
              <DarkModeToggle />
            </div>
          )}
          <div className="flex flex-col gap-4">
            <h1 className="animate-element animate-delay-100 text-3xl md:text-4xl font-semibold leading-tight text-gray-900 dark:text-white">{title}</h1>
            <p className="animate-element animate-delay-200 text-sm text-gray-600 dark:text-gray-300">{description}</p>

            <form className="space-y-4" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                <GlassInputWrapper>
                  <input 
                    name="email" 
                    type="email" 
                    placeholder="Enter your email address" 
                    className="w-full bg-transparent text-sm p-3 rounded-2xl focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                    required
                    disabled={isLoading}
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Enter your password" 
                      className="w-full bg-transparent text-sm p-3 pr-12 rounded-2xl focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                      required
                      disabled={isLoading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute inset-y-0 right-3 flex items-center"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" /> : <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="w-3.5 h-3.5 rounded border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-violet-600 focus:ring-violet-500" disabled={isLoading} />
                  <span className="text-gray-700 dark:text-gray-300">Keep me signed in</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="hover:underline text-violet-600 dark:text-violet-400 transition-colors">{resetPasswordText}</a>
              </div>

              {/* ── Terms & Privacy consent (sign-up only) ── */}
              {isSignUpMode && (
                <div className="animate-element animate-delay-500 space-y-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 p-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Required to create an account:</p>
                  <label className="flex items-start gap-2.5 cursor-pointer" id="signup-terms-label">
                    <input
                      id="signup-terms-checkbox"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => handleTermsChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
                      disabled={isLoading}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" className="text-violet-600 dark:text-violet-400 hover:underline">Terms of Service</Link>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer" id="signup-privacy-label">
                    <input
                      id="signup-privacy-checkbox"
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => handlePrivacyChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
                      disabled={isLoading}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      I agree to the{' '}
                      <Link to="/privacy" target="_blank" className="text-violet-600 dark:text-violet-400 hover:underline">Privacy Policy</Link>
                    </span>
                  </label>
                </div>
              )}

              {/* Clerk CAPTCHA container - required for bot protection */}
              <div id="clerk-captcha" className="animate-element animate-delay-550"></div>

              <button 
                type="submit" 
                className="animate-element animate-delay-600 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-medium text-sm text-white hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !consentGiven}
              >
                {buttonText}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-gray-300 dark:border-zinc-700"></span>
              <span className="px-4 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-zinc-950 absolute">Or continue with</span>
            </div>

            <button 
              onClick={onGoogleSignIn} 
              className="animate-element animate-delay-800 w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-zinc-700 rounded-2xl py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
              disabled={isLoading || !consentGiven}
            >
                <GoogleIcon />
                Continue with Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-xs text-gray-600 dark:text-gray-300">
              {toggleText} <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-violet-600 dark:text-violet-400 hover:underline transition-colors">{toggleLinkText}</a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }}></div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
              {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
