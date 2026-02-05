import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';
import Groq from 'groq-sdk';

/* ================= ENV ================= */
if (!process.env.DISCORD_TOKEN || !process.env.GROQ_API_KEY) {
  console.error('Missing env variables');
  process.exit(1);
}

/* ================= CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ================= CONSTANTS ================= */
const TICKET_PREFIX = 'ticket-';
const TICKET_CHANNEL = '#🎟️tickets';
const KP_FILE = './known_polls.json';

/* ================= STORAGE ================= */
if (!fs.existsSync(KP_FILE)) fs.writeFileSync(KP_FILE, JSON.stringify({}));

function loadKP() {
  return JSON.parse(fs.readFileSync(KP_FILE));
}

function saveKP(data) {
  fs.writeFileSync(KP_FILE, JSON.stringify(data, null, 2));
}

/* ================= AI CLASSIFIER ================= */
async function classify(text) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.2,
    max_tokens: 250,
    messages: [
      {
        role: 'system',
        content: `
You are SMH Manager for the SM HACKERS Discord (Minecraft hacking community).

Decide:
1. Is this message relevant and actionable for the bot?
2. If yes, what intent?

Rules:
- Ignore casual chat, confirmations, thanks, greetings
- Reply ONLY if action is needed
- Be strict

Output JSON ONLY:
{
  "should_reply": true | false,
  "intent": "KNOWN_POLLS" | "CLIENT_INFO" | "OTHER"
}
`
      },
      { role: 'user', content: text }
    ]
  });

  return JSON.parse(res.choices[0].message.content);
}

/* ================= MESSAGE HANDLER ================= */
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const isTicket = message.channel.name.startsWith(TICKET_PREFIX);
  const kpData = loadKP();
  const ticketId = message.channel.id;

  /* ========= ACTIVE KNOWN POLLS FLOW ========= */
  if (isTicket && kpData[ticketId]?.awaitingIGN) {
    kpData[ticketId] = { ign: message.content.trim() };
    saveKP(kpData);

    return message.reply(
      'Your IGN has been recorded.\nYou have been **added to the Known Polls list**.'
    );
  }

  /* ========= IGNORE NON-MENTIONS OUTSIDE TICKETS ========= */
  if (!isTicket && !message.mentions.has(client.user)) return;

  const content = message.content.replace(/<@!?(\d+)>/g, '').trim();

  try {
    const decision = await classify(content);

    /* ===== SILENCE IF NOT RELEVANT ===== */
    if (!decision.should_reply) return;

    /* ---- KNOWN POLLS ---- */
    if (decision.intent === 'KNOWN_POLLS') {
      if (!isTicket) {
        return message.reply(
          `Please create a ticket at ${TICKET_CHANNEL} to proceed.`
        );
      }

      if (kpData[ticketId]) {
        return message.reply(
          'This ticket has already been processed. Only one IGN is allowed per ticket.'
        );
      }

      kpData[ticketId] = { awaitingIGN: true };
      saveKP(kpData);

      return message.reply(
        'Please provide your **Minecraft IGN** to proceed.'
      );
    }

    /* ---- FALLBACK (ONLY IF AI SAID REPLY) ---- */
    return message.reply(
      'Please clarify your request so I can assist you.'
    );

  } catch (err) {
    console.error(err);
    return message.reply('There was an issue processing your request.');
  }
});

/* ================= READY ================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
