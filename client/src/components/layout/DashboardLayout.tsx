import React from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarCheck,
  Wallet,
  Users,
  LogOut,
  Settings,
  Menu,
  Bell,
  Brain,
  User
} from "lucide-react";
import logoImage from "@assets/Kebutuhan_logo-04_1765812559569.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/layout/BottomNav";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();

  // Null Guard: Prevent crash if context is not ready
  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin text-primary rounded-full border-2 border-current border-t-transparent" />
          <p className="text-muted-foreground text-sm animate-pulse">Memuat Sesi...</p>
        </div>
      </div>
    );
  }

  const menuItems = React.useMemo(() => [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Absensi", icon: CalendarCheck, url: "/attendance" },
    { title: "Kas & Treasury", icon: Wallet, url: "/treasury" },
    { title: "Profil Saya", icon: User, url: "/profile" },
    { title: "Notifikasi", icon: Bell, url: "/notifications" },
    { title: "Pengaturan", icon: Settings, url: "/settings" },
  ], []);

  const adminItems = React.useMemo(() => [
    { title: "AI Dashboard", icon: Brain, url: "/ai-dashboard" },
    { title: "Anggota", icon: Users, url: "/members" },
  ], []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background relative selection:bg-primary/10">
        <div className="hidden lg:block h-full">
          {/* ... Sidebar ... */}
          <Sidebar collapsible="icon" className="border-r border-border shadow-soft h-full">
            {/* Same content as before, keeping brevity */}
            <SidebarHeader className="h-20 flex items-center justify-center border-b border-border px-4 bg-card">
              <div className="flex items-center justify-center w-full transition-all duration-300 group-data-[collapsible=icon]:px-0">
                <img src="/images/logo-meraki.png" alt="Meraki Berbagi Logo" className="h-14 w-auto object-contain shrink-0 group-data-[collapsible=icon]:h-12" />
              </div>
            </SidebarHeader>
            <SidebarContent className="px-3 py-6 gap-6">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">Menu Utama</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={location === item.url} tooltip={item.title} className="transition-all duration-200 hover:translate-x-1 hover:bg-accent/80 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm rounded-lg h-10">
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {user?.role === "admin" && (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">Admin Area</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {adminItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={location === item.url} tooltip={item.title} className="transition-all duration-200 hover:translate-x-1 hover:bg-accent/80 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm rounded-lg h-10">
                            <Link href={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </SidebarContent>
            <SidebarFooter className="p-3 border-t border-border bg-card/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start px-3 gap-3 h-14 hover:bg-accent/80 rounded-lg group">
                    <Avatar className="h-9 w-9 border-2 border-primary/20 transition-all group-hover:scale-105 group-hover:border-primary/40 shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm group-data-[collapsible=icon]:hidden">
                      <span className="font-semibold truncate w-32 text-left text-foreground">{user?.name}</span>
                      <span className="text-xs text-muted-foreground capitalize font-medium">{user?.role}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 shadow-medium" side="right">
                  <DropdownMenuLabel className="font-semibold">Akun Saya</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
        </div>

        <main className="flex-1 relative flex flex-col min-h-screen w-full transition-all duration-300 ease-in-out bg-slate-50">
          {/* Safe Area Guard - Instagram Style */}
          <div className="h-[env(safe-area-inset-top,32px)] lg:h-0 bg-white/90 backdrop-blur-md sticky top-0 z-50" />

          {/* Instagram-Style Header: Clean, Modern, 56px */}
          <header className="h-14 shrink-0 border-b border-slate-100 flex items-center px-4 lg:px-6 bg-white/90 backdrop-blur-md sticky top-[env(safe-area-inset-top,32px)] lg:top-0 z-[40]">
            <SidebarTrigger className="mr-3 lg:mr-4 hover:bg-slate-100 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center" />
            <h1 className="text-xl font-bold text-slate-900 flex-1">
              {location === "/" ? "Dashboard" : location.split("/")[1].replace("-", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
            </h1>
          </header>
          <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-32 md:pb-8">
            <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-4 pb-32 relative">
              {children}
            </div>
          </div>
        </main>
        <div className="z-[40] will-change-transform opacity-[0.98]">
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
