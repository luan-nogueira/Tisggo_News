import { useAuth } from "@/_core/hooks/useAuth";
import { Switch, Route, useLocation } from "wouter";
import { Loader2, Lock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminArticles from "@/pages/admin/Articles";
import ArticleForm from "@/pages/admin/ArticleForm";
import AdminCategories from "@/pages/admin/Categories";
import AdminSponsors from "@/pages/admin/Sponsors";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O hook useAuth vai detectar a mudanca e recarregar a tela
    } catch (err: any) {
      console.error(err);
      setError("E-mail ou senha incorretos.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading || isLoggingIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Firebase user returns a user object. Se tem user logado pelo Firebase,
  // permitimos acesso ao painel de admin.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Portal do Administrador</CardTitle>
            <CardDescription className="text-gray-400">
              Acesso restrito à gerência do Tisggo News
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <form 
              onSubmit={handleLogin}
              className="flex flex-col gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@tisggo.com"
                  className="bg-gray-800 border-gray-700 text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Senha</Label>
                <Input 
                  id="password" 
                  type="password"
                  className="bg-gray-800 border-gray-700 text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <Button 
                type="submit"
                className="w-full bg-accent text-black hover:bg-yellow-500 font-bold py-6 text-lg mt-2"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Entrar no Painel
              </Button>
            </form>
            
            <Button 
              variant="ghost" 
              className="w-full text-gray-400 hover:text-white mt-4"
              onClick={() => navigate("/")}
            >
              Voltar para o site
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/articles" component={AdminArticles} />
        <Route path="/admin/articles/new" component={ArticleForm} />
        <Route path="/admin/articles/:id/edit" component={ArticleForm} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/sponsors" component={AdminSponsors} />
        {/* Fallback to Dashboard if path doesn't match */}
        <Route component={AdminDashboard} />
      </Switch>
    </DashboardLayout>
  );
}
