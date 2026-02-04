import { Client, GatewayIntentBits } from "discord.js";
import http from "http";

// ===============================
// 🟢 Fake HTTP server for Render
// ===============================
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running 👍");
}).listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

// ===============================
// 🤖 Discord Bot
// ===============================
console.log("Starting bot…");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Error visibility (keep this)
client.on("error", (err) => console.error("CLIENT ERROR:", err));
client.on("shardError", (err) => console.error("SHARD ERROR:", err));
process.on("unhandledRejection", (err) =>
  console.error("UNHANDLED PROMISE:", err)
);

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hi bot") {
    message.reply("Hey 👋 I’m alive!");
  }
});

console.log("Attempting Discord login…");

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => console.log("Login promise resolved"))
  .catch((err) => console.error("LOGIN FAILED:", err));
