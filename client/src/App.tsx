import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import PlanAlimentaire from "@/pages/plan-alimentaire";
import Favorites from "@/pages/favorites";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <Component {...rest} /> : <Redirect to="/" />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <Home /> : <Landing />}
      </Route>
      <Route path="/plan-alimentaire">
        <ProtectedRoute component={PlanAlimentaire} />
      </Route>
      <Route path="/favorites">
        <ProtectedRoute component={Favorites} />
      </Route>
      <Route path="/admin">
        <Admin />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
