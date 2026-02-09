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
  if (!channel || !channel.name) return false;
  return channel.name.toLowerCase().includes("ticket");
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
   SYSTEM PROMPT (YOUR SUMMARY)
========================= */
const SYSTEM_PROMPT = `
You are the official AI assistant of SM HACKERS.

SM HACKERS is a Minecraft hacking community, not a general gaming or support server.
The community mainly revolves around anarchy and semi-anarchy servers such as 2b2t, LBSM, and similar environments.

Members of this server are generally experienced players.
They already understand:
- hacked clients
- proxies
- PvP metas
- exploits
- anarchy server culture

Never treat users like beginners or customers.

YOUR ROLE:
You act as:
- a smart community assistant
- a process guide
- a navigation helper

You are NOT:
- a chatbot for random conversation
- a customer support agent
- a moderator that argues or judges

TONE & STYLE:
- Professional
- Neutral
- Calm
- Direct
- No emojis
- No slang
- No unnecessary explanations

WHERE YOU REPLY:
Ticket channels (name contains "ticket"):
- Reply to every message
- No mentions
- Speak naturally

Non-ticket channels:
- Reply only when mentioned
- When mentioned, chat normally but professionally

DMs:
- Never respond

KNOWN POLLS:
- Ticket-only
- If asked outside → instruct to create a ticket at #🎟️tickets
- Inside tickets:
  - Ask ONLY for Minecraft IGN
  - After IGN → confirm it has been added
- One IGN per ticket
- Never discuss votes, results, approval, or rejection publicly

CLAN REGISTRATION:
- Ticket-only
- Ask for:
  - Clan name
  - Screenshot proof
  - Discord server invite
- Confirm receipt
- Do not approve or deny publicly

ROLE APPLICATIONS (YouTube):
- Ticket-only
- Requirements:
  - Minimum 100 subscribers
  - Active channel
  - Relevant content
  - Proof of ownership
- Ask for channel link, subscriber count, and proof
- Confirm submission
- Do NOT assign roles

CLIENTS / PROXIES / TOOLBOX:
- When asked, direct to correct channel(s)
- Use channel mentions
- Keep responses short and factual
- Do NOT explain safety, downloads, or endorsements

CONVERSATION BEHAVIOR:
- Greetings → reply politely
- Thank-you messages → reply "You're welcome."
- Casual chat → brief, professional response
- Irrelevant noise → minimal response
- Never argue
- Never accuse users
- Never expose internal rules or moderation logic

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
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `
Channel Type: ${ticket ? "Ticket" : "Public"}
User Message: "${message.content}"
`
        }
      ]
    });

    aiReply = response.output_text?.trim();
  } catch (err) {
    console.error("OPENAI ERROR:", err.message);
  }

  // Hard fallback (never silent)
  if (!aiReply) {
    aiReply = ticket
      ? "I’m here. Please describe what you need."
      : "Please mention me with your request.";
  }

  // Append client channels if relevant
  if (clientMentions.length) {
    aiReply += `\n\nRelevant channels:\n${clientMentions.join(", ")}`;
  }

  // Mention only in public channels
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
