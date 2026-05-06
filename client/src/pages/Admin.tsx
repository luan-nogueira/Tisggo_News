import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Loader2, Lock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const mockLogin = trpc.auth.mockLogin.useMutation({
    onSuccess: () => {
      window.location.reload();
    }
  });

  if (loading || mockLogin.isPending) {
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
          <CardContent className="flex flex-col gap-4 mt-4">
            <Button 
              className="w-full bg-accent text-black hover:bg-yellow-500 font-bold py-6 text-lg"
              onClick={() => mockLogin.mutate()}
              disabled={mockLogin.isPending}
            >
              {mockLogin.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Entrar no Painel
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-gray-400 hover:text-white"
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
