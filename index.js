import { Client, GatewayIntentBits } from "discord.js";

console.log("Starting bot…");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 🔴 LOG ALL ERRORS (IMPORTANT)
client.on("error", (err) => {
  console.error("CLIENT ERROR:", err);
});

client.on("shardError", (error) => {
  console.error("SHARD ERROR:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED PROMISE:", reason);
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hi bot") {
    message.reply("Hey 👋 I’m alive!");
  }
});

// 🔴 EXPLICIT LOGIN LOG
console.log("Attempting Discord login…");

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("Login promise resolved"))
  .catch((err) => console.error("LOGIN FAILED:", err));
