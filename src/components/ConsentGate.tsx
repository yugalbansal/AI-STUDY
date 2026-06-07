/**
 * ConsentGate — Blocking overlay for Indian IT Act compliance.
 *
 * For EXISTING users who haven't accepted the latest Terms & Privacy Policy,
 * this renders a full-screen modal. The user MUST manually tick both checkboxes
 * (no pre-checked defaults) and click "I Agree" before the app becomes usable.
 *
 * Timestamps are recorded in the `consent_logs` Supabase table.
 */

import { useState, useEffect } from 'react';
import { Shield, FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClerkAuth } from '../contexts/ClerkAuthContext';

import { LiquidGlassCard } from './ui/LiquidGlassCard';

/** The version string for the current policies.
 *  Bump this whenever you update Privacy Policy or Terms of Service.
 *  Existing users who accepted an older version will be prompted again.
 */
export const CURRENT_POLICY_VERSION = '2026-06-07';

interface ConsentGateProps {
  children: React.ReactNode;
}

export default function ConsentGate({ children }: ConsentGateProps) {
  const { userId, supabase, loading } = useClerkAuth();

  const [consentStatus, setConsentStatus] = useState<'loading' | 'accepted' | 'pending'>('loading');
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has already accepted current policy version
  useEffect(() => {
    async function checkConsent() {
      if (!userId || !supabase) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('consent_logs')
          .select('id')
          .eq('user_id', userId)
          .eq('policy_version', CURRENT_POLICY_VERSION)
          .eq('consent_type', 'terms_and_privacy')
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          // Table might not exist yet — treat as pending so user sees modal
          console.warn('ConsentGate: consent_logs check failed:', fetchError.message);
          setConsentStatus('pending');
          return;
        }

        setConsentStatus(data ? 'accepted' : 'pending');
      } catch {
        setConsentStatus('pending');
      }
    }

    if (!loading && userId && supabase) {
      checkConsent();
    }
  }, [userId, supabase, loading]);

  // Record consent acceptance
  async function handleAccept() {
    if (!termsChecked || !privacyChecked || !userId || !supabase) return;

    setSubmitting(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      const { error: insertError } = await supabase
        .from('consent_logs')
        .insert({
          user_id: userId,
          consent_type: 'terms_and_privacy',
          policy_version: CURRENT_POLICY_VERSION,
          terms_accepted: true,
          privacy_accepted: true,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          ip_address: null, // Can be enriched server-side if needed
          user_agent: navigator.userAgent,
        });

      if (insertError) {
        throw insertError;
      }

      setConsentStatus('accepted');
    } catch (err: any) {
      console.error('ConsentGate: Failed to record consent:', err);
      setError('Failed to save your consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // While auth or consent check is loading, don't flash the modal
  if (loading || consentStatus === 'loading') {
    return <>{children}</>;
  }

  // User already accepted — render the app
  if (consentStatus === 'accepted') {
    return <>{children}</>;
  }

  // ─── Blocking Consent Modal ──────────────────────────────────────
  return (
    <>
      {/* The app is rendered underneath with normal clarity */}
      <div className="pointer-events-none opacity-95 select-none" aria-hidden="true">
        {children}
      </div>

      {/* Full-screen overlay with transparent bg */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 dark:bg-black/40 p-4 transition-all duration-300">
        
        {/* Recreated popup using custom LiquidGlassCard */}
        <LiquidGlassCard
          borderRadius="28px"
          blurIntensity="xl"
          shadowIntensity="md"
          glowIntensity="lg"
          className="w-full max-w-md bg-white/70 dark:bg-zinc-950/70 border border-zinc-250/80 dark:border-zinc-800/60 shadow-xl dark:shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        >
          {/* Subtle glowing light leak */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-400/20 dark:via-white/10 to-transparent" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-20 bg-zinc-500/5 dark:bg-white/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="px-6 pt-7 pb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-inner">
              <Shield className="h-5.5 w-5.5 text-zinc-700 dark:text-zinc-300 drop-shadow-[0_0_6px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-wide">Updated Policies</h2>
            <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-0.5">IT Act Compliance required to continue</p>
          </div>

          {/* Body */}
          <div className="px-7 py-2 space-y-5">
            <p className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed text-center">
              We have updated our <strong className="text-zinc-900 dark:text-white font-semibold">Privacy Policy</strong> and <strong className="text-zinc-900 dark:text-white font-semibold">Terms of Service</strong> regarding client-side AI request processing. Please accept to continue.
            </p>

            {/* Checkboxes container */}
            <div className="space-y-3.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 p-4 backdrop-blur-sm">
              {/* Terms checkbox */}
              <label className="flex items-start gap-3.5 cursor-pointer group" id="consent-terms-label">
                <input
                  id="consent-terms-checkbox"
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded-lg border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-zinc-500/30 dark:focus:ring-zinc-400/30 focus:ring-offset-0 focus:ring-2 accent-zinc-900 dark:accent-zinc-100 cursor-pointer transition-all"
                  disabled={submitting}
                />
                <div className="text-xs select-none">
                  <span className="text-zinc-650 dark:text-zinc-350 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      className="text-zinc-900 dark:text-white hover:underline inline-flex items-center gap-1 font-semibold transition-colors"
                    >
                      Terms of Service <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                  </span>
                </div>
              </label>

              {/* Privacy checkbox */}
              <label className="flex items-start gap-3.5 cursor-pointer group" id="consent-privacy-label">
                <input
                  id="consent-privacy-checkbox"
                  type="checkbox"
                  checked={privacyChecked}
                  onChange={(e) => setPrivacyChecked(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded-lg border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-zinc-500/30 dark:focus:ring-zinc-400/30 focus:ring-offset-0 focus:ring-2 accent-zinc-900 dark:accent-zinc-100 cursor-pointer transition-all"
                  disabled={submitting}
                />
                <div className="text-xs select-none">
                  <span className="text-zinc-650 dark:text-zinc-350 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    I agree to the{' '}
                    <Link
                      to="/privacy"
                      target="_blank"
                      className="text-zinc-900 dark:text-white hover:underline inline-flex items-center gap-1 font-semibold transition-colors"
                    >
                      Privacy Policy <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                  </span>
                </div>
              </label>
            </div>

            {/* Info about Puter.js */}
            <div className="rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 p-3">
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-700 dark:text-zinc-300">Why?</strong> AI queries run directly in your browser using Puter.js, saving rate limits while keeping data anonymous.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-7 pb-7 pt-4">
            <button
              id="consent-accept-button"
              type="button"
              onClick={handleAccept}
              disabled={!termsChecked || !privacyChecked || submitting}
              className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 py-3 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100 disabled:active:scale-100"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'I Agree & Continue'
              )}
            </button>
            <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 mt-3">
              Consent is logged with a secure timestamp.c-400 dark:text-zinc-550 mt-3">
              Consent is logged with a secure timestamp.
            </p>
          </div>
        </LiquidGlassCard>
      </div>
    </>
  );
}
