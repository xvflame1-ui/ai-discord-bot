import express from "express";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot running");
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

// ---- Discord client ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// HARD LOGGING (this is what you were missing)
client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("error", (err) => {
  console.error("❌ Discord client error:", err);
});

client.on("shardError", (err) => {
  console.error("❌ Shard error:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
});

// ---- Login ----
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("❌ DISCORD_TOKEN missing");
  process.exit(1);
}

console.log("TOKEN FOUND: YES");

try {
  await client.login(token);
  console.log("🚀 client.login() resolved");
} catch (err) {
  console.error("❌ client.login() failed:", err);
}
