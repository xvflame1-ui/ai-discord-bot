import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";
import fetch from "node-fetch";

/* ================================
   CONFIG
================================ */
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama3-8b-8192";
const MIN_CONFIDENCE = 0.6;

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
});

/* ================================
   SYSTEM PROMPT (SM HACKERS)
================================ */
const SYSTEM_PROMPT = `
You are an AI assistant inside the SM HACKERS Discord server.

You are a professional community handler, not a casual chatbot.

Rules:
- Respond clearly and professionally.
- Do not argue, accuse, or reveal internal logic.
- Do not make decisions publicly beyond confirmations.
- You are helpful, neutral, and concise.

If a request is unclear, ask for clarification.
`;

/* ================================
   MESSAGE HANDLER
================================ */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Only respond when mentioned (TEST MODE)
  const isMentioned = message.mentions.has(client.user);
  if (!isMentioned) return;

  const member = await message.guild.members.fetch(message.author.id);
  const isAdmin = member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  const mentionedUsers = [...message.mentions.users.keys()];

  /* ================================
     AI CALL
  ================================ */
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `
Message from user:
"${message.content}"

Mentioned user IDs:
${mentionedUsers.length ? mentionedUsers.join(", ") : "none"}

Is the author an admin: ${isAdmin}
`
        }
      ]
    })
  });

  if (!response.ok) {
    console.error("Groq error:", await response.text());
    await message.reply("There was an error processing your request.");
    return;
  }

  let aiText;
  try {
    const data = await response.json();
    aiText = data.choices[0].message.content.trim();
  } catch {
    await message.reply("I couldn’t process that properly. Please try again.");
    return;
  }

  // Final reply (ONCE)
  await message.reply(aiText);
});

/* ================================
   LOGIN
================================ */
client.login(process.env.DISCORD_TOKEN);
