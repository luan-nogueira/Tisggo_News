import { execSync } from 'child_process';
import fs from 'fs';

try {
  const envFile = fs.readFileSync('.env', 'utf-8');
  const lines = envFile.split('\n');
  const dbLine = lines.find(line => line.startsWith('DATABASE_URL='));
  if (dbLine) {
    const url = dbLine.split('=')[1].replace(/^'|'$/g, '').replace(/^"|"$/g, '').trim();
    console.log("Setting production DATABASE_URL...");
    execSync('npx vercel env add DATABASE_URL production', { input: url, stdio: ['pipe', 'inherit', 'inherit'] });
    console.log("Setting preview DATABASE_URL...");
    execSync('npx vercel env add DATABASE_URL preview', { input: url, stdio: ['pipe', 'inherit', 'inherit'] });
    console.log("Setting development DATABASE_URL...");
    execSync('npx vercel env add DATABASE_URL development', { input: url, stdio: ['pipe', 'inherit', 'inherit'] });
    console.log("Env vars updated successfully!");
  } else {
    console.log("DATABASE_URL not found in .env");
  }
} catch (error) {
  console.error("Error setting env vars:", error.message);
}
