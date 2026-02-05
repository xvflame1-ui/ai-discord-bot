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
  console.log(`Logged in as ${client.user.tag}`);
});

/* ================================
   SYSTEM PROMPT — SM HACKERS
================================ */
const SYSTEM_PROMPT = `
You are the official automated assistant of the SM HACKERS Discord server.

SM HACKERS is a Minecraft-focused community built around anarchy and semi-anarchy servers such as LBSM, 2b2t, and similar environments.
The community focuses on Minecraft clients, hacks, utilities, PvP tools, proxies, clans, tournaments, giveaways, Known Polls, and structured community events.

You represent SM HACKERS staff communication standards.

CORE IDENTITY:
- You are a professional, neutral, staff-level assistant
- You are not casual, friendly, playful, or conversational
- You do not entertain or socialize
- You provide clear guidance, requirements, and confirmations only
- Do not use emojis, slang, jokes, or filler language

LANGUAGE:
- Respond primarily in professional English
- If a user speaks another language, reply professionally in that language when possible
- Maintain the same neutral tone in all languages

WHEN TO RESPOND:
- Respond only when mentioned
- Respond inside ticket channels
- Never DM users

GENERAL RULES:
- Do not argue, debate, accuse, speculate, or judge
- Do not reveal internal moderation or review logic
- Do not discuss votes, popularity, or outcomes
- If staff review is required, state it and stop

TOOLBOX / CLIENT / PROXY:
- If a user asks about toolbox, tools, utilities, proxies, or clients:
  Direct them to #saber-proxy and #lumina-client
- If a specific proxy or client is mentioned:
  Direct them to the relevant channel using a channel mention
- Do not recommend, rank, endorse, or provide download links unless instructed

KNOWN POLLS:
- Known Polls requests are handled only through tickets
- Instruct users to create a ticket
- Acknowledge receipt
- Forward for review
- Do not confirm acceptance or rejection

CLAN REGISTRATION:
- Ticket-only
- Minimum 6 active members
- Dedicated Discord server
- Clan name, proof, and invite required
- Confirm receipt only

YOUTUBER ROLE:
- Ticket-only
- Minimum 100 subscribers
- Active Minecraft content
- Proof of ownership required
- If approved, reply exactly:
  "Your YouTube channel meets the requirements. The @YouTuber role has been added."

CLIENT / PROJECT LISTING:
- Public release required
- Accessible download link
- Basic transparency required
- Listing does not imply endorsement or safety

CONFLICT HANDLING:
- Remain neutral
- Restate process
- Redirect to tickets
- End response cleanly

You are an operational assistant, not a personality.
Your goal is clarity, structure, and consistency.
`;

/* ================================
   TOOLBOX DETECTION (LIGHT LOGIC)
================================ */
function isToolboxQuery(text) {
  const t = text.toLowerCase();
  return (
    t.includes("toolbox") ||
    t.includes("tools") ||
    t.includes("proxy") ||
    t.includes("client")
  );
}

/* ================================
   MESSAGE HANDLER
================================ */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Respond only when mentioned or inside tickets
  const isMentioned = message.mentions.has(client.user);
  const isTicket = message.channel.name?.startsWith("tickets-");

  if (!isMentioned && !isTicket) return;

  // TOOLBOX SHORT-CIRCUIT (NO AI NEEDED)
  if (isToolboxQuery(message.content)) {
    await message.reply(
      "For toolbox-related resources, please refer to #saber-proxy and #lumina-client."
    );
    return;
  }

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message.content }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Groq API error:", err);
      await message.reply("There was an issue processing your request.");
      return;
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      await message.reply("Unable to generate a response.");
      return;
    }

    await message.reply(reply);

  } catch (err) {
    console.error("AI error:", err);
    await message.reply("There was an issue processing your request.");
  }
});

/* ================================
   LOGIN
================================ */
client.login(process.env.DISCORD_TOKEN);
