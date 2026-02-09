import { Client, GatewayIntentBits, Partials } from "discord.js";
import OpenAI from "openai";

/* ================= ENV ================= */
if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_API_KEY) {
  console.error("Missing DISCORD_TOKEN or OPENAI_API_KEY");
  process.exit(1);
}

/* ================= CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ================= DATA ================= */
const CLIENT_CHANNELS = {
  saberproxy: "<#1458751684032331787>",
  metroproxy: "<#1458751743205707779>",
  luminaclient: "<#1458766462713073696>",
  lumineproxy: "<#1458766504765165610>",
  wclient: "<#1458766648608555029>",
  lunarproxy: "<#1458769266001182721>",
  horizonclient: "<#1458777115582533819>",
  vortexclient: "<#1458777244913897595>",
  boostclient: "<#1459180134895583333>",
  toolbox: "<#1458751684032331787>, <#1458766462713073696>"
};

function isTicket(channel) {
  return channel?.name?.toLowerCase().includes("ticket");
}

function findClientChannels(text) {
  const t = text.toLowerCase();
  return Object.entries(CLIENT_CHANNELS)
    .filter(([k]) => t.includes(k.replace("client", "").replace("proxy", "")))
    .map(([, v]) => v);
}

/* ================= SYSTEM PROMPT ================= */
const SYSTEM_PROMPT = `
You are SMH Manager, the official AI assistant of the SM HACKERS Discord.

Rules:
- Professional, neutral, concise
- Always reply
- No rambling
- No emojis
- No filler
- No moderation talk
- No DMs

Behavior:
- Greetings → short greeting
- Thanks → "You're welcome."
- Toolbox / clients → give channel mentions
- Known Polls / Roles / Clans → ticket-only instructions
`;

/* ================= HANDLER ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const ticket = isTicket(message.channel);
  const clientChannels = findClientChannels(message.content);

  let aiText = null;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `
ChannelType: ${ticket ? "Ticket" : "Public"}
Message: "${message.content}"
`
        }
      ]
    });

    aiText = response.output_text?.trim();

  } catch (err) {
    console.error("OPENAI ERROR:", err.message);
  }

  // HARD FALLBACK (NEVER SILENT)
  if (!aiText) {
    aiText = ticket
      ? "I’m here. Please state your request."
      : "Please mention me with your request.";
  }

  if (clientChannels.length) {
    aiText += `\n\nRelevant channels:\n${clientChannels.join(", ")}`;
  }

  if (!ticket) {
    aiText = `<@${message.author.id}> ${aiText}`;
  }

  await message.reply(aiText);
});

/* ================= READY ================= */
client.once("ready", () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
