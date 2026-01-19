import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Medal, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface CertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: {
        name: string;
        role: string;
        contributionScore: number;
        badges: string[];
    };
}

export default function CertificateModal({ isOpen, onClose, member }: CertificateModalProps) {
    const handleDownload = () => {
        window.print();
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Sertifikat Meraki-Berbagi',
                text: `Saya baru saja meraih pencapaian digital di Meraki-Berbagi dengan skor ${member.contributionScore}!`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            alert("Sharing tidak didukung di browser ini.");
        }
    };

    const issueDate = format(new Date(), "dd MMMM yyyy", { locale: id });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white border-none shadow-2xl">
                {/* Certificate Branding Strip */}
                <div className="h-4 bg-gradient-to-r from-indigo-600 via-primary to-amber-500" />

                <div className="p-8 sm:p-12 text-center space-y-8 relative">
                    {/* Watermark Background icon */}
                    <Medal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 text-primary/5 -z-10" />

                    <div className="space-y-2">
                        <div className="flex justify-center mb-4">
                            <div className="bg-primary/10 p-4 rounded-full">
                                <Medal className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-heading font-bold tracking-tighter text-foreground uppercase">
                            Sertifikat Apresiasi
                        </h1>
                        <p className="text-muted-foreground uppercase tracking-widest text-sm">
                            Meraki-Berbagi Volunteer Management
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="text-lg italic text-muted-foreground">Diberikan dengan hormat kepada:</p>
                        <h2 className="text-4xl font-heading font-extrabold text-primary underline decoration-amber-400 decoration-4 underline-offset-8">
                            {member.name}
                        </h2>
                        <p className="text-lg font-medium text-foreground">
                            Sebagai <span className="text-indigo-600">[{member.role.toUpperCase()}]</span> atas dedikasi luar biasa.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-muted/50">
                        <div className="text-left space-y-1">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
                                <Calendar className="w-3 h-3" /> Tanggal Terbit
                            </div>
                            <p className="font-bold text-sm">{issueDate}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs uppercase">
                                <User className="w-3 h-3" /> Kontribusi Total
                            </div>
                            <p className="font-bold text-sm text-amber-600">{member.contributionScore} Poin</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                        <div className="flex gap-2">
                            {member.badges.map((badge, idx) => (
                                <span key={idx} className="text-[10px] px-2 py-1 bg-muted rounded-full font-medium">
                                    {badge}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground max-w-sm">
                            Sertifikat ini diterbitkan secara otomatis oleh sistem kecerdasan buatan Meraki-Berbagi berdasarkan data aktivitas riil yang terverifikasi.
                        </p>
                    </div>
                </div>

                <DialogFooter className="bg-muted/30 p-4 gap-2 flex-row justify-center sm:justify-center border-t">
                    <Button onClick={handleDownload} variant="outline" className="flex-1 sm:flex-none">
                        <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                    <Button onClick={handleShare} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700">
                        <Share2 className="w-4 h-4 mr-2" /> Bagikan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
