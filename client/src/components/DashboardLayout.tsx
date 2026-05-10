import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-card rounded-2xl border border-border shadow-xl">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-black tracking-tight text-center text-foreground uppercase">
              Acesso <span className="text-accent">Restrito</span>
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Você precisa estar logado para acessar o painel administrativo do Tisgo News.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="w-full bg-accent text-black font-black h-12 uppercase tracking-widest hover:scale-[1.02] transition-transform"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "Notícias", href: "/admin/articles" },
    { label: "Categorias", href: "/admin/categories" },
    { label: "Patrocinadores", href: "/admin/sponsors" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Top Navbar Premium */}
      <nav className="h-20 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-2xl font-black text-accent tracking-tighter uppercase">Tisgo</span>
              <span className="text-2xl font-black text-foreground tracking-tighter uppercase hidden sm:inline">Admin</span>
            </Link>
            
            <div className="hidden lg:flex items-center gap-1 bg-muted/50 p-1 rounded-2xl border border-border">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant={location === item.href || (item.href !== "/admin" && location.startsWith(item.href)) ? "secondary" : "ghost"} 
                    className={`rounded-xl px-5 h-10 text-sm font-bold transition-all ${
                      location === item.href || (item.href !== "/admin" && location.startsWith(item.href))
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
              <div className="w-px h-4 bg-border mx-2" />
              <Link href="/">
                <Button variant="ghost" className="rounded-xl px-5 h-10 text-sm font-bold text-muted-foreground hover:text-accent">
                  Ver Site
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1.5 pl-4 rounded-2xl bg-muted/50 hover:bg-muted border border-border transition-all focus:outline-none">
                  <div className="flex flex-col items-end hidden md:flex">
                    <span className="text-xs font-black text-foreground uppercase tracking-widest">{user.displayName || "Administrador"}</span>
                    <span className="text-[10px] text-muted-foreground">{user.email}</span>
                  </div>
                  <Avatar className="h-9 w-9 border border-accent/40 shadow-sm">
                    <AvatarFallback className="bg-accent text-black font-black text-xs">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-card border-border p-2 rounded-2xl shadow-2xl">
                <DropdownMenuItem className="rounded-xl p-3 focus:bg-muted cursor-pointer transition-colors">
                  <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold">Configurações</span>
                </DropdownMenuItem>
                <div className="h-px bg-border my-2 mx-1" />
                <DropdownMenuItem
                  onClick={logout}
                  className="rounded-xl p-3 focus:bg-red-500/10 text-red-500 cursor-pointer transition-colors"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="text-sm font-black uppercase tracking-widest">Sair do Painel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 md:p-10 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
