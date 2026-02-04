import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  console.log("📩 MESSAGE EVENT FIRED");

  if (message.author.bot) {
    console.log("↪ ignored bot message");
    return;
  }

  console.log("Author:", message.author.tag);
  console.log("Content:", message.content);

  const isMentioned = message.mentions.has(client.user);
  console.log("Mentioned:", isMentioned);

  if (!isMentioned) return;

  await message.reply("✅ I received your message.");
});

client.login(process.env.DISCORD_TOKEN);
