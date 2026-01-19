import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HeartHandshake,
  ArrowRight,
  Users,
  Star,
  ShieldCheck,
  Instagram,
  Music,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  ChevronRight,
  MapPin,
  Calendar,
  Info,
  Link2,
  Copy,
  Check
} from "lucide-react";
import logoImage from "@assets/Kebutuhan_logo-04_1765812559569.png";
import { type News } from "@shared/schema";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type StaffMember = {
  name: string;
  role: string;
};

type ProkerItem = {
  name: string;
  location: string;
  date?: string;
};

type ProgramData = {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  images: string[];
  longDescription: string;
  proker: ProkerItem[];
  staff: StaffMember[];
};

const PROGRAMS: ProgramData[] = [
  {
    id: "meraki-mengajar",
    title: "Meraki Mengajar",
    description: "Memberikan akses pendidikan berkualitas dan berkelanjutan bagi anak-anak yang membutuhkan.",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    images: ["/doc-2.jpg", "/doc-4.jpg"],
    longDescription: "Program Meraki Mengajar berfokus pada pemerataan pendidikan. Kami mengirimkan relawan pengajar ke daerah-daerah yang membutuhkan, mengadakan kelas inspirasi, serta memberikan bantuan perlengkapan sekolah untuk memastikan setiap anak mendapatkan hak belajarnya.",
    proker: [
      { name: "Kelas Inspirasi", location: "SD Negeri Cibiru, Bandung" },
      { name: "Donasi Buku & Alat Tulis", location: "Kampung Cikuya, Bandung" },
      { name: "Bimbingan Belajar Gratis", location: "Komunitas Belajar Dago" }
    ],
    staff: [
      { name: "Dita Pramesti", role: "Koordinator Pendidikan" },
      { name: "Rian Saputra", role: "Pengajar Volunteer" },
      { name: "Siti Nurhaliza", role: "Admin Program" }
    ]
  },
  {
    id: "meraki-kasih",
    title: "Meraki Kasih",
    description: "Berbagi kasih sayang dan kepedulian kepada sesama melalui berbagai kegiatan sosial yang bermakna.",
    icon: HeartHandshake,
    color: "text-rose-600",
    bgColor: "bg-rose-100",
    images: ["/meraki-kasih-1.jpg", "/meraki-kasih-2.jpg", "/meraki-kasih-3.jpg", "/meraki-kasih-4.jpg", "/meraki-kasih-5.jpg"],
    longDescription: "Meraki Kasih adalah wujud kepedulian sosial kami. Kegiatannya meliputi kunjungan ke panti asuhan, panti jompo, berbagi makanan (Jumat Berkah), dan kegiatan hiburan untuk menguatkan mental serta emosional saudara-saudara kita.",
    proker: [
      { name: "Karuna Sanjivana", location: "Panti Asuhan Muhammadiyah, Bandung" },
      { name: "Jumat Berkah", location: "Masjid Agung, Bandung" },
      { name: "Kunjungan Panti Jompo", location: "Panti Werdha Senjarawi" }
    ],
    staff: [
      { name: "Ega Purnama", role: "Koordinator Sosial" },
      { name: "Ahmad Fauzi", role: "Logistik & Distribusi" },
      { name: "Maya Anggraini", role: "Dokumentasi" }
    ]
  },
  {
    id: "satu-hati",
    title: "Satu Hati, Satu Tangan",
    description: "Program bantuan darurat kemanusiaan untuk membantu mereka yang sedang terdampak.",
    icon: ShieldCheck,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    images: ["/doc-5.jpg", "/meraki-volunteers.jpg"],
    longDescription: "Satu Hati, Satu Tangan adalah respon cepat tanggap kami terhadap bencana alam dan krisis kemanusiaan. Kami menggalang dana, menyalurkan logistik, dan menurunkan tim relawan untuk membantu pemulihan daerah terdampak.",
    proker: [
      { name: "Bantuan Banjir Bandung", location: "Dayeuhkolot, Bandung" },
      { name: "Dapur Umum Darurat", location: "Posko Bencana Ciwidey" },
      { name: "Santunan Yatim Piatu", location: "Masjid Al-Ikhlas, Cimahi" }
    ],
    staff: [
      { name: "Budi Santoso", role: "Koordinator Tanggap Darurat" },
      { name: "Lina Marlina", role: "Penggalangan Dana" },
      { name: "Rudi Hermawan", role: "Tim Lapangan" }
    ]
  }
];

