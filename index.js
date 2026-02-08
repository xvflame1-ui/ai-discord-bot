import { Client, GatewayIntentBits, Partials } from "discord.js";
import OpenAI from "openai";

/* =========================
   ENV CHECK
========================= */
if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_API_KEY) {
  console.error("ENV ERROR: Missing DISCORD_TOKEN or OPENAI_API_KEY");
  process.exit(1);
}

/* =========================
   DISCORD CLIENT
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* =========================
   OPENAI CLIENT
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   CONSTANT DATA
========================= */
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

/* =========================
   HELPERS
========================= */
function isTicketChannel(channel) {
  if (!channel || !channel.name) return false;
  return channel.name.toLowerCase().includes("ticket");
}

function extractClients(text) {
  const t = text.toLowerCase();
  const hits = [];
  for (const [key, value] of Object.entries(CLIENT_CHANNELS)) {
    if (t.includes(key.replace("client", "").replace("proxy", ""))) {
      hits.push(value);
    }
  }
  return hits;
}

/* =========================
   SYSTEM PROMPT (AI BRAIN)
========================= */
const SYSTEM_PROMPT = `
You are SMH Manager, the official AI assistant of the SM HACKERS Discord server.

Context:
- SM HACKERS is a Minecraft hacking community (2b2t, LBSM, anarchy servers).
- Users are experienced; do not act like tech support.

Rules:
- ALWAYS reply. Never stay silent.
- Professional, neutral, direct.
- Never DM users.
- Never argue.
- Never expose internal moderation logic.

Tickets:
- If channel is a ticket, reply normally (no mentions).
- Known Polls: ticket-only, ask ONLY for Minecraft IGN.
- Clan registration: ticket-only, ask for clan name, proof, Discord server.
- YouTube role: ticket-only, require 100+ subs, channel link, proof.

Clients / Toolbox:
- When asked, give correct channel mentions.

Greetings:
- Reply politely.
Thanks:
- Reply "You're welcome."

You decide the wording, but MUST follow rules above.
`;

/* =========================
   MESSAGE HANDLER
========================= */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    // HARD DEBUG – proves bot sees messages
    console.log("MSG:", message.channel?.name, message.author.tag, message.content);

    const ticket = isTicketChannel(message.channel);
    const clientMentions = extractClients(message.content);

    let userContext = `
Channel: ${ticket ? "Ticket" : "Public"}
Message: "${message.content}"
`;

    if (clientMentions.length) {
      userContext += `\nDetected client channels: ${clientMentions.join(", ")}`;
    }

    let aiText = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContext }
        ]
      });

      aiText = completion.choices[0].message.content.trim();
      console.log("AI:", aiText);

    } catch (aiErr) {
      console.error("OPENAI ERROR:", aiErr.message);
    }

    // Fallback if AI fails (IMPORTANT)
    if (!aiText || aiText.length === 0) {
      aiText = ticket
        ? "I’m here. Please describe what you need."
        : "I’m here. Please mention me with your request.";
    }

    // Append client channels if relevant
    if (clientMentions.length) {
      aiText += `\n\nRelevant channels:\n${clientMentions.join(", ")}`;
    }

    await message.reply(aiText);

  } catch (err) {
    console.error("MESSAGE HANDLER ERROR:", err);
    try {
      await message.reply("An internal error occurred. Please try again.");
    } catch {}
  }
});

/* =========================
   READY
========================= */
client.once("ready", () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
