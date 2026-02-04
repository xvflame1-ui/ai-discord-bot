import { Client, GatewayIntentBits } from "discord.js";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// tiny server so Railway keeps it alive
app.get("/", (req, res) => {
  res.send("Bot is alive");
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().includes("hello")) {
    message.reply("Hey 👋 I’m online.");
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN missing");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
