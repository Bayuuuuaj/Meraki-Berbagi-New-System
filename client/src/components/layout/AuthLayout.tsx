import { HeartHandshake } from "lucide-react";
import logoImage from "@assets/Kebutuhan_logo-04_1765812559569.png";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-primary p-12 text-primary-foreground relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] rounded-full bg-white mix-blend-overlay blur-3xl" />
          <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-secondary mix-blend-multiply blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center">
          <img
            src="/images/logo-meraki.png"
            alt="Meraki Berbagi Logo"
            className="h-24 w-auto object-contain drop-shadow-lg"
          />
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <HeartHandshake className="w-4 h-4" />
              <span className="text-sm font-semibold">Transparansi & Kepercayaan</span>
            </div>
            <blockquote className="text-3xl md:text-4xl font-heading font-bold leading-tight">
              "Satu tindakan kebaikan kecil lebih berharga daripada niat termulia."
            </blockquote>
          </div>
          <div className="flex flex-col gap-3 pl-4 border-l-4 border-white/30">
            <p className="text-lg font-semibold opacity-95">Bergabunglah dalam gerakan kebaikan.</p>
            <p className="text-sm opacity-75 leading-relaxed">Kelola kegiatan sosial Anda dengan mudah dan transparan. Platform terpercaya untuk manajemen relawan dan keuangan organisasi.</p>
          </div>
        </div>

        <div className="relative z-10 text-xs opacity-60 font-medium">
          © 2024 Meraki Berbagi Foundation. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary-foreground/5 opacity-50" />

        <div className="w-full max-w-md space-y-8 relative z-10 animate-slide-up">
          {children}
        </div>
      </div>
    </div>
  );
}
