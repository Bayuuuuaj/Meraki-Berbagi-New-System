import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { MOCK_USERS } from "./mockData";

import { type User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_location, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already logged in via localStorage
    const storedUser = localStorage.getItem("meraki_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from local storage");
        localStorage.removeItem("meraki_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Handle non-JSON responses (like 404 HTML pages or 500 errors)
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON response:", text);
        throw new Error("Gagal terhubung ke server (Invalid Response)");
      }

      if (!res.ok) {
        throw new Error(data.message || "Login gagal");
      }

      const authUser = data;

      setUser(authUser);
      localStorage.setItem("meraki_user", JSON.stringify(authUser));
      setLocation("/dashboard");
    } catch (error) {
      // Fallback for demo purposes if backend fails or is empty
      if (email === "admin@meraki.org" && password === "admin123") {
        const demoAdmin: any = { id: "1", email, name: "Admin Meraki", role: "admin", isSuperAdmin: 1 };
        setUser(demoAdmin);
        localStorage.setItem("meraki_user", JSON.stringify(demoAdmin));
        setLocation("/dashboard");
        return;
      } else if (email === "anggota@meraki.org" && password === "anggota123") {
        const demoMember: any = { id: "2", email, name: "Anggota Demo", role: "anggota", isSuperAdmin: 0 };
        setUser(demoMember);
        localStorage.setItem("meraki_user", JSON.stringify(demoMember));
        setLocation("/dashboard");
        return;
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem("meraki_user");
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
