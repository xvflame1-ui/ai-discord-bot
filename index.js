import { Client, GatewayIntentBits, Partials } from "discord.js";
import OpenAI from "openai";

// ===== ENV CHECK =====
if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_API_KEY) {
  console.error("Missing DISCORD_TOKEN or OPENAI_API_KEY");
  process.exit(1);
}

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ===== OPENAI =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== CONFIG =====
const TICKET_PREFIX = "ticket";
const TICKETS_CHANNEL_NAME = "🎟️tickets";

// Client channel IDs
const CLIENT_CHANNELS = {
  saberproxy: "<#1458751684032331787>",
  metroproxy: "<#1458751743205707779>",
  luminaclient: "<#1458766462713073696>",
  lumineproxy: "<#1458766504765165610>",
  wclient: "<#1458766648608555029>",
  lunarproxy: "<#1458769266001182721>",
  horion: "<#1458777115582533819>",
  vortex: "<#1458777244913897595>",
  boost: "<#1459180134895583333>"
};

// ===== SYSTEM PROMPT (THE BRAIN) =====
const SYSTEM_PROMPT = `
You are "SMH Manager", the official AI assistant of the SM HACKERS Discord community.

Community context:
- SM HACKERS is a Minecraft hacking community
- Focused on LBSM, 2B2T, and similar servers
- Users discuss clients, proxies, clans, known polls, roles, and tools

Core behavior rules (VERY IMPORTANT):

1. You are professional, neutral, calm. Never cringe, never overfriendly.
2. You understand slang, broken English, and casual messages.
3. You ALWAYS understand context before responding.
4. You NEVER argue with users.
5. You NEVER expose internal logic or moderation decisions.
6. You NEVER DM users.

Ticket logic:
- If the channel name starts with "ticket", it IS a ticket.
- Inside tickets:
  - Reply WITHOUT mentioning the user.
  - Respond to greetings ("hi", "hello") politely.
  - Respond to thank you with "You're welcome."
- Outside tickets:
  - Only reply when mentioned.
  - Redirect users to create a ticket if required.

Known Polls:
- Users must request Known Polls inside a ticket.
- Ask ONLY for Minecraft IGN.
- Once IGN is provided, confirm receipt.
- Do not ask for server, proof, or extra info.

Clan registration:
- Must be done in a ticket.
- Ask for:
  - Clan name
  - Screenshot proof
  - Discord server link

YouTube role:
- Must be requested in a ticket.
- Requirement: 100+ subscribers
- Ask for channel link and proof.

Toolbox / clients:
- If user asks about toolbox or proxies:
  - Respond with the correct channel mentions.
  - Saber Proxy → #saber-proxy
  - Lumina Client → #lumina-client
- Do NOT explain downloads or safety.

Greetings:
- If a conversation already started, do NOT re-greet.
- Reply naturally.

If a message is irrelevant, spam, or unclear:
- Respond briefly or ignore if appropriate.

You decide when to respond.
If no response is needed, reply with EXACTLY:
NO_RESPONSE
`;

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const channelName = message.channel.name || "";
  const isTicket = channelName.startsWith(TICKET_PREFIX);
  const isMentioned = message.mentions.has(client.user);

  // Outside tickets, ignore unless mentioned
  if (!isTicket && !isMentioned) return;

  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `
Channel: ${channelName}
IsTicket: ${isTicket}
UserMessage: ${message.content}
`
        }
      ]
    });

    const reply = aiResponse.choices[0].message.content.trim();

    if (reply === "NO_RESPONSE") return;

    // Mention only outside tickets
    const finalReply = isTicket
      ? reply
      : `<@${message.author.id}> ${reply}`;

    await message.channel.send(finalReply);

  } catch (err) {
    console.error("AI Error:", err.message);
  }
});

// ===== READY =====
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);
