import { Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import AttendancePage from "@/pages/attendance";
import TreasuryPage from "@/pages/treasury";
import MembersPage from "@/pages/members";
import NotificationsPage from "@/pages/notifications";
import NotFound from "@/pages/not-found";
import DashboardLayout from "@/components/layout/DashboardLayout";

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType<any>, path: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  
  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/treasury" component={TreasuryPage} />
      <ProtectedRoute path="/members" component={MembersPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/settings" component={() => <DashboardLayout><div className="text-center py-20">Halaman Pengaturan (Coming Soon)</div></DashboardLayout>} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
