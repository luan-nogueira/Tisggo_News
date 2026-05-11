import { Cloud, Sun, CloudRain, Thermometer } from "lucide-react";
import { useEffect, useState } from "react";

export function WeatherWidget() {
  const [weather, setWeather] = useState({ temp: 28, condition: "Ensolarado" });

  useEffect(() => {
    const conditions = ["Ensolarado", "Nublado", "Chuvoso"];
    const randomTemp = Math.floor(Math.random() * (32 - 24 + 1)) + 24;
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    setWeather({ temp: randomTemp, condition: randomCondition });
  }, []);

  const getIcon = () => {
    if (weather.condition.includes("Ensolarado")) return <Sun className="w-3 h-3 text-yellow-500" />;
    if (weather.condition.includes("Nublado")) return <Cloud className="w-3 h-3 text-gray-400" />;
    if (weather.condition.includes("Chuvoso")) return <CloudRain className="w-3 h-3 text-blue-400" />;
    return <Thermometer className="w-3 h-3 text-accent" />;
  };

  return (
    <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border border-border whitespace-nowrap">
      {getIcon()}
      <span className="text-[10px] font-bold text-foreground uppercase">
        Campos {weather.temp}°C • {weather.condition}
      </span>
    </div>
  );
}
