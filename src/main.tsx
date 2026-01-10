import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key - Add VITE_CLERK_PUBLISHABLE_KEY to .env or .env.local');
}

console.log('Clerk key loaded:', clerkPubKey.substring(0, 20) + '...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ClerkProvider>
  </StrictMode>
);
