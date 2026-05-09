import { automateNews } from "../server/automation";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  console.log("Starting automation test...");
  try {
    const results = await automateNews();
    console.log("Automation results:", JSON.stringify(results, null, 2));
  } catch (error: any) {
    console.error("Automation FAILED:");
    console.error(error);
  }
}

run();
