import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";

// Interceptador avançado para falhas de carregamento de módulos dinâmicos após novos deploys
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageForceRefreshed = sessionStorage.getItem('page-force-refreshed') === 'true';
    try {
      const component = await componentImport();
      sessionStorage.setItem('page-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageForceRefreshed) {
        sessionStorage.setItem('page-force-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

// Lazy loading components for performance with automatic fallback reload
const Admin = lazyWithRetry(() => import("@/pages/Admin"));
const Home = lazyWithRetry(() => import("@/pages/Home"));
const Article = lazyWithRetry(() => import("@/pages/Article"));
const Category = lazyWithRetry(() => import("@/pages/Category"));
const Search = lazyWithRetry(() => import("@/pages/Search"));

function Router() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    }>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/article/:slug" component={Article} />
        <Route path="/category/:slug" component={Category} />
        <Route path="/search/:query" component={Search} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/dashboard" component={Admin} />
        <Route path="/admin/articles" component={Admin} />
        <Route path="/admin/articles/new" component={Admin} />
        <Route path="/admin/articles/:id/edit" component={Admin} />
        <Route path="/admin/categories" component={Admin} />
        <Route path="/admin/sponsors" component={Admin} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import { ChatWidget } from "@/components/ChatWidget";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
          <ChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
