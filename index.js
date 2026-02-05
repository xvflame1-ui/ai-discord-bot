import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';
import Groq from 'groq-sdk';

/* ================= ENV ================= */
if (!process.env.DISCORD_TOKEN || !process.env.GROQ_API_KEY) {
  console.error('Missing DISCORD_TOKEN or GROQ_API_KEY');
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
const TICKET_CREATE_CHANNEL = '#🎟️tickets';
const KP_FILE = './known_polls.json';

/* ================= CLIENT CHANNELS ================= */
const CLIENT_CHANNELS = {
  saberproxy: '<#1458751684032331787>',
  metroproxy: '<#1458751743205707779>',
  luminaclient: '<#1458766462713073696>',
  lumineproxy: '<#1458766504765165610>',
  wclient: '<#1458766648608555029>',
  lunarproxy: '<#1458769266001182721>',
  horizonclient: '<#1458777115582533819>',
  vortexclient: '<#1458777244913897595>',
  boostclient: '<#1459180134895583333>',
  toolbox: '<#1458751684032331787>, <#1458766462713073696>'
};

/* ================= STORAGE ================= */
if (!fs.existsSync(KP_FILE)) {
  fs.writeFileSync(KP_FILE, JSON.stringify({}));
}

function loadKP() {
  return JSON.parse(fs.readFileSync(KP_FILE, 'utf8'));
}

function saveKP(data) {
  fs.writeFileSync(KP_FILE, JSON.stringify(data, null, 2));
}

/* ================= SYSTEM PROMPT ================= */
const SYSTEM_PROMPT = `
You are SMH Manager, the official AI community manager of the SM HACKERS Discord server.

SM HACKERS is a Minecraft hacking community focused on anarchy servers such as 2b2t and LBSM.
Members are experienced users of hacked clients, proxies, PvP metas, exploits, and clans.

Tone rules:
- Professional
- Neutral
- Calm
- Direct
- Never playful
- Never verbose without reason

Behavior rules:
- Silence is valid and often preferred
- Do not behave like tech support
- Do not ask for logs, versions, or troubleshooting steps
- Never debate or argue
- Never reveal internal logic or staff decisions

Ticket rules:
- Ticket channels start with "ticket-"
- Inside tickets, you may reply automatically
- Outside tickets, reply only when mentioned

Known Polls:
- Ticket-only
- Ask ONLY for Minecraft IGN
- One IGN per ticket
- After IGN, confirm addition
- No vote discussion or outcome explanation

Clients / Toolbox:
- If asked, immediately provide correct channel mentions
- No follow-up questions

Social handling:
- Greetings → short acknowledgement
- Thanks → short acknowledgement
- Confirmations / filler → ignore

You must return JSON ONLY in this format:

{
  "should_reply": true | false,
  "intent": "GREETING" | "THANKS" | "KNOWN_POLLS" | "CLIENT_INFO" | "IGNORE",
  "clientKey": null | string
}
`;

/* ================= AI DECISION ================= */
async function decideIntent(content, isTicket) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    max_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Message: "${content}" | isTicket: ${isTicket}`
      }
    ]
  });

  return JSON.parse(res.choices[0].message.content);
}

/* ================= MESSAGE HANDLER ================= */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const isTicket = message.channel.name.startsWith(TICKET_PREFIX);
  const mentioned = message.mentions.has(client.user);

  if (!isTicket && !mentioned) return;

  const content = message.content.replace(/<@!?(\d+)>/g, '').trim();
  const kpData = loadKP();
  const ticketId = message.channel.id;

  /* ===== ACTIVE KP STATE ===== */
  if (isTicket && kpData[ticketId]?.awaitingIGN) {
    kpData[ticketId] = { ign: content };
    saveKP(kpData);
    return message.reply(
      'Your IGN has been received.\nYou have been **added to the Known Polls list**.'
    );
  }

  try {
    const decision = await decideIntent(content, isTicket);

    if (!decision.should_reply) return;

    /* ---- GREETING ---- */
    if (decision.intent === 'GREETING') {
      return message.reply('Hello. How can I assist?');
    }

    /* ---- THANKS ---- */
    if (decision.intent === 'THANKS') {
      return message.reply('You’re welcome.');
    }

    /* ---- CLIENT INFO ---- */
    if (decision.intent === 'CLIENT_INFO' && decision.clientKey) {
      const channel = CLIENT_CHANNELS[decision.clientKey];
      if (channel) {
        return message.reply(`The requested resource is available in ${channel}.`);
      }
    }

    /* ---- KNOWN POLLS ---- */
    if (decision.intent === 'KNOWN_POLLS') {
      if (!isTicket) {
        return message.reply(
          `Please create a ticket at ${TICKET_CREATE_CHANNEL} to proceed.`
        );
      }

      if (kpData[ticketId]) {
        return message.reply(
          'This ticket has already been processed for Known Polls. Only one IGN can be submitted per ticket.'
        );
      }

      kpData[ticketId] = { awaitingIGN: true };
      saveKP(kpData);
      return message.reply('Please provide your **Minecraft IGN** to proceed.');
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= READY ================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
