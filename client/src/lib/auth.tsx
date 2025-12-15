import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { MOCK_USERS } from "./mockData";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "anggota";
};

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
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      // Find user in mock data or default to admin if email matches demo
      // In a real app we would hash check password
      const foundUser = MOCK_USERS.find(u => u.email === email);
      
      if (!foundUser) {
        // Fallback for demo purposes if not in mock list but matches pattern
        if (email.includes("admin")) {
           const demoAdmin: User = { id: "1", email, name: "Admin Demo", role: "admin" };
           setUser(demoAdmin);
           localStorage.setItem("meraki_user", JSON.stringify(demoAdmin));
           setLocation("/dashboard");
           return;
        }
        if (email.includes("anggota")) {
           const demoUser: User = { id: "2", email, name: "Anggota Demo", role: "anggota" };
           setUser(demoUser);
           localStorage.setItem("meraki_user", JSON.stringify(demoUser));
           setLocation("/dashboard");
           return;
        }

        throw new Error("Email tidak ditemukan");
      }

      // Map mock user to auth user type
      const authUser: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role as "admin" | "anggota"
      };

      setUser(authUser);
      localStorage.setItem("meraki_user", JSON.stringify(authUser));
      setLocation("/dashboard");
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
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
