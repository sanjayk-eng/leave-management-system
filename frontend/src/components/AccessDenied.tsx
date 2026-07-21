import React, { useState, useRef, useCallback } from 'react';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Mail } from 'lucide-react';

/**
 * AccessDenied — re-themed to match the app's actual design tokens
 * (see theme.css: --primary #4F46E5, light surface, semantic colors
 * only used for status). No dark/neon styling — this now looks like
 * it belongs to the same product as the rest of the dashboard.
 *
 * Uses the CSS variables from theme.css directly, so if you update
 * the palette there, this page updates automatically.
 */

function Button({ children, onClick, variant = 'secondary', icon: Icon, ariaLabel }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const styles =
    variant === 'primary'
      ? 'btn-primary focus-visible:ring-[var(--primary)]'
      : 'btn-secondary focus-visible:ring-[var(--border)]';

  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={`${base} ${styles}`}>
      {Icon && <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function AccessDenied({
  onGoBack,
  onGoDashboard,
  onRequestAccess,
  title = 'Access Denied',
  subtitle = "You don't have permission to access this page.",
  description = 'Your current role or permissions do not allow access to this resource. Contact your administrator if you believe this is an error.',
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMove = useCallback((e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -2.5, ry: px * 3 });
  }, []);

  const handleLeave = useCallback(() => setTilt({ rx: 0, ry: 0 }), []);

  const goBack = onGoBack ?? (() => window.history.back());
  const goDashboard = onGoDashboard ?? (() => (window.location.href = '/'));
  const requestAccess =
    onRequestAccess ?? (() => (window.location.href = 'mailto:admin@example.com?subject=Access%20Request'));

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center p-4"
      style={{ background: 'var(--background, #F7F8FA)' }}
    >
      <style>{`
        @keyframes ad-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .ad-in { animation: ad-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .ad-in-1 { animation-delay: 0.05s; }
        .ad-in-2 { animation-delay: 0.12s; }
        .ad-in-3 { animation-delay: 0.18s; }
        .ad-in-4 { animation-delay: 0.24s; }
        @media (prefers-reduced-motion: reduce) { .ad-in { animation: none !important; } }

        .btn-primary {
          background: var(--primary, #4F46E5);
          color: var(--primary-foreground, #fff);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 4px 12px -4px color-mix(in srgb, var(--primary, #4F46E5) 45%, transparent);
        }
        .btn-primary:hover { filter: brightness(1.08); box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 6px 18px -4px color-mix(in srgb, var(--primary, #4F46E5) 60%, transparent); }
        .btn-primary:active { filter: brightness(0.97); }
        .btn-secondary {
          background: var(--surface, #fff);
          color: var(--foreground, #111827);
          border: 1px solid var(--border, #E5E7EB);
        }
        .btn-secondary:hover { background: #FAFAFB; border-color: #D1D5DB; }
        .btn-secondary:active { background: #F3F4F6; }
      `}</style>

      {/* soft ambient tint behind the card, in the semantic "restricted" color */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, var(--danger-soft, #FEE2E0) 0%, transparent 70%)', opacity: 0.6 }}
        aria-hidden="true"
      />

      <main
        className="relative z-10 w-full max-w-md"
        style={{ perspective: '1200px' }}
        role="alert"
        aria-labelledby="ad-title"
        aria-describedby="ad-desc"
      >
        <div
          ref={cardRef}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          className="ad-in rounded-2xl px-8 py-10 text-center"
          style={{
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #E5E7EB)',
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: 'transform 0.2s ease-out',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 24px 48px -20px rgba(17,24,39,0.18)',
          }}
        >
          <div
            className="ad-in ad-in-1 mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--danger-soft, #FEE2E2)' }}
          >
            <ShieldAlert className="h-7 w-7" style={{ color: 'var(--danger, #DC2626)' }} strokeWidth={1.75} aria-hidden="true" />
          </div>

          <p
            className="ad-in ad-in-1 mt-6 text-sm font-semibold tracking-wide"
            style={{ color: 'var(--danger, #DC2626)' }}
          >
            Error 403
          </p>

          <h1
            id="ad-title"
            className="ad-in ad-in-2 mt-2 text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--foreground, #111827)' }}
          >
            {title}
          </h1>

          <p className="ad-in ad-in-2 mt-2 text-sm font-medium" style={{ color: 'var(--foreground, #111827)' }}>
            {subtitle}
          </p>

          <p
            id="ad-desc"
            className="ad-in ad-in-3 mx-auto mt-3 max-w-sm text-sm leading-6"
            style={{ color: 'var(--muted-foreground, #6B7280)' }}
          >
            {description}
          </p>

          <div className="ad-in ad-in-4 mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={goBack} icon={ArrowLeft} ariaLabel="Go back to the previous page">
              Go Back
            </Button>
            <Button onClick={goDashboard} icon={LayoutDashboard} variant="primary" ariaLabel="Go to dashboard">
              Go to Dashboard
            </Button>
          </div>

          <div className="ad-in ad-in-4 mt-5">
            <button
              type="button"
              onClick={requestAccess}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 rounded"
              style={{ color: 'var(--muted-foreground, #6B7280)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary, #4F46E5)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground, #6B7280)')}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Request Access
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AccessDenied;