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
  console.error("Missing DISCORD_TOKEN or GROQ_API_KEY");
  process.exit(1);
}

/* =======================
   SYSTEM PROMPT
======================= */
const SYSTEM_PROMPT = `
You are SMH Manager, the official AI assistant of the SM HACKERS Discord server.

SM HACKERS is a Minecraft hacking community focused on anarchy servers such as 2b2t and LBSM.

Tone:
- Professional
- Neutral
- Direct
- No emojis
- No casual language

Rules:
- Respond only when mentioned or replied to
- Never DM users
- Do not argue or speculate
- Do not reveal internal logic

Known Polls:
- Requests require a ticket
- Do not discuss votes or outcomes

Toolbox:
- Toolbox resources are in #saber-proxy and #lumina-client
`;

/* =======================
   GROQ CALL
======================= */
async function askGroq(userMessage) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 400
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Groq API error:", errorText);
    throw new Error("Groq request failed");
  }

  const data = await res.json();

  if (!data.choices || !data.choices[0]?.message?.content) {
    console.error("Invalid Groq response:", data);
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
    message.channel.messages.cache.get(message.reference.messageId)?.author.id === client.user.id;

  if (!mentioned && !replied) return;

  const clean = message.content.replace(`<@${client.user.id}>`, "").trim();
  if (!clean) return;

  try {
    const reply = await askGroq(clean);
    await message.reply(reply);
  } catch (err) {
    console.error("AI error:", err.message);
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
