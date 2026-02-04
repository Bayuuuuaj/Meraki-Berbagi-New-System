import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      await login(values.email, values.password);
      toast({
        title: "Selamat datang kembali! 👋",
        description: "Anda berhasil masuk ke sistem.",
      });
    } catch (error) {
      toast({
        title: "Gagal masuk",
        description: (error as Error).message || "Periksa kembali email dan password Anda.",
        variant: "destructive",
      });
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col space-y-2 text-center lg:text-left mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
          Masuk ke Akun
        </h1>
        <p className="text-muted-foreground">
          Masukkan email dan password untuk mengakses dashboard.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="nama@merakiberbagi.org"
                    className="h-12 bg-muted/30 border-input focus-visible:ring-primary/30 rounded-2xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Button variant="link" className="px-0 font-normal text-xs h-auto text-primary">
                    Lupa password?
                  </Button>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="h-12 bg-muted/30 border-input focus-visible:ring-primary/30 rounded-2xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Masuk Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Atau lanjutkan sebagai
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant="outline"
          className="h-10 text-xs border-dashed border-border hover:bg-accent/50 hover:border-primary/50"
          onClick={() => {
            form.setValue("email", "admin@meraki.org");
            form.setValue("password", "admin123");
          }}
        >
          Demo Admin
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 text-xs border-dashed border-border hover:bg-accent/50 hover:border-primary/50"
          onClick={() => {
            form.setValue("email", "anggota@meraki.org");
            form.setValue("password", "anggota123");
          }}
        >
          Demo Anggota
        </Button>
      </div>
    </AuthLayout>
  );
}
