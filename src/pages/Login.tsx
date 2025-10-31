import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await signIn(email, password);
      toast.success('Login successful! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await signUp(email, password);
      toast.success('Account created! Please check your email to verify your account.');
      // Switch to sign in after successful signup
      setTimeout(() => {
        setIsSignUp(false);
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // The redirect will happen automatically, so we don't need to navigate here
      toast.success('Redirecting to Google...');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(error.message || 'Google sign-in failed. Please try again.');
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
  );
}
