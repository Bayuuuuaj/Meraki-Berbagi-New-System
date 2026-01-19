import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import AIDashboardPage from "@/pages/ai-dashboard";
import AttendancePage from "@/pages/attendance";
import TreasuryPage from "@/pages/treasury";
import MembersPage from "@/pages/members";
import NotificationsPage from "@/pages/notifications";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import DashboardLayout from "@/components/layout/DashboardLayout";

function ProtectedRoute({ component: Component, path, requireAdmin }: { component: React.ComponentType<any>, path: string, requireAdmin?: boolean }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/login" />;

  if (requireAdmin && user.role !== "admin") {
    // Redirect non-admins to dashboard if they try to access admin pages
    return <Redirect to="/dashboard" />;
  }

  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/ai-dashboard" component={AIDashboardPage} requireAdmin={true} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/treasury" component={TreasuryPage} />
      <ProtectedRoute path="/members" component={MembersPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
