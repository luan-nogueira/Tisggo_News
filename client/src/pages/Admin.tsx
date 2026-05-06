import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "@/pages/admin/Dashboard";



export default function Admin() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar o painel administrativo.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <AdminDashboard />
    </DashboardLayout>
  );
}
