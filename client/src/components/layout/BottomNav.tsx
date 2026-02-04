import { Link, useLocation } from "wouter";
import { LayoutDashboard, Wallet, User, Brain } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

interface NavItem {
    title: string;
    icon: React.ElementType;
    url: string;
}

const navItems: NavItem[] = [
    { title: "Home", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Kas", icon: Wallet, url: "/treasury" },
    { title: "AI", icon: Brain, url: "/ai-dashboard" },
    { title: "Profil", icon: User, url: "/profile" },
];

export function BottomNav() {
    const [location] = useLocation();
    const { user } = useAuth();

    const visibleItems = navItems.filter(item => {
        if (item.url === "/ai-dashboard" && user?.role !== "admin") return false;
        return true;
    });

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg safe-bottom will-change-transform opacity-100"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            <div className="flex justify-around items-center px-2 h-16">
                {visibleItems.map((item) => {
                    const isActive = location === item.url;
                    const Icon = item.icon;

                    return (
                        <Link key={item.url} href={item.url}>
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200 ${isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <div className="relative">
                                    <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </div>
                                <span className={`text-[10px] mt-1 font-medium ${isActive ? "font-semibold" : ""}`}>
                                    {item.title}
                                </span>
                            </motion.button>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
