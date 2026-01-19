import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Star, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementSectionProps {
    badges: string[];
    contributionScore: number;
}

const BADGE_CONFIG = [
    {
        tier: "Impact Maker",
        icon: Sparkles,
        color: "bg-blue-100 text-blue-700 border-blue-200",
        description: "Tercapai jika skor kontribusi > 100.",
        threshold: 100,
    },
    {
        tier: "Meraki Champion",
        icon: Trophy,
        color: "bg-slate-100 text-slate-700 border-slate-200",
        description: "Tercapai jika skor kontribusi > 500.",
        threshold: 500,
    },
    {
        tier: "Impact Hero",
        icon: ShieldCheck,
        color: "bg-amber-100 text-amber-700 border-amber-200",
        description: "Tercapai jika skor kontribusi > 1000 atau hadir 5 kali berturut-turut.",
        threshold: 1000,
    },
];

export default function AchievementSection({ badges, contributionScore }: AchievementSectionProps) {
    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <CardTitle className="text-xl">Lencana Digital</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="px-0 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {BADGE_CONFIG.map((badge) => {
                        const hasBadge = badges.includes(badge.tier);
                        const Icon = badge.icon;

                        return (
                            <div
                                key={badge.tier}
                                className={cn(
                                    "relative group overflow-hidden rounded-xl border-2 p-4 transition-all duration-300",
                                    hasBadge
                                        ? cn("bg-white shadow-md border-transparent hover:scale-105", badge.tier === "Impact Hero" ? "border-amber-400" : "")
                                        : "bg-muted/50 border-dashed border-muted-foreground/20 grayscale opacity-60"
                                )}
                            >
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className={cn(
                                        "p-3 rounded-full transition-transform duration-500 group-hover:rotate-12",
                                        hasBadge ? badge.color : "bg-muted text-muted-foreground"
                                    )}>
                                        <Icon className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className={cn(
                                            "font-bold text-sm",
                                            hasBadge ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {badge.tier}
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                            {badge.description}
                                        </p>
                                    </div>
                                    {hasBadge ? (
                                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100 text-[10px]">
                                            Achieved
                                        </Badge>
                                    ) : (
                                        <div className="w-full bg-muted-foreground/10 h-1.5 rounded-full overflow-hidden mt-1">
                                            <div
                                                className="bg-primary/30 h-full transition-all duration-500"
                                                style={{ width: `${Math.min((contributionScore / badge.threshold) * 100, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                {hasBadge && badge.tier === "Impact Hero" && (
                                    <div className="absolute top-0 right-0 p-1">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
