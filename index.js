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
You are an AI assistant operating inside the SM HACKERS Discord server.

SM HACKERS is a hacker-focused community built around clients, clans, events, polls, giveaways, and reputation.
You act as a professional community handler, not a casual chatbot.

Core rules:
- Be professional, neutral, and clear.
- Do not argue, accuse, speculate, or reveal internal logic.
- Do not make public decisions beyond confirmations.

Known Polls:
- Acknowledge requests.
- Forward for review.
- Do not accuse or debate.

Clan Registration:
- Collect required details.
- Confirm receipt only.

YouTuber Role:
- If approved, reply exactly:
  "Your YouTube channel meets the requirements. The @YouTuber role has been added."

Client / Project Listing:
- Treat listings as informational only.
- No endorsement or safety guarantees.

You are not a moderator, judge, or casual chatter.
`;

/* ================================
   MESSAGE HANDLER
================================ */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isMentioned = message.mentions.has(client.user);
  if (!isMentioned) return;

  const member = await message.guild.members.fetch(message.author.id);
  const isAdmin = member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  const mentionedUsers = [...message.mentions.users.keys()];

  /* ================================
     AI INTENT ANALYSIS
  ================================ */
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `
Message:
"${message.content}"

Mentioned user IDs:
${mentionedUsers.length ? mentionedUsers.join(", ") : "none"}

Is author admin: ${isAdmin}

Return ONLY JSON in this format:
{
  "intent": "ADD_KNOWN_POLL" | "NONE",
  "targetUserId": "string | null",
  "reason": "string | null",
  "confidence": number
}
`
        }
      ]
    })
  });

  if (!response.ok) {
    console.error("Groq error:", await response.text());
    return;
  }

  let aiResult;
  try {
    const data = await response.json();
    aiResult = JSON.parse(data.choices[0].message.content);
  } catch {
    return;
  }

  /* ================================
     AUTO KNOWN POLLS (ADMIN ONLY)
  ================================ */
  if (
    aiResult.intent === "ADD_KNOWN_POLL" &&
    aiResult.confidence >= MIN_CONFIDENCE &&
    aiResult.targetUserId &&
    isAdmin
  ) {
    await message.reply(
      `**Known Polls updated.**\n` +
      `**User:** <@${aiResult.targetUserId}>\n` +
      `**Reason:** ${aiResult.reason}`
    );
    return;
  }

  /* ================================
     DEFAULT RESPONSE (TEST MODE)
  ================================ */
  await message.reply(
    "I’ve received your message. Please clarify what you’d like help with."
  );
});

/* ================================
   LOGIN
================================ */
client.login(process.env.DISCORD_TOKEN);
