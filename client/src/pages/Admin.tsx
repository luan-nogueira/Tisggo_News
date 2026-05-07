import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Loader2, Lock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginAdmin = trpc.auth.loginAdmin.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: (err) => {
      setError(err.message || "Erro ao fazer login");
    }
  });

  if (loading || loginAdmin.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Portal do Administrador</CardTitle>
            <CardDescription className="text-gray-400">
              Acesso restrito à gerência do Tisgo News
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                loginAdmin.mutate({ email, password });
              }}
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
                disabled={loginAdmin.isPending}
              >
                {loginAdmin.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
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
      <AdminDashboard />
    </DashboardLayout>
  );
}
