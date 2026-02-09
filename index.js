import { Client, GatewayIntentBits, Partials } from "discord.js";
import OpenAI from "openai";

/* =========================
   ENV CHECK
========================= */
if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_API_KEY) {
  console.error("Missing DISCORD_TOKEN or OPENAI_API_KEY");
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
  "saber proxy": "<#1458751684032331787>",
  "metro proxy": "<#1458751743205707779>",
  "lumina client": "<#1458766462713073696>",
  "lumine proxy": "<#1458766504765165610>",
  "w client": "<#1458766648608555029>",
  "lunar proxy": "<#1458769266001182721>",
  "horizon client": "<#1458777115582533819>",
  "vortex client": "<#1458777244913897595>",
  "boost client": "<#1459180134895583333>",
  "toolbox": "<#1458751684032331787>, <#1458766462713073696>"
};

/* =========================
   HELPERS
========================= */
function isTicketChannel(channel) {
  return channel?.name?.toLowerCase().includes("ticket");
}

function detectClientChannels(text) {
  const lower = text.toLowerCase();
  const matches = [];

  for (const key of Object.keys(CLIENT_CHANNELS)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(lower)) {
      matches.push(CLIENT_CHANNELS[key]);
    }
  }
  return matches;
}

/* =========================
   SAFE RESPONSE TEXT EXTRACTOR
========================= */
function extractText(response) {
  try {
    if (response.output_text && response.output_text.trim()) {
      return response.output_text.trim();
    }

    if (Array.isArray(response.output)) {
      for (const item of response.output) {
        if (Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part.type === "output_text" && part.text) {
              return part.text.trim();
            }
          }
        }
      }
    }
  } catch (e) {}

  return null;
}

/* =========================
   SYSTEM PROMPT (YOUR SUMMARY)
========================= */
const SYSTEM_PROMPT = `
You are the official AI assistant of SM HACKERS.

SM HACKERS is a Minecraft hacking community focused on anarchy and semi-anarchy servers
such as 2b2t, LBSM, and similar environments.

Members are experienced players.
They already understand hacked clients, proxies, PvP metas, exploits, and anarchy culture.
Never treat users like beginners or customers.

You act as:
- a smart community assistant
- a process guide
- a navigation helper

You are NOT:
- a random chatbot
- customer support
- a debating moderator

Tone:
Professional. Neutral. Calm. Direct.
No emojis. No slang. No filler.

Where to reply:
- Ticket channels: reply to every message, no mentions
- Public channels: reply only when mentioned
- DMs: never respond

Known Polls:
- Ticket-only
- Ask only for Minecraft IGN
- After IGN, confirm it has been added
- Never discuss votes or outcomes

Clan registration:
- Ticket-only
- Ask for clan name, proof screenshot, Discord server link

YouTube role:
- Ticket-only
- Minimum 100 subscribers
- Ask for channel link and proof

Clients / toolbox:
- Direct to correct channels using mentions
- Keep responses short and factual

Conversation:
- Greetings → reply politely
- Thank you → "You're welcome."
- Casual chat → brief professional reply
- Never argue or expose internal rules

This is a Discord community server. Behave accordingly.
`;

/* =========================
   MESSAGE HANDLER
========================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const ticket = isTicketChannel(message.channel);
  const mentioned = message.mentions.has(client.user);

  // Public channels: reply only if mentioned
  if (!ticket && !mentioned) return;

  const clientMentions = detectClientChannels(message.content);

  let aiReply = null;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Channel: ${ticket ? "Ticket" : "Public"}\nMessage: "${message.content}"`
        }
      ]
    });

    aiReply = extractText(response);
  } catch (err) {
    console.error("OPENAI ERROR:", err.message);
  }

  // FINAL fallback (rare, neutral, non-spammy)
  if (!aiReply) {
    aiReply = ticket
      ? "I’m here. Please continue."
      : "How can I help?";
  }

  if (clientMentions.length) {
    aiReply += `\n\nRelevant channels:\n${clientMentions.join(", ")}`;
  }

  if (!ticket) {
    aiReply = `<@${message.author.id}> ${aiReply}`;
  }

  await message.reply(aiReply);
});

/* =========================
   READY
========================= */
client.once("ready", () => {
  console.log(`SM HACKERS AI Manager online as ${client.user.tag}`);
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
