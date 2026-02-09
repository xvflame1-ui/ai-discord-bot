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

function isTicketChannel(channel) {
  return channel?.name?.toLowerCase().includes("ticket");
}

function findClientMentions(text) {
  const t = text.toLowerCase();
  return Object.entries(CLIENT_CHANNELS)
    .filter(([k]) => t.includes(k.replace("client", "").replace("proxy", "")))
    .map(([, v]) => v);
}

/* ================= SYSTEM PROMPT ================= */
const SYSTEM_PROMPT = `
You are SMH Manager for the SM HACKERS Discord.

You must be:
- Professional
- Neutral
- Direct
- Concise

STRICT RULES:
- NEVER ramble
- NEVER explain unless asked
- NEVER roleplay
- NEVER add filler sentences
- Reply in ONE short paragraph maximum

RESPONSE FORMAT (MANDATORY JSON):
{
  "reply": "string",
  "confidence": "high|medium|low"
}

CONTENT RULES:
- Greetings → short greeting
- Thanks → "You're welcome."
- Casual chatter → brief acknowledgment
- Actionable question → direct answer
- Toolbox / clients → give channels
- Tickets → no mentions
- Outside tickets → mention user
`;

/* ================= HANDLER ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const ticket = isTicketChannel(message.channel);
  const clientMentions = findClientMentions(message.content);

  const userPrompt = `
ChannelType: ${ticket ? "Ticket" : "Public"}
Message: "${message.content}"
DetectedClients: ${clientMentions.join(", ") || "None"}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    });

    let raw = completion.choices[0].message.content.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, confidence: "low" };
    }

    let replyText = parsed.reply;

    if (clientMentions.length) {
      replyText += `\n\nRelevant channels:\n${clientMentions.join(", ")}`;
    }

    if (!ticket) {
      replyText = `<@${message.author.id}> ${replyText}`;
    }

    await message.reply(replyText);

  } catch (err) {
    console.error("ERROR:", err);
    await message.reply(
      ticket
        ? "An error occurred. Please try again."
        : `<@${message.author.id}> An error occurred.`
    );
  }
});

/* ================= READY ================= */
client.once("ready", () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
