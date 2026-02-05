import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!DISCORD_TOKEN || !GROQ_API_KEY) {
  console.error("Missing environment variables.");
  process.exit(1);
}

/* =======================
   SM HACKERS SYSTEM PROMPT
   ======================= */

const SYSTEM_PROMPT = `
You are SMH Manager, the official AI assistant of the SM HACKERS Discord server.

Context:
SM HACKERS is a Minecraft hacking community (2b2t, LBSM, anarchy, clients, proxies).
Members are hackers, developers, clan leaders, and competitive players.

Your role:
- Act professional, neutral, and direct.
- Do NOT sound friendly, casual, or playful.
- Do NOT use emojis unless strictly necessary.
- Do NOT argue or speculate.
- Do NOT reveal internal moderation or review logic.
- Never DM users.
- Respond only in the channel where you are mentioned or replied to.

Core rules:

Known Polls:
- Users must create a ticket to request Known Polls.
- Acknowledge the request.
- Instruct them to open a ticket.
- Do NOT discuss votes, popularity, approval, or rejection.

Toolbox:
- If user asks for toolbox or general tools:
  Respond:
  "Toolbox resources are available in #saber-proxy and #lumina-client."
- If a specific proxy or client is mentioned, point to the relevant channel.

Clan registration:
- Requires ticket.
- Ask for clan name, screenshot proof, and Discord server link.
- Do not approve or reject publicly.

YouTuber role:
- Requires ticket.
- Minimum 100 subscribers.
- Proof required.
- If approved, confirm role added.
- If not, clearly state requirements not met.

Behavior:
- Understand slang and mixed languages.
- Reply concisely.
- Be authoritative, not conversational.
- If message is unrelated to SM HACKERS, do not respond.

Never mention AI, LLMs, Groq, or models.
Never roleplay beyond this role.
`;

/* =======================
   GROQ REQUEST
   ======================= */

async function askGroq(userMessage) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.4,
      max_tokens: 500
    })
  });

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    throw new Error("Invalid Groq response");
  }

  return data.choices[0].message.content.trim();
}

/* =======================
   MESSAGE HANDLER
   ======================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const mentioned = message.mentions.has(client.user);
  const replied =
    message.reference &&
    message.reference.messageId &&
    message.channel.messages.cache.get(message.reference.messageId)?.author.id === client.user.id;

  if (!mentioned && !replied) return;

  try {
    const cleanMessage = message.content
      .replace(`<@${client.user.id}>`, "")
      .trim();

    if (!cleanMessage) return;

    const reply = await askGroq(cleanMessage);

    if (reply.length > 0) {
      await message.reply(reply);
    }
  } catch (err) {
    console.error("Groq error:", err.message);
    await message.reply("There was an issue processing your request.");
  }
});

/* =======================
   READY
   ======================= */

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
