import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Users, Calendar, ChevronRight, ArrowUpRight, Check, Link2, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VolunteerSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { type Volunteer } from "@shared/schema";

export default function VolunteerSection() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
    const [volunteerCopied, setVolunteerCopied] = useState(false);

    const { data: volunteers = [], isLoading } = useQuery<Volunteer[]>({
        queryKey: ["/api/volunteers"],
    });

    const activeVolunteers = volunteers.filter(
        (v) => v.status === "open" && isAfter(new Date(v.deadline), new Date())
    );

    const handleRegistration = (volunteer: Volunteer) => {
        // Haptic Feedback
        if (window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }

        if (!user) {
            toast({
                title: "Perlu Masuk",
                description: "Silakan login terlebih dahulu untuk mendaftar sebagai volunteer.",
                variant: "default",
            });
            setLocation("/login");
            return;
        }

        setSelectedVolunteer(volunteer);
    };

    const getSafeUrl = (url: string) => {
        if (!url) return "#";
        return url.startsWith("http") ? url : `https://${url}`;
    };

    const handleCopyVolunteerLink = (url: string) => {
        navigator.clipboard.writeText(getSafeUrl(url));
        setVolunteerCopied(true);
        setTimeout(() => setVolunteerCopied(false), 2000);
        toast({ title: "Link Berhasil Disalin!" });
    };

    return (
        <section id="volunteer" className="py-24 bg-slate-50 border-y border-slate-100">
            <div className="container px-6 md:px-12 mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 rounded-full mb-6 text-primary font-bold uppercase tracking-wider text-xs shadow-soft">
                        <Users className="w-5 h-5" />
                        Open Volunteer
                    </div>
                    <h2 className="text-4xl font-heading font-bold mb-4 bg-gradient-to-r from-primary to-secondary-foreground bg-clip-text text-transparent">
                        Uluran Tanganmu Berarti
                    </h2>
                    <p className="text-muted-foreground">
                        Bergabunglah bersama kami dalam misi kemanusiaan dan ciptakan dampak nyata.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <>
                            <VolunteerSkeleton />
                            <VolunteerSkeleton />
                            <VolunteerSkeleton />
                        </>
                    ) : activeVolunteers.length > 0 ? (
                        activeVolunteers.map((item) => (
                            <div
                                key={item.id}
                                className="group card-elevated h-full overflow-hidden flex flex-col hover:-translate-y-2 transition-all duration-300 bg-white rounded-3xl border border-slate-100 shadow-soft"
                            >
                                <div className="aspect-video relative overflow-hidden bg-slate-100">
                                    <img
                                        src={item.imageUrl || "https://images.unsplash.com/photo-1559027615-cd264c707af2?auto=format&fit=crop&q=80&w=800"}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-[11px] font-bold text-primary shadow-md border border-primary/10">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Batas: {format(new Date(item.deadline), "dd MMMM yyyy", { locale: idLocale })}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col flex-1 text-left">
                                    <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">
                                        {item.description}
                                    </p>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                                        <div className="flex items-center text-slate-500 text-[11px] font-medium">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                            <span>Batas: {format(new Date(item.deadline), "dd MMM yyyy", { locale: idLocale })}</span>
                                        </div>

                                        <Button
                                            variant="link"
                                            className="p-0 h-[48px] min-w-[48px] font-bold text-[#2563eb] hover:no-underline flex items-center text-sm group/btn"
                                            onClick={() => handleRegistration(item)}
                                        >
                                            Daftar Sekarang
                                            <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-soft">
                            <div className="inline-flex p-6 bg-slate-50 rounded-full mb-6">
                                <Users className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Rekrutmen belum dibuka</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                Saat ini belum ada posisi volunteer yang tersedia. Silakan cek kembali nanti atau ikuti media sosial kami untuk informasi terbaru.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Volunteer Detail Dialog */}
            <Dialog open={!!selectedVolunteer} onOpenChange={(open) => !open && setSelectedVolunteer(null)}>
                <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden h-[85dvh] sm:h-auto sm:max-h-[85dvh] flex flex-col border-none shadow-strong rounded-3xl bg-white">
                    {selectedVolunteer && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-12 text-left">
                            {/* Header Image */}
                            <div className="w-full bg-slate-900/5 flex items-center justify-center border-b border-slate-100 min-h-[300px]">
                                {selectedVolunteer.imageUrl ? (
                                    <img
                                        src={selectedVolunteer.imageUrl}
                                        alt={selectedVolunteer.title}
                                        className="block w-full h-auto max-h-[60vh] object-contain mx-auto"
                                    />
                                ) : (
                                    <div className="py-24 w-full flex items-center justify-center">
                                        <Users className="w-20 h-20 text-primary/20" />
                                    </div>
                                )}
                            </div>

                            <div className="p-8 md:p-12 max-w-3xl mx-auto">
                                {/* Meta Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Program Volunteer
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        Batas: {format(new Date(selectedVolunteer.deadline), "dd MMMM yyyy", { locale: idLocale })}
                                    </div>
                                </div>

                                {/* Title */}
                                <h2 className="text-3xl md:text-5xl font-heading font-black text-slate-900 leading-[1.1] mb-10 tracking-tight">
                                    {selectedVolunteer.title}
                                </h2>

                                {/* Author & Date Metadata */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-8 border-y border-slate-100 mb-12">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                            M
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Penyelenggara</span>
                                            <p className="text-base font-bold text-slate-900 leading-tight">Admin Meraki Berbagi</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Diterbitkan</span>
                                            <p className="text-base font-bold text-slate-900 leading-tight">
                                                {format(new Date(selectedVolunteer.createdAt || new Date()), "EEEE, dd MMMM yyyy", { locale: idLocale })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Description Content */}
                                <div className="flex flex-col gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1 w-10 bg-primary rounded-full" />
                                        <span className="font-extrabold text-slate-900 tracking-[0.2em] uppercase text-[10px] antialiased">
                                            DETAIL KEGIATAN
                                        </span>
                                    </div>

                                    <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-[1.8] whitespace-pre-wrap font-medium break-words antialiased">
                                        {selectedVolunteer.description}
                                    </div>

                                    {selectedVolunteer.requirements && (
                                        <div className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Check className="w-5 h-5 text-green-500" />
                                                Persyaratan
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedVolunteer.requirements.split(',').map((req, i) => (
                                                    <Badge key={i} variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold px-3 py-1 rounded-lg">
                                                        {req.trim()}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Primary Action Button */}
                                <div className="mt-12">
                                    <Button
                                        className="w-full h-16 rounded-2xl font-black text-lg shadow-strong bg-[#2563eb] hover:bg-blue-700 transition-all gap-3"
                                        onClick={() => window.open(getSafeUrl(selectedVolunteer.registrationLink), '_blank', 'noopener,noreferrer')}
                                    >
                                        Klik di Sini untuk Daftar
                                        <ArrowUpRight className="w-6 h-6" />
                                    </Button>
                                </div>

                                {/* Share Section */}
                                <div className="mt-12 pt-10 border-t border-slate-100 flex flex-col gap-4">
                                    <p className="text-sm font-bold text-slate-700">Bagikan Pendaftaran Ke :</p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1 rounded-2xl gap-3 border-slate-200 justify-center h-14 px-8 hover:bg-slate-50 transition-all font-bold text-slate-700 shadow-sm"
                                            onClick={() => handleCopyVolunteerLink(selectedVolunteer.registrationLink)}
                                        >
                                            {volunteerCopied ? (
                                                <><Check className="w-5 h-5 text-green-500" /> Tersalin!</>
                                            ) : (
                                                <><Link2 className="w-5 h-5 text-primary" /> Salin Link</>
                                            )}
                                        </Button>
                                        <a
                                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`*Ayo Jadi Bagian dari Kebaikan!* 🌟\n\nProgram: ${selectedVolunteer.title}\n\nDaftar di sini: ${getSafeUrl(selectedVolunteer.registrationLink)}`)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1"
                                        >
                                            <Button variant="outline" className="w-full rounded-2xl gap-3 border-green-200 bg-green-50 hover:bg-green-100 text-green-600 justify-center h-14 px-8 transition-all font-bold shadow-sm">
                                                <MessageCircle className="w-6 h-6 fill-green-600 text-white" /> WhatsApp
                                            </Button>
                                        </a>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-300 mt-4">
                                        <div className="w-2 h-2 rounded-full bg-slate-100" />
                                        DOC_ID: #V-{selectedVolunteer.id.substring(0, 8).toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
