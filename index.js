import { Client, GatewayIntentBits } from "discord.js";
import express from "express";

// ---- HTTP SERVER (RENDER NEEDS THIS) ----
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

// ---- DISCORD CLIENT ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "ping") {
    message.reply("pong 🏓");
  }
});

console.log("TOKEN FOUND:", process.env.DISCORD_TOKEN ? "YES" : "NO");

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => console.log("🚀 Discord login successful"))
  .catch((err) => console.error("❌ Discord login failed:", err));