const FOUNDERS = [
  {
    name: "N. Syifa Wildaini S.Ked",
    role: "Founder",
    photo: "/founder.png",
    quote: "Setiap manusia dibekali cipta untuk memahami, rasa yang menuntun untuk peduli, dan karsa menguatkan untuk bertindak. Berbagi kasih bukan sekadar tindakan, tetapi kesadaran akan kemanusiaan."
  }
];

const CORE_TEAM = [
  {
    name: "N. Syifa Wildaini S.Ked",
    role: "Head of Program & Community Engagement",
    image: "/syifa-optimized.webp"
  },
  {
    name: "Theana Ryandianita Putri S.Ikom",
    role: "Head of Education & Membership Development Division",
    image: "/theana-optimized.webp"
  },
  {
    name: "Dita Dara Dinanti S.Ds",
    role: "Head of Media, Documentation & Public Awareness",
    image: "/dita-optimized.webp"
  },
  {
    name: "Adisti Tristania F S.Ak",
    role: "Head of Internal Administration & Finance",
    image: "/adisti-optimized.webp"
  },
  {
    name: "Muhammad Rehan S.Ds",
    role: "Head of Volunteer Management",
    image: "/rehan-optimized.webp"
  },
  {
    name: "Ega Winia Asyifa S.M",
    role: "Head of Fundraising, Sponsorship & Logistics",
    image: "/ega-optimized.webp"
  }
];

