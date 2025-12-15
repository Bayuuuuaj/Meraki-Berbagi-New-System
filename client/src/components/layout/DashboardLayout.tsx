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
  Bell
} from "lucide-react";
import logoImage from "@assets/IMG_1120_1764437147221.PNG";
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Absensi", icon: CalendarCheck, url: "/attendance" },
    { title: "Kas & Treasury", icon: Wallet, url: "/treasury" },
    { title: "Notifikasi", icon: Bell, url: "/notifications" },
  ];

  const adminItems = [
    { title: "Anggota", icon: Users, url: "/members" },
    { title: "Pengaturan", icon: Settings, url: "/settings" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="h-16 flex items-center justify-center border-b border-border/40 px-4">
            <div className="flex items-center gap-3 w-full overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:justify-center">
              <img 
                src={logoImage} 
                alt="Meraki Berbagi Logo" 
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-heading font-bold text-lg tracking-tight">Meraki</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Berbagi</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-2 py-4 gap-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
                Menu Utama
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url}
                        tooltip={item.title}
                        className="transition-all duration-200 hover:translate-x-1 hover:bg-accent"
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
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Admin Area
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location === item.url}
                          tooltip={item.title}
                          className="transition-all duration-200 hover:translate-x-1 hover:bg-accent"
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

          <SidebarFooter className="p-2 border-t border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start px-2 gap-2 h-12 hover:bg-accent group">
                  <Avatar className="h-8 w-8 border border-border transition-transform group-hover:scale-105">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm group-data-[collapsible=icon]:hidden">
                    <span className="font-medium truncate w-32 text-left">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" side="right">
                <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ease-in-out">
          <header className="h-16 border-b border-border/40 flex items-center px-6 bg-background/50 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              {/* Breadcrumbs could go here */}
              <h1 className="text-lg font-heading font-semibold capitalize text-foreground/80">
                {location === "/" ? "Dashboard" : location.split("/")[1]}
              </h1>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 space-y-6 bg-muted/20">
             <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
             </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
