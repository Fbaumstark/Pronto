import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Home } from "./pages/Home";
import { Workspace } from "./pages/Workspace";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { UsagePage } from "./pages/UsagePage";
import { SecretsPage } from "./pages/SecretsPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import { useAuth, AuthProvider } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const PUBLIC_ROUTES = ["/terms", "/privacy"];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/project/:id" component={Workspace} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/usage" component={UsagePage} />
      <Route path="/secrets" component={SecretsPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(location)) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGate>
              <Router />
            </AuthGate>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
