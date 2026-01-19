import { Link, useLocation } from "wouter";
import { LayoutDashboard, Wallet, Users, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

interface NavItem {
    title: string;
    icon: React.ElementType;
    url: string;
}

const navItems: NavItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Kas", icon: Wallet, url: "/treasury" },
    { title: "Anggota", icon: Users, url: "/members" },
    { title: "Profil", icon: User, url: "/settings" },
];

export function BottomNav() {
    const [location] = useLocation();
    const { user } = useAuth();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass border-t border-white/20"
            style={{
                paddingBottom: 'var(--safe-area-inset-bottom)',
            }}
        >
            <div className="flex justify-around items-center px-2 py-2">
                {navItems.map((item) => {
                    const isActive = location === item.url;
                    const Icon = item.icon;

                    return (
                        <Link key={item.url} href={item.url}>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
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
