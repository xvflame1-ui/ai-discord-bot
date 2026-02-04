import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  const channelName = message.channel.name || "";
  const isTicketChannel = channelName.startsWith("tickets-");
  const isMentioned = message.mentions.has(client.user);

  // Ignore everything else
  if (!isTicketChannel && !isMentioned) return;

  // Remove bot mention from content if present
  const cleanContent = message.content
    .replace(`<@${client.user.id}>`, "")
    .trim();

  // Temporary response (no AI yet)
  await message.reply(
    "Got it 👍 I can help with this.\nCan you explain a bit more about what you’re trying to do?"
  );
});

client.login(process.env.DISCORD_TOKEN);
