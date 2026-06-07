/**
 * PuterGate — One-time "Complete Your Account" overlay.
 *
 * Shows ONLY to users who have NEVER activated (no record in puter_tokens).
 * Once activated, the overlay NEVER appears again — we trust the DB flag.
 * 
 * The Puter SDK manages its own session via cookies. If the SDK's session
 * expires, puter.ai.chat() will auto-prompt for re-auth internally.
 * We don't interfere with that — PuterGate is purely a first-time gate.
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { Sparkles, Zap, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useClerkAuth } from '../contexts/ClerkAuthContext';
import { LiquidGlassCard } from './ui/LiquidGlassCard';

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface PuterTokenContextType {
  puterToken: string | null;
  tokenStatus: 'loading' | 'active' | 'missing' | 'expired';
  refreshPuterAuth: () => void;
  clearPuterToken: () => void;
}

const PuterTokenContext = createContext<PuterTokenContextType>({
  puterToken: null,
  tokenStatus: 'loading',
  refreshPuterAuth: () => {},
  clearPuterToken: () => {},
});

export const usePuterToken = () => useContext(PuterTokenContext);

/* ------------------------------------------------------------------ */
/* SDK types                                                           */
/* ------------------------------------------------------------------ */

declare const puter: {
  auth: {
    signIn: (options?: { attempt_temp_user_creation?: boolean }) => Promise<any>;
    isSignedIn: () => boolean;
  };
  ai: { chat: (...args: any[]) => Promise<any> };
  authToken?: string;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PuterGate({ children }: { children: React.ReactNode }) {
  const { userId, supabase, loading: authLoading } = useClerkAuth();

  const [tokenStatus, setTokenStatus] = useState<'loading' | 'active' | 'missing' | 'expired'>('loading');
  const [puterToken, setPuterToken] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [activationStep, setActivationStep] = useState<'idle' | 'popup' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // ─── One-time DB check: has user EVER activated? ─────────────────
  useEffect(() => {
    async function checkActivation() {
      if (!userId || !supabase) return;

      try {
        const { data, error: fetchErr } = await supabase
          .from('puter_tokens')
          .select('puter_token')
          .eq('user_id', userId)
          .eq('token_status', 'active')
          .maybeSingle();

        if (fetchErr) {
          console.warn('PuterGate: check failed:', fetchErr.message);
          setTokenStatus('missing');
          return;
        }

        if (data?.puter_token) {
          // User already activated — pass through immediately, NEVER show overlay
          setPuterToken(data.puter_token);
          setTokenStatus('active');
        } else {
          // Never activated — show overlay
          setTokenStatus('missing');
        }
      } catch {
        setTokenStatus('missing');
      }
    }

    if (!authLoading && userId && supabase) {
      checkActivation();
    }
  }, [userId, supabase, authLoading]);

  // ─── First-time activation ───────────────────────────────────────
  async function handleActivateAI() {
    if (activating || !userId || !supabase) return;

    setActivating(true);
    setError(null);
    setActivationStep('popup');

    try {
      if (typeof puter === 'undefined' || !puter?.auth?.signIn) {
        throw new Error('AI service is loading. Please wait a moment and try again.');
      }

      await puter.auth.signIn({ attempt_temp_user_creation: true });

      const token = puter.authToken || 'puter_session_active';

      setActivationStep('saving');

      const { error: upsertErr } = await supabase
        .from('puter_tokens')
        .upsert(
          {
            user_id: userId,
            puter_token: token,
            token_status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertErr) {
        throw new Error('Failed to save AI configuration. Please try again.');
      }

      setPuterToken(token);
      setActivationStep('done');

      setTimeout(() => {
        setTokenStatus('active');
      }, 1500);
    } catch (err: any) {
      if (err?.error === 'auth_window_closed' || err?.error === 'popup_blocked') {
        setError('The popup was closed. Please click the button again.');
      } else {
        setError(err?.message || 'Activation failed. Please try again.');
      }
      setActivationStep('error');
    } finally {
      setActivating(false);
    }
  }

  function refreshPuterAuth() {
    setTokenStatus('missing');
    setPuterToken(null);
    setActivationStep('idle');
    setError(null);
  }

  function clearPuterToken() {
    setPuterToken(null);
    setTokenStatus('expired');
  }

  const contextValue: PuterTokenContextType = {
    puterToken,
    tokenStatus,
    refreshPuterAuth,
    clearPuterToken,
  };

  // Loading or already activated → render children
  if (authLoading || tokenStatus === 'loading' || tokenStatus === 'active') {
    return (
      <PuterTokenContext.Provider value={contextValue}>
        {children}
      </PuterTokenContext.Provider>
    );
  }

  // ─── First-time overlay ──────────────────────────────────────────
  return (
    <PuterTokenContext.Provider value={contextValue}>
      {/* Underlying app active and visible */}
      <div className="pointer-events-none opacity-95 select-none" aria-hidden="true">
        {children}
      </div>

      {/* Full-screen blocking glass overlay */}
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/10 dark:bg-black/40 p-4 transition-all duration-300">
        <LiquidGlassCard
          borderRadius="28px"
          blurIntensity="xl"
          shadowIntensity="md"
          glowIntensity="lg"
          className="w-full max-w-md bg-white/70 dark:bg-zinc-950/70 border border-zinc-250/80 dark:border-zinc-800/60 shadow-xl dark:shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        >
          {/* Top subtle glow effect */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-400/20 dark:via-white/10 to-transparent" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-20 bg-zinc-500/5 dark:bg-white/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="px-6 pt-7 pb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-inner">
              {activationStep === 'done' ? (
                <CheckCircle2 className="h-5.5 w-5.5 text-green-500 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)] animate-bounce" />
              ) : (
                <Sparkles className="h-5.5 w-5.5 text-zinc-700 dark:text-zinc-300 drop-shadow-[0_0_6px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]" />
              )}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-wide">
              {activationStep === 'done' ? 'All Set! 🎉' : 'One More Step!'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {activationStep === 'done'
                ? 'Your AI assistant is ready to go.'
                : 'Connect your AI assistant to complete setup.'}
            </p>
          </div>

          {/* Body */}
          <div className="px-7 py-2 space-y-5">
            {activationStep !== 'done' && (
              <>
                <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed text-center">
                  We use <strong className="text-zinc-900 dark:text-white font-semibold">Puter.js</strong> to power your AI assistant — completely free, no credit card needed. A quick popup will set up your AI session in seconds.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: '⚡', label: 'Instant Setup' },
                    { icon: '🔒', label: 'No Data Shared' },
                    { icon: '💳', label: 'Completely Free' },
                    { icon: '🤖', label: 'Unlimited AI' },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 px-3 py-2"
                    >
                      <span className="text-base">{f.icon}</span>
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">{f.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-red-600 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            {activationStep !== 'done' && (
              <button
                id="puter-activate-button"
                type="button"
                onClick={handleActivateAI}
                disabled={activating}
                className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 py-3 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {activating ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {activationStep === 'popup' ? 'Waiting for popup...' : 'Saving...'}
                  </>
                ) : activationStep === 'error' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try Again
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    Activate AI ✨
                  </>
                )}
              </button>
            )}

            {activationStep === 'done' && (
              <div className="text-center py-2 animate-pulse">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-4 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    Redirecting you now...
                  </span>
                </div>
              </div>
            )}

            <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500">
              A secure popup from Puter.com will open. It creates a free temporary session for AI access. No personal data is shared.
            </p>
          </div>
        </LiquidGlassCard>
      </div>
    </PuterTokenContext.Provider>
  );
}