export default function LandingPage() {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramData | null>(null);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [news, setNews] = useState<News[]>([]);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        setNews(data);
        // Check for deep link to news
        const params = new URLSearchParams(window.location.search);
        const newsId = params.get("newsId");
        if (newsId) {
          const item = data.find((n: News) => n.id === newsId);
          if (item) setSelectedNews(item);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const [copied, setCopied] = useState(false);
  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/?newsId=${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-2xl border-b border-slate-100/50">
        <div className="max-w-[1440px] mx-auto h-20 px-6 md:px-12 flex items-center justify-between">
          {/* Brand/Logo Section */}
          <div className="flex items-center gap-4 group cursor-pointer transition-all duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src={logoImage}
                alt="Meraki Berbagi Logo"
                className="relative h-12 w-12 object-contain transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
              />
            </div>
            <div className="flex flex-col items-start leading-[1.1] select-none">
              <span className="font-heading font-black text-2xl md:text-3xl tracking-tighter text-slate-900 drop-shadow-sm">Meraki</span>
              <span className="text-[10px] md:text-xs text-primary font-black uppercase tracking-[0.4em] ml-0.5 antialiased">Berbagi</span>
            </div>
          </div>

          {/* Desktop Navigation Links - Centered feel via flex positioning */}
          <div className="hidden lg:flex items-center bg-slate-50/50 p-1.5 rounded-2xl border border-slate-200/50">
            {[
              { label: 'Beranda', id: 'home' },
              { label: 'Tentang', id: 'tentang' },
              { label: 'Program', id: 'program' },
              { label: 'Berita', id: 'berita' }
            ].map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 rounded-xl text-slate-600 font-bold hover:text-primary hover:bg-white transition-all text-xs uppercase tracking-widest antialiased"
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center">
            <Link href="/login">
              <Button className="relative group overflow-hidden bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 rounded-2xl font-bold shadow-strong transition-all hover:scale-105 active:scale-95">
                <div className="flex items-center gap-2 relative z-10">
                  <Users className="w-4 h-4" />
                  <span>Dashboard Masuk</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="relative px-6 py-20 md:py-32 overflow-hidden text-primary-foreground min-h-[90vh] flex items-center pt-16">
          <div className="absolute inset-0">
            <img
              src="/meraki-volunteers.jpg"
              alt="Tim Meraki Berbagi"
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/96 via-primary/92 to-primary/88" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
          </div>

          <div className="container-custom relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-xs font-bold backdrop-blur-sm mb-8 shadow-soft">
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              Platform Manajemen Relawan #1 di Indonesia
            </div>
            <h1 className="max-w-5xl font-heading font-extrabold tracking-tight mb-6 leading-[1.1] text-4xl md:text-6xl text-white">
              Mengelola Kebaikan dengan <span className="drop-shadow-lg">Hati & Transparansi</span>
            </h1>
            <p className="max-w-3xl text-lg md:text-xl text-primary-foreground/95 mb-10 leading-relaxed font-medium">
              Platform manajemen organisasi untuk mengelola data relawan dan transparansi keuangan dengan mudah dan profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-white text-primary hover:bg-white/95 hover:scale-105 h-14 px-10 text-base font-bold shadow-strong transition-all">
                  Mulai Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsContactDialogOpen(true)}
                className="border-2 border-white/50 text-white hover:bg-white/20 h-14 px-10 text-base font-bold bg-white/10 backdrop-blur-md transition-all"
              >
                Pelajari Lebih Lanjut
              </Button>
            </div>
          </div>
        </section>

        {/* About Us Section (Visi, Misi, Tim Inti) */}
        <section id="tentang" className="py-24 bg-background border-b border-border">
          <div className="container-custom">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 rounded-full mb-6 text-primary font-bold uppercase tracking-wider text-xs shadow-soft">
                <Info className="w-5 h-5" />
                Tentang Kami
              </div>
              <h2 className="text-4xl font-heading font-bold mb-4 bg-gradient-to-r from-primary to-secondary-foreground bg-clip-text text-transparent">Mengenal Meraki Berbagi</h2>
              <p className="text-muted-foreground">Visi, Misi, dan Tim Inti di balik setiap langkah kebaikan kami</p>
            </div>

            {/* Highlighted Visi Section */}
            <div className="max-w-5xl mx-auto mb-20 text-center">
              <div className="inline-flex p-4 bg-yellow-50 rounded-2xl mb-8 shadow-soft border border-yellow-100/50">
                <Star className="w-10 h-10 text-yellow-600 fill-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold mb-8 text-primary uppercase tracking-widest">Visi Kami</h3>
              <div className="relative px-4">
                <blockquote className="text-2xl md:text-4xl font-heading font-semibold text-slate-800 leading-[1.4] italic relative z-10">
                  <span className="text-6xl text-primary/20 absolute -top-8 -left-4 font-serif">“</span>
                  Menjadi cahaya harapan bagi sesama, menginspirasi kepedulian dan aksi nyata untuk menciptakan peningkatan diri yang lebih adil, berdaya, dan penuh kasih dengan semangat muka rasa cipta.
                  <span className="text-6xl text-primary/20 absolute -bottom-12 -right-4 font-serif">”</span>
                </blockquote>
              </div>
            </div>

            {/* Premium Misi Section - High Impact */}
            <div className="max-w-6xl mx-auto mt-24 px-4">
              <div className="text-center mb-16">
                <div className="inline-flex p-3 bg-rose-50 rounded-xl mb-4 shadow-soft border border-rose-100/50">
                  <HeartHandshake className="w-8 h-8 text-rose-600 fill-rose-600" />
                </div>
                <h3 className="text-2xl font-bold text-primary uppercase tracking-[0.2em]">Misi Kami</h3>
                <p className="text-muted-foreground mt-4 font-medium">Langkah nyata kami untuk mewujudkan perubahan</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {[
                  {
                    num: "01",
                    title: "Pemberdayaan",
                    desc: "Membangun kekuatan dengan memberikan kesempatan dan sumber daya yang membuka jalan bagi kehidupan yang lebih baik.",
                    color: "text-blue-600",
                    bg: "bg-blue-50/30"
                  },
                  {
                    num: "02",
                    title: "Kemanusiaan",
                    desc: "Menjadi tangan yang membantu dengan memberikan bantuan kemanusiaan yang tepat bagi mereka yang sedang membutuhkan.",
                    color: "text-rose-600",
                    bg: "bg-rose-50/30"
                  },
                  {
                    num: "03",
                    title: "Pendidikan",
                    desc: "Memberikan akses pendidikan yang setara dan berkualitas bagi anak-anak dan keluarga yang kurang beruntung.",
                    color: "text-amber-600",
                    bg: "bg-amber-50/30"
                  },
                  {
                    num: "04",
                    title: "Kolaborasi",
                    desc: "Mengajak setiap individu untuk bersama-sama menciptakan perubahan yang lebih besar melalui kolaborasi dan solidaritas.",
                    color: "text-emerald-600",
                    bg: "bg-emerald-50/30"
                  }
                ].map((item, i) => (
                  <div key={i} className="group relative p-10 bg-white rounded-[3rem] border border-slate-100 shadow-soft hover:shadow-strong transition-all duration-500 hover:-translate-y-2 overflow-hidden text-left flex flex-col items-start">
                    {/* Floating Number Tag */}
                    <div className="absolute top-8 right-10 text-6xl font-black text-slate-50 group-hover:text-primary/5 transition-colors pointer-events-none">
                      {item.num}
                    </div>

                    <div className="relative z-10 w-full">
                      <div className={`mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${item.bg} ${item.color} font-bold text-xs uppercase tracking-widest`}>
                        <div className={`w-1.5 h-1.5 rounded-full bg-current`} />
                        Misi {item.num}
                      </div>
                      <h4 className="text-2xl font-bold text-slate-900 mb-6 group-hover:text-primary transition-colors tracking-tight">
                        {item.title}
                      </h4>
                      <p className="text-xl md:text-2xl text-slate-700 leading-[1.6] font-semibold tracking-tight">
                        {item.desc}
                      </p>
                    </div>

                    {/* Horizontal Line Acent */}
                    <div className="mt-8 h-1 w-12 bg-slate-100 rounded-full group-hover:w-24 group-hover:bg-primary/30 transition-all duration-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tim Inti */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                Tim Inti Kami
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CORE_TEAM.map((member, idx) => (
                  <div key={idx} className="card-elevated p-6 group hover:-translate-y-2 transition-all duration-300">
                    <div className="flex flex-col items-center text-center h-full justify-between">
                      <div className="flex flex-col items-center w-full">
                        <div className="relative mb-4">
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary/10 group-hover:border-primary/30 shadow-medium flex items-center justify-center bg-white">
                            {member.image ? (
                              <img
                                src={member.image}
                                alt={member.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <Users className="w-10 h-10 text-primary/40" />
                            )}
                          </div>
                        </div>
                        <p className="font-bold text-base text-foreground mb-2 leading-tight min-h-[3rem] flex items-center justify-center">{member.name}</p>
                      </div>
                      <div className="bg-primary/5 w-full py-2 px-3 rounded-lg mt-2">
                        <p className="text-[10px] sm:text-xs text-primary/80 font-bold uppercase tracking-wide">{member.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Programs Section */}
        <section id="program" className="py-24 bg-muted/30">
          <div className="container-custom">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-heading font-bold mb-4">Program & Aktivitas</h2>
              <p className="text-muted-foreground">Inisiatif kami dalam menebar kebaikan di masyarakat</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {PROGRAMS.map((program) => (
                <div key={program.id} className="card-elevated p-8 flex flex-col h-full bg-white hover:border-primary/30 transition-all group">
                  <div className={`h-16 w-16 ${program.bgColor} ${program.color} rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform`}>
                    <program.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{program.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6 flex-grow">{program.description}</p>
                  <Button variant="ghost" className="self-start p-0 font-bold text-primary hover:bg-transparent" onClick={() => setSelectedProgram(program)}>
                    Pelajari Lebih Lanjut <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founder Section */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="container-custom">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 bg-primary/5 rounded-[2rem] p-8 md:p-16 relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10 w-full md:w-1/3">
                <div className="relative">
                  <img src="/founder-optimized.webp" alt="Founder" className="w-full max-w-[300px] h-auto rounded-2xl shadow-strong mx-auto border-4 border-white" loading="lazy" decoding="async" />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-full shadow-medium border border-primary/20">
                    <p className="text-xs font-bold text-primary whitespace-nowrap uppercase tracking-widest">{FOUNDERS[0].role}</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 w-full md:w-2/3 space-y-8">
                <MessageCircle className="w-12 h-12 text-primary/30" />
                <blockquote className="text-2xl md:text-3xl font-heading font-semibold italic text-foreground leading-snug">
                  "{FOUNDERS[0].quote}"
                </blockquote>
                <div className="pt-6 border-t border-primary/20">
                  <p className="text-2xl font-bold text-primary">{FOUNDERS[0].name}</p>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{FOUNDERS[0].role}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* News Section */}
        {news.length > 0 && (
          <section id="berita" className="py-24 bg-background border-y border-border">
            <div className="container-custom">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 rounded-full mb-6 text-primary font-bold uppercase tracking-wider text-xs shadow-soft">
                  <MessageCircle className="w-5 h-5" />
                  Berita & Informasi
                </div>
                <h2 className="text-4xl font-heading font-bold mb-4 bg-gradient-to-r from-primary to-secondary-foreground bg-clip-text text-transparent">Kabar Terbaru Kami</h2>
                <p className="text-muted-foreground">Ikuti perkembangan kegiatan dan informasi terbaru dari Meraki Berbagi</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {news.map((item) => (
                  <div key={item.id} className="group card-elevated h-full overflow-hidden flex flex-col hover:-translate-y-2 transition-all duration-300">
                    <div className="aspect-[4/5] relative overflow-hidden bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <MessageCircle className="w-12 h-12 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-[11px] font-bold text-primary shadow-md border border-primary/10">
                        {format(new Date(item.date), "dd MMM yyyy", { locale: idLocale })}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1 text-left">
                      {item.tags && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.tags.split(',').map((tag, i) => (
                            <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      <h3 className="text-xl font-bold mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">
                        {item.content}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 opacity-80">
                          <Users className="w-3.5 h-3.5 text-primary/60" /> {item.author}
                        </span>
                        <Button variant="link" className="p-0 h-auto font-extrabold text-xs text-primary hover:no-underline" onClick={() => setSelectedNews(item)}>
                          Baca Selengkapnya
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Gallery Section */}
        <section className="py-24 bg-background">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-heading font-bold">Galeri Dokumentasi</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
              {["/doc-1.jpg", "/doc-2.jpg", "/doc-3.jpg", "/doc-4.jpg", "/doc-5.jpg", "/meraki-volunteers.jpg"].map((src, idx) => (
                <div key={idx} className="rounded-2xl overflow-hidden shadow-medium h-48 md:h-72 group">
                  <img src={src} alt="Gallery" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-muted/40 border-t border-border">
        <div className="container-custom">
          <div className="flex flex-col items-center gap-8">
            <div className="flex gap-4">
              <a href="https://instagram.com" className="p-3 bg-white rounded-xl shadow-soft hover:text-primary transition-colors"><Instagram className="w-6 h-6" /></a>
              <a href="https://tiktok.com" className="p-3 bg-white rounded-xl shadow-soft hover:text-primary transition-colors"><Music className="w-6 h-6" /></a>
            </div>
            <p className="text-sm text-muted-foreground font-medium">© 2024 Meraki Berbagi Foundation. Semua hak cipta dilindungi.</p>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hubungi Kami</DialogTitle></DialogHeader>
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              <div><p className="font-bold">WhatsApp</p><p className="text-sm text-muted-foreground">+62 821-1840-1535</p></div>
            </div>
            <a href="https://wa.me/6282118401535" target="_blank" rel="noreferrer"><Button size="sm">Hubungi</Button></a>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedProgram} onOpenChange={(open) => !open && setSelectedProgram(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedProgram && (
            <div className="space-y-6">
              <div className={`p-6 ${selectedProgram.bgColor} rounded-2xl flex items-center gap-4`}>
                <selectedProgram.icon className={`w-12 h-12 ${selectedProgram.color}`} />
                <h2 className="text-2xl font-bold">{selectedProgram.title}</h2>
              </div>
              <p className="leading-relaxed">{selectedProgram.longDescription}</p>
              <div className="grid grid-cols-2 gap-4">
                {selectedProgram.images.map((img, i) => (
                  <img key={i} src={img} className="rounded-xl aspect-video object-cover shadow-sm" alt="Documentation" loading="lazy" decoding="async" />
                ))}
              </div>
              <Button onClick={() => setSelectedProgram(null)} className="w-full">Tutup</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedNews} onOpenChange={(open) => {
        if (!open) {
          setSelectedNews(null);
          // Clean up URL
          const url = new URL(window.location.href);
          url.searchParams.delete("newsId");
          window.history.replaceState({}, "", url.toString());
        }
      }}>
        <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden h-[95vh] sm:h-auto sm:max-h-[92vh] flex flex-col border-none shadow-strong rounded-3xl bg-white">
          {selectedNews && (
            <>
              {/* Entire article body is now scrollable */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pb-12">
                {/* News Image - Top of the scrollable content */}
                <div className="w-full bg-slate-900/5 flex items-center justify-center border-b border-slate-100 min-h-[300px]">
                  {selectedNews.imageUrl ? (
                    <img
                      src={selectedNews.imageUrl}
                      alt={selectedNews.title}
                      className="block w-full h-auto max-h-[65vh] object-contain mx-auto"
                    />
                  ) : (
                    <div className="py-24 w-full flex items-center justify-center">
                      <MessageCircle className="w-20 h-20 text-primary/20" />
                    </div>
                  )}
                </div>

                <div className="p-8 md:p-12 max-w-3xl mx-auto">
                  {/* Category Tags */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedNews.tags?.split(',').map((tag, i) => (
                      <span key={i} className="text-[11px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Headline */}
                  <h2 className="text-3xl md:text-5xl font-heading font-black text-slate-900 leading-[1.1] mb-10 tracking-tight">
                    {selectedNews.title}
                  </h2>

                  {/* Author & Date Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-8 border-y border-slate-100 mb-12">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {selectedNews.author.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Penulis</span>
                        <p className="text-base font-bold text-slate-900 leading-tight">
                          {selectedNews.author}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Diterbitkan</span>
                        <p className="text-base font-bold text-slate-900 leading-tight">
                          {format(new Date(selectedNews.date), "EEEE, dd MMMM yyyy", { locale: idLocale })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main News Content */}
                  <div className="flex flex-col gap-8">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-10 bg-primary rounded-full" />
                      <span className="font-extrabold text-slate-900 tracking-[0.2em] uppercase text-[10px] antialiased">
                        BANDUNG, MERAKI BERBAGI
                      </span>
                    </div>

                    <div className="prose prose-lg prose-slate max-w-none text-slate-700 leading-[1.9] whitespace-pre-wrap font-medium break-words antialiased">
                      {selectedNews.content}
                    </div>
                  </div>

                  {/* Footer Sharing & Reference */}
                  <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col gap-8">
                    <div className="flex flex-col gap-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Bagikan Berita Ke :</span>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-2xl gap-3 border-slate-200 justify-center h-14 px-8 hover:bg-slate-50 transition-all font-bold text-slate-700 shadow-sm"
                          onClick={() => handleCopyLink(selectedNews.id)}
                        >
                          {copied ? (
                            <><Check className="w-5 h-5 text-green-500" /> Tersalin!</>
                          ) : (
                            <><Link2 className="w-5 h-5 text-primary" /> Salin Link</>
                          )}
                        </Button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`📢 BERITA TERBARU: ${selectedNews.title}\n\nBaca selengkapnya di: ${window.location.origin}/?newsId=${selectedNews.id}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full rounded-2xl gap-3 border-green-200 bg-green-50 hover:bg-green-100 text-green-600 justify-center h-14 px-8 transition-all font-bold shadow-sm">
                            <MessageCircle className="w-6 h-6 fill-green-600 text-white" /> WhatsApp
                          </Button>
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-slate-100" />
                      DOC_ID: #{selectedNews.id.substring(0, 8).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Close Button */}
              <div className="p-5 px-10 border-t bg-slate-50/80 backdrop-blur-md flex justify-end shrink-0">
                <Button
                  onClick={() => {
                    setSelectedNews(null);
                    const url = new URL(window.location.href);
                    url.searchParams.delete("newsId");
                    window.history.replaceState({}, "", url.toString());
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 h-12 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  Selesai Membaca
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
