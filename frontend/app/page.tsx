'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Shield, User, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

type State = 'idle' | 'loading' | 'redirect';

export default function LandingPage() {
  const [state, setState] = useState<State>('idle');
  const router = useRouter();

  const handleSignIn = () => {
    setState('loading');
    setTimeout(() => setState('redirect'), 1200);
    setTimeout(() => router.push('/repos'), 2400);
  };

  return (
    <div className="login-shell">
      <div className="login-grid-bg" aria-hidden />

      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden />
          <span>Reviewly</span>
        </div>

        <div className="login-body">
          <h1 className="login-tagline">AI code reviews on every pull request.</h1>
          <p className="login-prop">
            Reviewly reads the diff the second a PR opens, posts a severity-tagged
            review, and flags the one thing that&rsquo;ll bite you in production &mdash;
            usually before CI finishes.
          </p>

          {state === 'idle' && (
            <button className="btn login-cta" onClick={handleSignIn}>
              <Github size={18} />
              Continue with GitHub
              <ArrowRight size={14} className="cta-arrow" />
            </button>
          )}
          {state === 'loading' && (
            <button className="btn login-cta loading" disabled>
              <span className="spinner" />
              Connecting to GitHub&hellip;
            </button>
          )}
          {state === 'redirect' && (
            <button className="btn login-cta redirect" disabled>
              <ExternalLink size={14} />
              Redirecting to github.com&hellip;
            </button>
          )}

          <p className="login-micro">
            <Shield size={11} />
            We only request <strong>read access</strong> to repositories you select.
          </p>

          <div className="login-divider"><span>or</span></div>

          <button className="btn login-secondary">
            <User size={14} />
            Continue with SSO &middot;{' '}
            <span className="faint" style={{ marginLeft: 4 }}>SAML / Okta</span>
          </button>
        </div>

        <div className="login-foot">
          <a href="#">Docs</a>
          <span className="login-foot-sep">&middot;</span>
          <a href="#">Privacy</a>
          <span className="login-foot-sep">&middot;</span>
          <a href="#">Terms</a>
          <span style={{ flex: 1 }} />
          <span className="faint">v1.4</span>
        </div>
      </div>

      <div className="login-ticker">
        <span className="badge accent"><Sparkles size={10} /> Live</span>
        <span className="faint">Reviewly posted&nbsp;</span>
        <span className="mono">128 reviews</span>
        <span className="faint">&nbsp;in the last 24h across&nbsp;</span>
        <span className="mono">1,204 repos</span>
      </div>
    </div>
  );
}
