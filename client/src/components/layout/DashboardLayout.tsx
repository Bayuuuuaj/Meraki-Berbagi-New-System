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
  Brain
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
import { AnimatePresence, motion } from "framer-motion";

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className="w-full"
  >
    {children}
  </motion.div>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
    // AI Dashboard moved to admin items
    { title: "Absensi", icon: CalendarCheck, url: "/attendance" },
    { title: "Kas & Treasury", icon: Wallet, url: "/treasury" },
    { title: "Notifikasi", icon: Bell, url: "/notifications" },
    { title: "Pengaturan", icon: Settings, url: "/settings" },
  ];

  const adminItems = [
    { title: "AI Dashboard", icon: Brain, url: "/ai-dashboard" },
    { title: "Anggota", icon: Users, url: "/members" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background pb-16 lg:pb-0">
        <div className="hidden lg:block h-full">
          <Sidebar collapsible="icon" className="border-r border-border shadow-soft h-full">
            <SidebarHeader className="h-16 flex items-center justify-center border-b border-border px-4 bg-card">
              <div className="flex items-center gap-3 w-full overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:justify-center">
                <img
                  src={logoImage}
                  alt="Meraki Berbagi Logo"
                  className="h-10 w-10 object-contain shrink-0"
                />
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden" style={{ fontFamily: "'Paytone One', sans-serif" }}>
                  <span className="font-bold text-2xl tracking-tight text-foreground drop-shadow-sm">Meraki</span>
                  <span className="text-sm text-primary uppercase tracking-widest font-bold">Berbagi</span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="px-3 py-6 gap-6">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
                  Menu Utama
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url}
                          tooltip={item.title}
                          className="transition-all duration-200 hover:translate-x-1 hover:bg-accent/80 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm rounded-lg h-10"
                        >
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
                  <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
                    Admin Area
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {adminItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === item.url}
                            tooltip={item.title}
                            className="transition-all duration-200 hover:translate-x-1 hover:bg-accent/80 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm rounded-lg h-10"
                          >
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

        <main className="flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ease-in-out">
          <header className="h-16 border-b border-border flex items-center px-6 bg-background/80 backdrop-blur-lg sticky top-0 z-10 shadow-soft">
            <SidebarTrigger className="mr-4 hover:bg-accent/80 rounded-lg transition-colors" />
            <div className="flex-1">
              <h1 className="text-lg font-heading font-bold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {location === "/" ? "Dashboard" : location.split("/")[1].replace("-", " ")}
              </h1>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6 bg-gradient-to-br from-muted/30 via-background to-muted/20">
            <div className="max-w-7xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <PageTransition key={location}>
                  {children}
                </PageTransition>
              </AnimatePresence>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
