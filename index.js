import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

/* ================================
   CONFIG
================================ */
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

/* ================================
   DISCORD CLIENT
================================ */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("🔑 DISCORD_TOKEN:", !!process.env.DISCORD_TOKEN);
  console.log("🔑 GROQ_API_KEY:", !!process.env.GROQ_API_KEY);
});

/* ================================
   SYSTEM PROMPT (SM HACKERS)
================================ */
const SYSTEM_PROMPT = `
You are the official AI assistant for the SM HACKERS Discord server.

Your role:
- Act professional, calm, and human-like
- Help users with Known Polls, clan registration, roles, and server guidance
- Do NOT make decisions publicly
- Do NOT argue or debate
- If something requires review, say it will be forwarded
- Keep replies natural, not robotic

Tone:
- Chill but professional
- Clear and respectful
- Match the user's language/slang but stay clean
`;

/* ================================
   MESSAGE HANDLER
================================ */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Bot only replies when mentioned
  if (!message.mentions.has(client.user)) return;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message.content }
        ],
        temperature: 0.4,
        max_tokens: 300
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Groq API error:", err);
      await message.reply("There was an issue processing your request.");
      return;
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      await message.reply("I didn’t get a clear response. Try again.");
      return;
    }

    await message.reply(reply);

  } catch (err) {
    console.error("❌ AI error:", err);
    await message.reply("There was an issue processing your request.");
  }
});

/* ================================
   LOGIN
================================ */
client.login(process.env.DISCORD_TOKEN);
