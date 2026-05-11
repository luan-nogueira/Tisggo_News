import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (!toggleTheme) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full w-10 h-10 transition-all hover:bg-white/10 text-white"
      title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-accent animate-in fade-in zoom-in duration-300" />
      ) : (
        <Moon className="h-5 w-5 text-gray-950 animate-in fade-in zoom-in duration-300" />
      )}
    </Button>
  );
}
