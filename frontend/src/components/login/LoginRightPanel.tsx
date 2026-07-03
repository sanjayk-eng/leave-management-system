import { Shield, Users, Calendar } from "lucide-react";

const LoginRightPanel = () => (
  <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 items-center justify-center relative overflow-hidden">

    {/* ── Animated background blobs ──────────────────────────────────── */}
    <div className="absolute inset-0 opacity-10 pointer-events-none">
      <div
        className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"
        style={{ animation: "floatBlob1 8s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"
        style={{ animation: "floatBlob2 10s ease-in-out infinite" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl opacity-50"
        style={{ animation: "floatBlob1 12s ease-in-out infinite reverse" }}
      />
    </div>

    {/* ── Content ───────────────────────────────────────────────────── */}
    <div className="relative z-10 max-w-lg space-y-8 text-white">

      {/* Heading — slides in from left */}
      <div
        className="space-y-4 animate-in fade-in-0 slide-in-from-left-8 duration-700"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <h2 className="text-5xl font-bold leading-tight">
          Elevate Your HR Operations
        </h2>
        <p className="text-xl text-white/90">
          Comprehensive cloud-based HR management platform for employee tracking,
          leave management, payroll processing, and automated approval workflows.
        </p>
      </div>

      {/* Feature cards — staggered slide-in from right */}
      <div className="space-y-6 pt-8">

        <div
          className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20
                     hover:bg-white/20 hover:scale-[1.02] hover:shadow-lg
                     transition-all duration-300 cursor-default
                     animate-in fade-in-0 slide-in-from-right-6 duration-700"
          style={{ animationDelay: "250ms", animationFillMode: "both" }}
        >
          <div className="p-3 bg-white/20 rounded-lg transition-transform duration-300 hover:rotate-6">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Employee Management</h3>
            <p className="text-white/80 text-sm">
              Comprehensive employee records and management tools
            </p>
          </div>
        </div>

        <div
          className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20
                     hover:bg-white/20 hover:scale-[1.02] hover:shadow-lg
                     transition-all duration-300 cursor-default
                     animate-in fade-in-0 slide-in-from-right-6 duration-700"
          style={{ animationDelay: "400ms", animationFillMode: "both" }}
        >
          <div className="p-3 bg-white/20 rounded-lg transition-transform duration-300 hover:rotate-6">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Leave Management</h3>
            <p className="text-white/80 text-sm">
              Track and approve leave requests with ease
            </p>
          </div>
        </div>

        <div
          className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20
                     hover:bg-white/20 hover:scale-[1.02] hover:shadow-lg
                     transition-all duration-300 cursor-default
                     animate-in fade-in-0 slide-in-from-right-6 duration-700"
          style={{ animationDelay: "550ms", animationFillMode: "both" }}
        >
          <div className="p-3 bg-white/20 rounded-lg transition-transform duration-300 hover:rotate-6">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Secure & Reliable</h3>
            <p className="text-white/80 text-sm">
              Enterprise-grade security for your sensitive data
            </p>
          </div>
        </div>

      </div>
    </div>

    {/* ── Keyframes ──────────────────────────────────────────────────── */}
    <style>{`
      @keyframes floatBlob1 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33%       { transform: translate(30px, -20px) scale(1.05); }
        66%       { transform: translate(-20px, 15px) scale(0.97); }
      }
      @keyframes floatBlob2 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33%       { transform: translate(-25px, 20px) scale(1.03); }
        66%       { transform: translate(20px, -15px) scale(0.98); }
      }
    `}</style>
  </div>
);

export default LoginRightPanel;
