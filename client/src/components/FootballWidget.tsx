import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Zap, ChevronUp, Minus, ChevronDown } from "lucide-react";

type Tab = "table" | "games";

// Positions that grant Libertadores, Sul-Americana, or relegation
const ZONE_COLORS = {
  libertadores: "bg-blue-500",      // 1-4
  sulAmericana: "bg-emerald-500",   // 5-8
  relegation: "bg-red-600",         // 17-20
};

function zoneColor(pos: number) {
  if (pos <= 4) return ZONE_COLORS.libertadores;
  if (pos <= 8) return ZONE_COLORS.sulAmericana;
  if (pos >= 17) return ZONE_COLORS.relegation;
  return "bg-transparent";
}

function zoneBg(pos: number) {
  if (pos <= 4) return "bg-blue-500/5";
  if (pos <= 8) return "bg-emerald-500/5";
  if (pos >= 17) return "bg-red-600/5";
  return "";
}

export function FootballWidget() {
  const [activeTab, setActiveTab] = useState<Tab>("table");

  const { data: tableData, isLoading: tableLoading, isError: tableError } =
    trpc.football.table.useQuery(undefined, {
      refetchInterval: 5 * 60 * 1000,
      retry: 2,
    });

  const { data: gamesData, isLoading: gamesLoading, isError: gamesError } =
    trpc.football.games.useQuery(undefined, {
      refetchInterval: 2 * 60 * 1000, // refresh more often for live scores
      retry: 2,
    });

  const isLoading = activeTab === "table" ? tableLoading : gamesLoading;
  const isError = activeTab === "table" ? tableError : gamesError;

  if (isError && !tableData && !gamesData) return null;

  return (
    <aside className="football-widget rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="football-widget-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <span className="text-xs font-black uppercase tracking-widest text-foreground">
            Brasileirão <span className="text-accent">Série A</span>
          </span>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
          <TabButton
            label="Tabela"
            value="table"
            active={activeTab === "table"}
            onClick={() => setActiveTab("table")}
          />
          <TabButton
            label="Jogos"
            value="games"
            active={activeTab === "games"}
            onClick={() => setActiveTab("games")}
          />
        </div>
      </div>

      {/* Body */}
      <div className="football-widget-body max-h-[450px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              <SkeletonRows />
            ) : activeTab === "table" ? (
              <TableView data={tableData ?? []} />
            ) : (
              <GamesView data={gamesData ?? []} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="football-widget-footer px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendItem color="bg-blue-500" label="Libertadores" />
        <LegendItem color="bg-emerald-500" label="Sul-Americana" />
        <LegendItem color="bg-red-600" label="Rebaixamento" />
      </div>
    </aside>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: Tab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200
        ${active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {label}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
      <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="px-3 py-2 space-y-2 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-5 h-3 bg-white/10 rounded" />
          <div className="w-6 h-6 bg-white/10 rounded-full" />
          <div className="flex-1 h-3 bg-white/10 rounded" />
          <div className="w-8 h-3 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

function TableView({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-10 text-white/30 text-xs">
        Dados indisponíveis no momento
      </div>
    );
  }

  return (
    <div className="text-xs">
      {/* Column headers */}
      <div className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
        <span className="w-5 text-center">#</span>
        <span className="flex-1 pl-7">Clube</span>
        <span className="w-5 text-center">P</span>
        <span className="w-5 text-center">J</span>
        <span className="w-5 text-center">V</span>
        <span className="w-5 text-center">E</span>
        <span className="w-5 text-center">D</span>
        <span className="w-6 text-center">SG</span>
      </div>

      {data.map((team) => (
        <div
          key={team.pos}
          className={`flex items-center gap-1 px-3 py-1.5 border-b border-border hover:bg-muted transition-colors ${zoneBg(team.pos)}`}
        >
          {/* Position + zone indicator */}
          <div className="w-5 flex items-center justify-center gap-1 flex-shrink-0">
            <span className={`w-1 h-5 rounded-full flex-shrink-0 ${zoneColor(team.pos)}`} />
            <span className="text-muted-foreground font-bold text-[10px] w-4 text-center">{team.pos}</span>
          </div>

          {/* Shield */}
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            {team.shield ? (
              <img
                src={team.shield}
                alt={team.shortName}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[7px] font-black text-muted-foreground">
                {team.shortName?.charAt(0)}
              </div>
            )}
          </div>

          {/* Name */}
          <span className="flex-1 font-semibold text-foreground truncate pl-1 text-[11px]">
            {team.shortName || team.name}
          </span>

          {/* Stats */}
          <span className="w-5 text-center font-black text-accent">{team.points}</span>
          <span className="w-5 text-center text-muted-foreground">{team.games}</span>
          <span className="w-5 text-center text-muted-foreground">{team.wins}</span>
          <span className="w-5 text-center text-muted-foreground">{team.draws}</span>
          <span className="w-5 text-center text-muted-foreground">{team.losses}</span>
          <span className={`w-6 text-center font-semibold text-[10px] ${team.gd > 0 ? "text-emerald-500" : team.gd < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {team.gd > 0 ? `+${team.gd}` : team.gd}
          </span>
        </div>
      ))}
    </div>
  );
}

function GamesView({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30 text-xs">
        <Zap className="w-5 h-5 opacity-30" />
        <span>Sem jogos disponíveis</span>
      </div>
    );
  }

  const round = data[0]?.round;

  return (
    <div>
      {round && (
        <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
          {round}ª Rodada
        </div>
      )}
      {data.map((game) => (
        <div
          key={game.id}
          className={`px-3 py-2.5 border-b border-border hover:bg-muted transition-colors
            ${game.status === "live" ? "bg-red-500/5" : ""}
          `}
        >
          <div className="flex items-center gap-2">
            {/* Home team */}
            <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
              <span className="text-[11px] font-bold text-foreground truncate">
                {game.homeTeam.shortName}
              </span>
              {game.homeTeam.shield && (
                <img
                  src={game.homeTeam.shield}
                  alt={game.homeTeam.shortName}
                  className="w-5 h-5 object-contain flex-shrink-0"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              )}
            </div>

            {/* Score / Time */}
            <div className="flex flex-col items-center flex-shrink-0 w-16">
              {game.status === "live" ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-foreground">
                      {game.homeTeam.score ?? 0}
                    </span>
                    <span className="text-muted-foreground text-sm">–</span>
                    <span className="text-base font-black text-foreground">
                      {game.awayTeam.score ?? 0}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-widest animate-pulse">
                    AO VIVO
                  </span>
                </>
              ) : game.status === "finished" ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-foreground/70">
                      {game.homeTeam.score ?? "–"}
                    </span>
                    <span className="text-muted-foreground text-sm">×</span>
                    <span className="text-base font-black text-foreground/70">
                      {game.awayTeam.score ?? "–"}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase">Encerrado</span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-bold text-muted-foreground mb-0.5">{game.date}</span>
                  <span className="text-sm font-black text-accent leading-none">{game.time}</span>
                  <span className="text-[8px] text-muted-foreground/60 uppercase mt-1 tracking-tighter">Agendado</span>
                </>
              )}
            </div>

            {/* Away team */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {game.awayTeam.shield && (
                <img
                  src={game.awayTeam.shield}
                  alt={game.awayTeam.shortName}
                  className="w-5 h-5 object-contain flex-shrink-0"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              )}
              <span className="text-[11px] font-bold text-foreground truncate">
                {game.awayTeam.shortName}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
