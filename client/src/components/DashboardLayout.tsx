import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Home, Settings } from "lucide-react";
import { useLocation, Link } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full glass-card rounded-2xl border border-white/5">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-bold tracking-tight text-center text-white">
              Acesso Restrito
            </h1>
            <p className="text-sm text-gray-400 text-center max-w-sm">
              Você precisa estar logado para acessar o painel administrativo.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="w-full bg-accent text-black font-bold h-12"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top Navbar Premium */}
      <nav className="h-20 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black flex items-center gap-2">
              <span className="text-accent">TISGO</span>
              <span className="text-white">ADMIN</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <Link href="/admin">
                <Button variant={location === "/admin" ? "secondary" : "ghost"} className="rounded-lg px-4 h-9 text-sm font-medium">
                  Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="rounded-lg px-4 h-9 text-sm font-medium text-gray-400 hover:text-white">
                  Ver Site
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all focus:outline-none">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{user.name || "Admin"}</span>
                    <span className="text-[10px] text-gray-500">{user.email}</span>
                  </div>
                  <Avatar className="h-9 w-9 border border-accent/20">
                    <AvatarFallback className="bg-accent text-black font-black text-xs">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0A0A0A] border-white/10 p-2 rounded-2xl">
                <DropdownMenuItem className="rounded-xl p-3 focus:bg-white/5 cursor-pointer">
                  <Settings className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">Configurações</span>
                </DropdownMenuItem>
                <div className="h-px bg-white/5 my-2 mx-1" />
                <DropdownMenuItem
                  onClick={logout}
                  className="rounded-xl p-3 focus:bg-red-500/10 text-red-500 cursor-pointer"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="text-sm font-bold">Sair do Painel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
