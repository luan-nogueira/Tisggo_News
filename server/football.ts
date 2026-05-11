// ── Football Service (ESPN API) ────────────────────────────────────────────────
// Fetches Brasileirão Série A data from ESPN's public API.
// Cache TTL: 5 minutes.

interface TeamStanding {
  pos: number;
  name: string;
  shortName: string;
  shield: string;
  points: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
}

interface GameTeam {
  name: string;
  shortName: string;
  shield: string;
  score: number | null;
}

interface Game {
  id: string;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  status: string; // "scheduled" | "live" | "finished"
  time: string;
  date: string;
  round: number;
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let _tableCache: CacheEntry<TeamStanding[]> | null = null;
let _gamesCache: CacheEntry<Game[]> | null = null;

const ESPN_BASE = "https://site.api.espn.com/apis/v2/sports/soccer/bra.1";

async function getEspnScoreboardUrl() {
  const now = new Date();
  // We use 4 days range to be safe (today + 3)
  const start = now.toISOString().split('T')[0].replace(/-/g, '');
  const endArr = new Date();
  endArr.setDate(now.getDate() + 4);
  const end = endArr.toISOString().split('T')[0].replace(/-/g, '');
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${start}-${end}`;
}

function isFresh<T>(cache: CacheEntry<T> | null): cache is CacheEntry<T> {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

async function espnFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
  return res.json();
}

export async function getBrasileirao(): Promise<TeamStanding[]> {
  if (isFresh(_tableCache)) return _tableCache.data;

  try {
    const raw = await espnFetch(`${ESPN_BASE}/standings?season=${new Date().getFullYear()}`);
    const entries = raw.children?.[0]?.standings?.entries || [];

    const standings: TeamStanding[] = entries.map((entry: any) => {
      const team = entry.team;
      const stats = entry.stats || [];
      const getStat = (name: string) => stats.find((s: any) => s.name === name)?.value || 0;

      return {
        pos: getStat("rank"),
        name: team.displayName,
        shortName: team.abbreviation,
        shield: team.logos?.[0]?.href || "",
        points: getStat("points"),
        games: getStat("gamesPlayed"),
        wins: getStat("wins"),
        draws: getStat("ties"),
        losses: getStat("losses"),
        gf: getStat("pointsFor"),
        ga: getStat("pointsAgainst"),
        gd: getStat("pointDifferential"),
      };
    });

    _tableCache = { data: standings, fetchedAt: Date.now() };
    return standings;
  } catch (err) {
    console.error("[football] Table fetch failed:", err);
    return _tableCache?.data || [];
  }
}

export async function getBrasileiraoGames(): Promise<Game[]> {
  const isAnyLive = _gamesCache?.data.some(g => g.status === 'live');
  const liveTTL = 15 * 1000; // 15 seconds if live
  const normalTTL = 5 * 60 * 1000; // 5 minutes otherwise
  
  const currentTTL = isAnyLive ? liveTTL : normalTTL;

  if (_gamesCache !== null && Date.now() - _gamesCache.fetchedAt < currentTTL) {
    return _gamesCache.data;
  }

  try {
    const url = await getEspnScoreboardUrl();
    const raw = await espnFetch(url);
    const events = raw.events || [];

    const games: Game[] = events.map((event: any) => {
      const competition = event.competitions?.[0];
      const statusState = event.status?.type?.state; // "pre", "in", "post"
      const statusName = event.status?.type?.name; // "STATUS_FINAL", etc.
      
      const competitors = competition?.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === "home");
      const away = competitors.find((c: any) => c.homeAway === "away");

      let mappedStatus: "scheduled" | "live" | "finished" = "scheduled";
      
      if (statusState === "post" || statusName === "STATUS_FINAL") {
        mappedStatus = "finished";
      } else if (statusState === "in") {
        mappedStatus = "live";
      }

      let time = "–";
      let dateStr = "";
      try {
        const d = new Date(event.date);
        time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      } catch {}

      return {
        id: event.id,
        homeTeam: {
          name: home.team.displayName,
          shortName: home.team.abbreviation,
          shield: home.team.logo || "",
          score: home.score !== undefined ? parseInt(home.score) : null,
        },
        awayTeam: {
          name: away.team.displayName,
          shortName: away.team.abbreviation,
          shield: away.team.logo || "",
          score: away.score !== undefined ? parseInt(away.score) : null,
        },
        status: mappedStatus,
        time,
        date: dateStr,
        round: competition?.midseasonNote || 0, // ESPN round info varies
      };
    });

    _gamesCache = { data: games, fetchedAt: Date.now() };
    return games;
  } catch (err) {
    console.error("[football] Games fetch failed:", err);
    return _gamesCache?.data || [];
  }
}
