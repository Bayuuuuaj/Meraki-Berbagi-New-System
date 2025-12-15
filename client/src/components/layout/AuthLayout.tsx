import { HeartHandshake } from "lucide-react";
import logoImage from "@assets/IMG_1120_1764437147221.PNG";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
           <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] rounded-full bg-white mix-blend-overlay blur-3xl animate-pulse" />
           <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-secondary mix-blend-multiply blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <img 
            src={logoImage} 
            alt="Meraki Berbagi Logo" 
            className="h-12 w-12 rounded-full object-cover bg-white/10 backdrop-blur-sm border border-white/20"
          />
          <h1 className="text-2xl font-heading font-bold tracking-tight">Meraki Berbagi</h1>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <blockquote className="text-3xl font-heading font-medium leading-tight">
            "Satu tindakan kebaikan kecil lebih berharga daripada niat termulia."
          </blockquote>
          <div className="flex flex-col gap-1">
            <p className="text-lg opacity-90 font-medium">Bergabunglah dalam gerakan kebaikan.</p>
            <p className="text-sm opacity-70">Kelola kegiatan sosial Anda dengan mudah dan transparan.</p>
          </div>
        </div>
        
        <div className="relative z-10 text-xs opacity-50">
          © 2024 Meraki Berbagi Foundation. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
          {children}
        </div>
      </div>
    </div>
  );
}
