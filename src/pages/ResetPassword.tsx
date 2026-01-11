import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSignIn } from '@clerk/clerk-react';
import { ArrowLeft, Mail, Lock, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isLoaded } = useSignIn();
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      toast.success('Reset code sent to your email!');
      setStep('code');
    } catch (error: any) {
      const message = error?.errors?.[0]?.message || 'Failed to send reset code';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      if (result.status === 'complete' || result.status === 'needs_new_password') {
        toast.success('Code verified! Enter your new password.');
        setStep('password');
      }
    } catch (error: any) {
      const message = error?.errors?.[0]?.message || 'Invalid or expired code';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    try {
      await signIn.resetPassword({
        password,
      });
      
      toast.success('Password reset successful! Redirecting...');
      // After password reset, Clerk creates an active session
      // Redirect to dashboard instead of login to avoid "session exists" error
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      const message = error?.errors?.[0]?.message || 'Failed to reset password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <Helmet>
        <title>Reset Password - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Navbar */}
      <div className="w-full p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50 dark:border-zinc-700/50">
          <Link to="/login" className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Login</span>
          </Link>
          <div className="flex items-center gap-4">
            <img 
              src="https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.svg" 
              alt="Vector Mind AI" 
              className="h-10 w-10 transform scale-150"
            />
            <DarkModeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`h-2 w-12 rounded-full transition-all ${step === 'email' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300 dark:bg-zinc-700'}`} />
            <div className={`h-2 w-12 rounded-full transition-all ${step === 'code' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300 dark:bg-zinc-700'}`} />
            <div className={`h-2 w-12 rounded-full transition-all ${step === 'password' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300 dark:bg-zinc-700'}`} />
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-gray-200 dark:border-zinc-800 p-8 backdrop-blur-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
                {step === 'email' && <Mail className="w-10 h-10 text-white" />}
                {step === 'code' && <KeyRound className="w-10 h-10 text-white" />}
                {step === 'password' && <Lock className="w-10 h-10 text-white" />}
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                {step === 'email' && 'Reset Your Password'}
                {step === 'code' && 'Verify Your Email'}
                {step === 'password' && 'Create New Password'}
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-400">
                {step === 'email' && 'We\'ll send a verification code to your email'}
                {step === 'code' && 'Enter the 6-digit code we sent you'}
                {step === 'password' && 'Choose a strong password for your account'}
              </p>
            </div>

            {/* Email Step */}
            {step === 'email' && (
              <form onSubmit={handleSendCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Code...
                    </span>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </form>
            )}

            {/* Code Step */}
            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
                    Verification Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      placeholder="000000"
                      className="w-full px-4 py-4 border-2 border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-center text-2xl tracking-[0.5em] font-semibold transition-all"
                      required
                      disabled={isLoading}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span>Code sent to <span className="font-medium text-gray-900 dark:text-white">{email}</span></span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                  }}
                  className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors py-2"
                  disabled={isLoading}
                >
                  ← Use a different email
                </button>
              </form>
            )}

            {/* Password Step */}
            {step === 'password' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                      disabled={isLoading}
                      minLength={8}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      Passwords don't match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Resetting Password...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
