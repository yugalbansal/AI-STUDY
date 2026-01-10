import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { SignInPage, Testimonial } from '../components/ui/sign-in';
import { toast } from 'sonner';

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarahstudies",
    text: "AI Study Platform transformed my learning! The AI tutor explains complex topics so clearly."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Marcus Johnson",
    handle: "@marcuslearns",
    text: "Voice conversations with the AI feel natural. It's like having a personal tutor 24/7!"
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "David Martinez",
    handle: "@davidstudies",
    text: "Document analysis saves me hours. Upload, ask questions, and get instant insights. Amazing!"
  },
];

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded, setActive: setActiveSignUp } = useSignUp();
  const navigate = useNavigate();

  // Handle email verification callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clerkStatus = params.get('__clerk_status');
    
    if (clerkStatus === 'verified') {
      toast.success('Email verified! Please sign in with your credentials.');
      // Clean URL
      window.history.replaceState({}, '', '/login');
    } else if (clerkStatus === 'client_mismatch') {
      toast.info('Email verified! Please sign in with your email and password.');
      // Clean URL
      window.history.replaceState({}, '', '/login');
    } else if (clerkStatus === 'expired') {
      toast.error('Verification link expired. Please sign up again or contact support.');
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signInLoaded || !signIn) return;

    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast.success('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else if (result.status === 'needs_identifier') {
        toast.error('Please provide your email address.');
      } else if (result.status === 'needs_first_factor') {
        toast.error('Incorrect password. Please try again.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'Login failed.';
      
      if (errorMessage.includes('not found') || errorMessage.includes("couldn't find")) {
        toast.error('Account not found. Please sign up first or check your email address.');
      } else if (errorMessage.includes('password')) {
        toast.error('Incorrect password. Please try again.');
      } else if (errorMessage.includes('verify') || errorMessage.includes('verification')) {
        toast.error('Please verify your email before signing in. Check your inbox.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signUpLoaded || !signUp) return;

    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      // Check if verification is required
      if (result.status === 'complete') {
        // Account created without verification required
        await setActiveSignUp({ session: result.createdSessionId });
        toast.success('Account created! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else if (result.status === 'missing_requirements') {
        // Email verification required - explicitly send verification email
        try {
          await signUp.prepareEmailAddressVerification({ 
            strategy: 'email_link'
          });
          toast.success('Account created! Check your email for verification link, then sign in.');
          console.log('Verification email sent to:', email);
        } catch (emailErr: any) {
          console.error('Failed to send verification email:', emailErr);
          toast.info('Account created! You may need to contact support to verify your email.');
        }
        
        // Switch to sign in after successful signup
        setTimeout(() => {
          setIsSignUp(false);
        }, 3000);
      } else {
        // Any other status
        toast.info('Account created! Please check your email if verification is required.');
        setTimeout(() => {
          setIsSignUp(false);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'Sign up failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!signInLoaded || !signIn) return;
    
    setIsLoading(true);
    try {
      // Use Clerk's default OAuth flow - it will handle redirects automatically
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin,
        redirectUrlComplete: `${window.location.origin}/dashboard`,
      });
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      toast.error(err.errors?.[0]?.message || 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    toast.info('Password reset feature coming soon! Please contact support if needed.');
  };

  const handleCreateAccount = () => {
    setIsSignUp(true);
  };

  const handleBackToSignIn = () => {
    setIsSignUp(false);
  };

  if (isSignUp) {
    return (
      <SignInPage
        title={<span className="font-light text-gray-900 tracking-tighter">Create Account</span>}
        description="Join thousands of students learning smarter with AI"
        heroImageSrc="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=2160&q=80"
        testimonials={testimonials}
        onSignIn={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleBackToSignIn}
        onCreateAccount={handleBackToSignIn}
        isLoading={isLoading}
        isSignUpMode={true}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>Login - Study AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <SignInPage
        title={<span className="font-light text-gray-900 tracking-tighter">Welcome Back</span>}
        description="Sign in to continue your learning journey with AI"
        heroImageSrc="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=2160&q=80"
        testimonials={testimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        isLoading={isLoading}
        isSignUpMode={false}
      />
    </>
  );
}
