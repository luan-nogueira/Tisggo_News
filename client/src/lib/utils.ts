import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCategoryEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('esporte')) return '⚽';
  if (n.includes('polícia')) return '🚨';
  if (n.includes('cidade')) return '🏙️';
  if (n.includes('economia')) return '📈';
  if (n.includes('geral')) return '📰';
  return '🗞️';
};
