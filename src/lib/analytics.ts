/**
 * Analytics Helper - Study AI
 * 
 * Centralized analytics wrapper for privacy-compliant event tracking.
 * 
 * Usage:
 *   import { analytics } from '@/lib/analytics';
 *   analytics.signUpStarted();
 *   analytics.featureAccessed('chat');
 * 
 * Privacy Notes:
 * - Never log chat content, document content, or user emails
 * - Only track event names, counts, and non-sensitive metadata
 * - All tracking is async and non-blocking
 */

// Type definition for gtag (Google Analytics 4)
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Core event tracking function
 * @param eventName - Name of the event (e.g., 'sign_up_started')
 * @param eventParams - Optional metadata (must not contain PII)
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  // Check if GA is loaded
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...eventParams,
      timestamp: new Date().toISOString(),
    });
  }

  // Console log in development mode
  if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, eventParams);
  }
};

/**
 * Pre-defined analytics events (type-safe, production-ready)
 * 
 * Add new events here as needed. Ensure event names are descriptive
 * and follow snake_case convention.
 */
export const analytics = {
  // ===== CONVERSION FUNNEL =====
  
  /** User clicked "Get Started" or "Sign Up" CTA */
  signUpStarted: () => trackEvent('sign_up_started'),
  
  /** User successfully completed authentication */
  signUpCompleted: (method: 'email' | 'google') => 
    trackEvent('sign_up_completed', { method }),
  
  /** User sent their first chat message (activation metric) */
  firstChatMessage: () => trackEvent('first_chat_message'),
  
  // ===== FEATURE USAGE =====
  
  /** User navigated to a specific feature */
  featureAccessed: (feature: 'chat' | 'documents' | 'images' | 'livecall' | 'dashboard') => 
    trackEvent('feature_accessed', { feature }),
  
  /** User sent a chat message */
  chatMessageSent: (messageCount: number) => 
    trackEvent('chat_message_sent', { message_count: messageCount }),
  
  /** User uploaded a document */
  documentUploaded: (fileType: 'pdf' | 'docx' | 'txt' | 'link' | 'other', fileSize?: number) => 
    trackEvent('document_uploaded', { 
      file_type: fileType,
      file_size_kb: fileSize ? Math.round(fileSize / 1024) : undefined 
    }),
  
  /** User analyzed/searched a document */
  documentAnalyzed: () => trackEvent('document_analyzed'),
  
  /** User generated an image */
  imageGenerated: (model?: string) => 
    trackEvent('image_generated', { model }),
  
  /** User started a voice call */
  voiceCallStarted: () => trackEvent('voice_call_started'),
  
  /** User ended a voice call */
  voiceCallEnded: (durationSeconds: number) => 
    trackEvent('voice_call_ended', { duration_seconds: durationSeconds }),
  
  /** User switched AI model in chat */
  modelSwitched: (fromModel: string, toModel: string) => 
    trackEvent('model_switched', { from_model: fromModel, to_model: toModel }),
  
  // ===== ERROR TRACKING =====
  
  /** An error occurred (use for debugging pain points) */
  errorOccurred: (
    errorType: 'ai_timeout' | 'upload_failed' | 'auth_failed' | 'network_error' | 'other',
    page: string,
    errorMessage?: string
  ) => trackEvent('error_occurred', { 
    error_type: errorType, 
    page,
    // Only log sanitized error messages (no sensitive data)
    error_message: errorMessage?.substring(0, 100) 
  }),
  
  // ===== USER ENGAGEMENT =====
  
  /** User clicked a CTA on landing page */
  ctaClicked: (ctaLocation: 'hero' | 'features' | 'footer') => 
    trackEvent('cta_clicked', { location: ctaLocation }),
  
  /** User logged out */
  logout: () => trackEvent('logout'),
  
  // ===== PRODUCT INSIGHTS =====
  
  /** User deleted a document */
  documentDeleted: () => trackEvent('document_deleted'),
  
  /** User created a new chat session */
  chatCreated: () => trackEvent('chat_created'),
  
  /** User deleted a chat session */
  chatDeleted: () => trackEvent('chat_deleted'),
};

/**
 * Page view tracking (automatically handled by GA4 with react-helmet-async)
 * Only use this if you need custom page view logic
 */
export const trackPageView = (pagePath: string, pageTitle: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

/**
 * Set user properties (use sparingly, no PII)
 * Example: User tier, feature flags, A/B test variants
 */
export const setUserProperty = (propertyName: string, value: string | number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_properties', {
      [propertyName]: value,
    });
  }
};
