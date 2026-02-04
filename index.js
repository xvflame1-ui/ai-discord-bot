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
- Tickets are mandatory for Known Polls, clan registration, YouTuber role verification, and client/project listings.
- If a request is made outside a ticket, instruct the user to create a ticket.
- Do not argue, accuse, speculate, or reveal internal logic.
- Do not make public decisions beyond confirmations.

Known Polls:
- Acknowledge requests made inside tickets.
- Forward for review.
- Do not decide eligibility or discuss outcomes.
- Outside tickets: instruct to create a ticket.

Clan Registration:
- Ticket-only.
- Ask for clan name, proof, and Discord invite.
- Confirm receipt only.

YouTuber Role:
- Ticket-only.
- If approved, reply exactly:
  "Your YouTube channel meets the requirements. The @YouTuber role has been added."
- If not approved, state requirements are not met.

Client / Project Listing:
- Ticket-only.
- Listing does not imply endorsement or safety guarantee.

Your tone must be professional, neutral, and natural.
You are not a moderator, judge, or casual chatter.
`;

/* ================================
   MESSAGE HANDLER
================================ */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const channelName = message.channel.name || "";
  const isTicket = channelName.startsWith("tickets-");
  const isMentioned = message.mentions.has(client.user);

  // Ignore normal chat
  if (!isTicket && !isMentioned) return;

  const member = await message.guild.members.fetch(message.author.id);
  const isAdmin = member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  const mentionedUsers = [...message.mentions.users.keys()];

  // If request is about KP / clan / role / listing but NOT in ticket
  if (!isTicket) {
    await message.reply(
      "For this request, please create a ticket so it can be reviewed properly."
    );
    return;
  }

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
     DEFAULT PROFESSIONAL RESPONSE
  ================================ */
  await message.reply(
    "Your request has been received. Please provide any additional details needed so it can be reviewed."
  );
});

/* ================================
   LOGIN
================================ */
client.login(process.env.DISCORD_TOKEN);
