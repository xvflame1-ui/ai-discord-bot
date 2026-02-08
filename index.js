// ==============================
// SM HACKERS AI MANAGER
// FINAL – ALWAYS REPLY VERSION
// ==============================

import {
  Client,
  GatewayIntentBits,
  Partials
} from "discord.js";
import OpenAI from "openai";

// ==============================
// ENV CHECK
// ==============================
if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_API_KEY) {
  console.error("Missing DISCORD_TOKEN or OPENAI_API_KEY");
  process.exit(1);
}

// ==============================
// CLIENT SETUP
// ==============================
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

// ==============================
// SM HACKERS CONSTANT DATA
// ==============================
const CLIENT_CHANNELS = {
  saberproxy: "<#1458751684032331787>",
  metroproxy: "<#1458751743205707779>",
  luminaclient: "<#1458766462713073696>",
  lumineproxy: "<#1458766504765165610>",
  wclient: "<#1458766648608555029>",
  lunarproxy: "<#1458769266001182721>",
  horionclient: "<#1458777115582533819>",
  vortexclient: "<#1458777244913897595>",
  boostclient: "<#1459180134895583333>"
};

const TICKET_CHANNEL_KEYWORDS = ["ticket"];

// ==============================
// UTILS
// ==============================
function isTicketChannel(channel) {
  if (!channel || !channel.name) return false;
  const name = channel.name.toLowerCase();
  return TICKET_CHANNEL_KEYWORDS.some(k => name.includes(k));
}

function extractClientMentions(text) {
  const t = text.toLowerCase();
  return Object.entries(CLIENT_CHANNELS)
    .filter(([k]) => t.includes(k.replace("client", "").replace("proxy", "")))
    .map(([_, v]) => v);
}

// ==============================
// SYSTEM PROMPT (CRITICAL)
// ==============================
const SYSTEM_PROMPT = `
You are **SMH Manager**, the official AI assistant of the SM HACKERS Discord server.

This server is a Minecraft hacking community for LBSM, 2B2T, and related servers.

YOU MUST ALWAYS REPLY.
You are NOT allowed to stay silent.

GENERAL BEHAVIOR:
- Professional, neutral, direct.
- Never casual slang.
- Never emojis unless necessary.
- Never argue.
- Never expose internal logic.
- Never DM users.
- Never accuse users.

TICKETS:
- If message is in a ticket channel, reply WITHOUT mentioning the user.
- If outside ticket channel, reply ONLY when mentioned.
- For Known Polls, Clan Registration, Role Applications → tickets only.
- If asked outside tickets, instruct: "Create a ticket at #🎟️tickets".

KNOWN POLLS:
- Ask ONLY for Minecraft IGN.
- One IGN per ticket.
- After IGN is provided, confirm receipt.
- Do NOT decide approval publicly.

CLAN REGISTRATION:
- Requires: clan name, screenshot proof, Discord server link.
- Ask clearly and step-by-step.

YOUTUBE ROLE:
- Requires: 100+ subs, channel link, proof of ownership.
- If requirements met → confirm role added.
- If not → explain clearly.

CLIENT / TOOLBOX QUESTIONS:
- If toolbox or clients asked, provide correct channel mentions.
- Use channel IDs provided.
- Do NOT say "I cannot help".

GREETINGS & THANKS:
- Greetings → greet back.
- Thank you → "You're welcome."
- Do NOT repeat greetings unnecessarily, but ALWAYS acknowledge.

IMPORTANT:
- You must understand context across messages.
- You must never reply with placeholders.
- You must NEVER say "Please clarify" unless absolutely necessary.
`;

// ==============================
// MESSAGE HANDLER
// ==============================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const ticket = isTicketChannel(message.channel);
  const mentioned = message.mentions.has(client.user);

  // Outside ticket → must be mentioned
  if (!ticket && !mentioned) return;

  try {
    const clientMentions = extractClientMentions(message.content);

    const userPrompt = `
Channel Type: ${ticket ? "Ticket" : "Public"}
User Message: "${message.content}"

Client Channels Found:
${clientMentions.length ? clientMentions.join(", ") : "None"}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.35
    });

    let reply = completion.choices[0].message.content.trim();

    // Inject client channels if relevant
    if (clientMentions.length) {
      reply += `\n\nRelevant channels:\n${clientMentions.join(", ")}`;
    }

    // Mention logic
    if (!ticket) {
      reply = `<@${message.author.id}> ${reply}`;
    }

    await message.reply(reply);

  } catch (err) {
    console.error("AI ERROR:", err);
    await message.reply(
      ticket
        ? "An internal error occurred. Please wait."
        : `<@${message.author.id}> An internal error occurred.`
    );
  }
});

// ==============================
// READY
// ==============================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ==============================
client.login(process.env.DISCORD_TOKEN);
