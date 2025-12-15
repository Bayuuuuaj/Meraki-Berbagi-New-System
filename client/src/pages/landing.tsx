import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HeartHandshake, ArrowRight, Users, Star, ShieldCheck, Instagram, Music, Sparkles, CheckCircle2, MessageCircle } from "lucide-react";
import logoImage from "@assets/IMG_1120_1764437147221.PNG";

export default function LandingPage() {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoImage} 
              alt="Meraki Berbagi Logo" 
              className="h-10 w-10 rounded-lg object-cover"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-heading font-bold text-lg tracking-tight">Meraki</span>
              <span className="text-xs text-primary uppercase tracking-widest font-semibold">Berbagi</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="shadow-md hover:shadow-lg transition-all">Masuk</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
          {/* Abstract background */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
             <div className="absolute -top-[40%] -left-[10%] w-[60%] h-[80%] rounded-full bg-white mix-blend-overlay blur-3xl" />
             <div className="absolute -bottom-[20%] right-[5%] w-[50%] h-[60%] rounded-full bg-primary-foreground mix-blend-multiply blur-3xl opacity-20" />
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm mb-8">
              <Sparkles className="w-4 h-4 mr-2" />
              Platform Manajemen Relawan #1 di Indonesia
            </div>
            <h1 className="max-w-5xl text-5xl font-heading font-bold tracking-tight sm:text-6xl md:text-7xl mb-6 leading-tight">
              Mengelola Kebaikan dengan <span className="text-secondary-foreground font-extrabold">Hati & Transparansi</span>
            </h1>
            <p className="max-w-3xl text-lg md:text-xl text-primary-foreground/90 mb-10 leading-relaxed">
              Platform manajemen organisasi untuk mengelola data relawan dan transparansi keuangan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/login">
                <Button size="lg" className="bg-white text-primary hover:bg-white/95 h-13 px-10 text-base font-semibold shadow-2xl shadow-black/20 hover:shadow-2xl transition-all">
                  Mulai Sekarang <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setIsContactDialogOpen(true)}
                className="border-white/40 text-white hover:bg-white/15 h-13 px-10 text-base font-semibold bg-transparent backdrop-blur-sm"
              >
                Pelajari Lebih Lanjut
              </Button>
            </div>
          </div>
        </section>

        {/* About / Background Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden bg-muted relative shadow-2xl transition-transform hover:scale-105 duration-500">
                   {/* Placeholder for an image showing community activity */}
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                     <Users className="w-32 h-32 text-primary/20" />
                   </div>
                   <img 
                     src="/meraki-volunteers.jpg" 
                     alt="Kegiatan Sosial Meraki Berbagi" 
                     className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                   />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-2xl shadow-xl border border-border max-w-xs hidden md:block">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Dalamnya</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Sejak 2018, kami telah membantu menyalurkan ribuan bantuan tepat sasaran.</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-heading font-bold tracking-tight mb-4 text-primary">Latar Belakang Organisasi</h2>
                  <div className="text-lg text-muted-foreground leading-relaxed space-y-4">
                    <p>
                      Meraki Berbagi adalah sebuah organisasi charity yang berbasis di Bandung, yang lahir dari semangat untuk menebar kebaikan melalui rasa, cipta, dan karsa. Dengan fondasi nilai-nilai kepedulian dan gotong royong, kami berfokus pada tiga bidang utama: sosial, kemanusiaan, dan pendidikan.
                    </p>
                    <p>
                      Kami percaya bahwa setiap langkah kecil dapat membawa perubahan besar. Oleh karena itu, melalui berbagai program dan kolaborasi, Meraki Berbagi hadir untuk menjembatani mereka yang ingin memberi dan mereka yang membutuhkan. Mulai dari bantuan darurat kemanusiaan, pemberdayaan komunitas, hingga dukungan akses pendidikan yang inklusif dan berkelanjutan.
                    </p>
                    <p>
                      Di Meraki Berbagi, kami tidak hanya bekerja dengan hati, tetapi juga dengan pikiran dan tindakan nyata. Seperti makna "Meraki" itu sendiri melakukan sesuatu dengan sepenuh jiwa kami berkomitmen untuk terus menjadi ruang tumbuh bagi harapan, inspirasi, dengan aksi nyata.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Visi Kami
                    </h3>
                    <p className="text-sm text-muted-foreground italic border-l-4 border-primary/20 pl-4">
                      "Menjadi cahaya harapan bagi sesama, menginspirasi kepedulian dan aksi nyata untuk menciptakan peningkatan diri yang lebih adil, berdaya, dan penuh kasih dengan semangat muka rasa cipta."
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-rose-500 fill-rose-500" /> Misi Kami
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2 list-decimal list-outside ml-4">
                      <li>Membangun kekuatan dengan memberikan kesempatan dan sumber daya yang membuka jalan bagi kehidupan yang lebih baik.</li>
                      <li>Menjadi tangan yang membantu dengan memberikan bantuan kemanusiaan yang tepat bagi mereka yang sedang membutuhkan.</li>
                      <li>Memberikan akses pendidikan yang setara dan berkualitas bagi anak-anak dan keluarga yang kurang beruntung, untuk membuka peluang masa depan yang lebih cerah.</li>
                      <li>Mengajak setiap individu untuk bersama-sama menciptakan perubahan yang lebih besar melalui kolaborasi dan solidaritas.</li>
                      <li>Menyemai nilai gotong royong dan kasih sayang di setiap langkah, agar kebaikan dan kepedulian menjadi bagian dari kehidupan sehari-hari.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Programs Section */}
        <section className="py-24 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-4 md:px-6">
             <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-4xl font-heading font-bold mb-4 text-foreground">Program & Aktivitas</h2>
                <p className="text-lg text-muted-foreground">Inisiatif utama kami untuk mewujudkan misi kebaikan</p>
             </div>

             <div className="grid md:grid-cols-3 gap-8">
                <div className="group bg-card p-8 rounded-2xl shadow-md border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                   <div className="h-14 w-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-7 h-7" />
                   </div>
                   <h3 className="text-2xl font-bold mb-3 text-foreground">Meraki Mengajar</h3>
                   <p className="text-muted-foreground leading-relaxed">Memberikan akses pendidikan yang berkualitas dan berkelanjutan bagi anak-anak yang membutuhkan.</p>
                </div>
                
                <div className="group bg-card p-8 rounded-2xl shadow-md border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                   <div className="h-14 w-14 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <HeartHandshake className="w-7 h-7" />
                   </div>
                   <h3 className="text-2xl font-bold mb-3 text-foreground">Meraki Kasih</h3>
                   <p className="text-muted-foreground leading-relaxed">Berbagi kasih sayang dan kepedulian kepada sesama melalui berbagai kegiatan sosial yang bermakna.</p>
                </div>

                <div className="group bg-card p-8 rounded-2xl shadow-md border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                   <div className="h-14 w-14 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <ShieldCheck className="w-7 h-7" />
                   </div>
                   <h3 className="text-2xl font-bold mb-3 text-foreground">Satu Hati, Satu Tangan</h3>
                   <p className="text-muted-foreground leading-relaxed">Program bantuan darurat kemanusiaan untuk membantu mereka yang sedang terdampak.</p>
                </div>
             </div>
          </div>
        </section>

        {/* Gallery / Documentation Section */}
        <section className="py-24 bg-background border-t border-border/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-heading font-bold mb-4 text-foreground">Dokumentasi Kegiatan</h2>
              <p className="text-lg text-muted-foreground">Momen-momen bermakna dari berbagai program sosial Meraki Berbagi di komunitas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                <img 
                  src="/doc-1.jpg" 
                  alt="Kegiatan Sosial 1" 
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <p className="text-white font-semibold text-center">Berbagi Kebahagiaan</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                <img 
                  src="/doc-2.jpg" 
                  alt="Kegiatan Sosial 2" 
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <p className="text-white font-semibold text-center">Edukasi Anak</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                <img 
                  src="/doc-3.jpg" 
                  alt="Kegiatan Sosial 3" 
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <p className="text-white font-semibold text-center">Pemberdayaan Masyarakat</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                <img 
                  src="/doc-4.jpg" 
                  alt="Kegiatan Sosial 4" 
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <p className="text-white font-semibold text-center">Berbagi Inspirasi</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                <img 
                  src="/doc-5.jpg" 
                  alt="Kegiatan Sosial 5" 
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <p className="text-white font-semibold text-center">Tim Relawan</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                <img 
                  src="/meraki-volunteers.jpg" 
                  alt="Kegiatan Sosial 6" 
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <p className="text-white font-semibold text-center">Semangat Bersama</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-background border-t border-border/50">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-4xl font-heading font-bold mb-6 text-foreground">Siap Berkontribusi?</h2>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Mulai kelola organisasi Anda sekarang dengan platform terpercaya Meraki Berbagi.
            </p>
            <Link href="/login">
              <Button size="lg" className="h-13 px-10 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                Masuk ke Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border/50 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-8">
              <a 
                href="https://instagram.com/merakiberbagi_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 border border-primary/20"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://tiktok.com/@meraki.berbagi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 border border-primary/20"
              >
                <Music className="w-5 h-5" />
              </a>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            <p className="text-center text-sm text-muted-foreground">
              © 2024 Meraki Berbagi Foundation. Semua hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hubungi Meraki Berbagi</DialogTitle>
            <DialogDescription>
              Pilih cara untuk menghubungi kami
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <a
              href="https://instagram.com/merakiberbagi_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="p-3 rounded-lg bg-gradient-to-br from-pink-400 to-rose-400 text-white group-hover:shadow-lg transition-all">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Instagram</p>
                <p className="text-sm text-muted-foreground">@merakiberbagi_</p>
              </div>
            </a>
            <a
              href="https://wa.me/6282118401535"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="p-3 rounded-lg bg-green-500 text-white group-hover:shadow-lg transition-all">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">WhatsApp</p>
                <p className="text-sm text-muted-foreground">+62 821-1840-1535</p>
              </div>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
