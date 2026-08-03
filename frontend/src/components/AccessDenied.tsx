import React, { useState, useRef, useCallback } from 'react';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Mail } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: React.ElementType;
  ariaLabel: string;
}

function Button({ children, onClick, variant = 'secondary', icon: Icon, ariaLabel }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  const styles =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95'
      : 'bg-card text-foreground border border-border hover:bg-secondary active:bg-muted';

  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={`${base} ${styles}`}>
      {Icon && <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

interface AccessDeniedProps {
  onGoBack?: () => void;
  onGoDashboard?: () => void;
  onRequestAccess?: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
}

export function AccessDenied({
  onGoBack,
  onGoDashboard,
  onRequestAccess,
  title = 'Access Denied',
  subtitle = "You don't have permission to access this page.",
  description = 'Your current role or permissions do not allow access to this resource. Contact your administrator if you believe this is an error.',
}: AccessDeniedProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
      <style>{`
        @keyframes ad-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .ad-in { animation: ad-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .ad-in-1 { animation-delay: 0.05s; }
        .ad-in-2 { animation-delay: 0.12s; }
        .ad-in-3 { animation-delay: 0.18s; }
        .ad-in-4 { animation-delay: 0.24s; }
        @media (prefers-reduced-motion: reduce) { .ad-in { animation: none !important; } }
      `}</style>

      {/* soft ambient glow behind the card */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/10"
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
          className="ad-in rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-xl dark:shadow-black/40"
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          {/* Icon badge */}
          <div className="ad-in ad-in-1 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 dark:bg-destructive/20">
            <ShieldAlert
              className="h-7 w-7 text-destructive"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </div>

          <p className="ad-in ad-in-1 mt-6 text-sm font-semibold tracking-wide text-destructive">
            Error 403
          </p>

          <h1
            id="ad-title"
            className="ad-in ad-in-2 mt-2 text-2xl font-semibold tracking-tight text-foreground"
          >
            {title}
          </h1>

          <p className="ad-in ad-in-2 mt-2 text-sm font-medium text-foreground">
            {subtitle}
          </p>

          <p
            id="ad-desc"
            className="ad-in ad-in-3 mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground"
          >
            {description}
          </p>

          <div className="ad-in ad-in-4 mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={goBack} icon={ArrowLeft} ariaLabel="Go back to the previous page">
              Go Back
            </Button>
            <Button
              onClick={goDashboard}
              icon={LayoutDashboard}
              variant="primary"
              ariaLabel="Go to dashboard"
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="ad-in ad-in-4 mt-5">
            <button
              type="button"
              onClick={requestAccess}
              className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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