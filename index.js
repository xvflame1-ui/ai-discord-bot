import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';
import Groq from 'groq-sdk';

/* =======================
   ENV
======================= */
if (!process.env.DISCORD_TOKEN || !process.env.GROQ_API_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

/* =======================
   CLIENT
======================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =======================
   CONSTANTS
======================= */
const TICKET_PREFIX = 'ticket-';
const TICKET_CREATE_CHANNEL = '#🎟️tickets';
const KP_STORE = './known_polls.json';

/* =======================
   CLIENT CHANNEL IDS
======================= */
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
  toolbox:
    '<#1458751684032331787>, <#1458766462713073696>'
};

/* =======================
   STORAGE
======================= */
if (!fs.existsSync(KP_STORE)) {
  fs.writeFileSync(KP_STORE, JSON.stringify({}));
}

function loadKP() {
  return JSON.parse(fs.readFileSync(KP_STORE));
}

function saveKP(data) {
  fs.writeFileSync(KP_STORE, JSON.stringify(data, null, 2));
}

/* =======================
   AI DECISION ENGINE
======================= */
async function decide(message, isTicket) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content: `
You are the decision brain of SMH Manager for the SM HACKERS Discord server.

SM HACKERS is a Minecraft hacking community (2b2t, LBSM, anarchy, clients, proxies).

Your job:
- Understand user intent
- Decide the correct action
- Output STRICT JSON ONLY

Rules:
- Known Polls, clan registration, and roles require tickets
- Only one IGN per ticket for Known Polls
- Toolbox / clients should return channels
- Never approve or deny publicly
- Never mention internal logic

Context:
- isTicket: ${isTicket}

Output format (JSON ONLY):
{
  "intent": "...",
  "action": "...",
  "reply": "...",
  "clientKey": null | "saberproxy" | "toolbox",
  "expectIGN": true | false
}
`
      },
      { role: 'user', content: message }
    ]
  });

  return JSON.parse(completion.choices[0].message.content);
}

/* =======================
   MESSAGE HANDLER
======================= */
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const isTicket = message.channel.name.startsWith(TICKET_PREFIX);
  const mentioned = message.mentions.has(client.user);

  if (!isTicket && !mentioned) return;

  const content = message.content.replace(/<@!?(\d+)>/g, '').trim();

  try {
    const decision = await decide(content, isTicket);

    /* ---- CLIENT / TOOLBOX ---- */
    if (decision.clientKey && CLIENT_CHANNELS[decision.clientKey]) {
      return message.reply(
        `The requested resource is available in ${CLIENT_CHANNELS[decision.clientKey]}.`
      );
    }

    /* ---- KNOWN POLLS ---- */
    if (decision.intent === 'KNOWN_POLLS') {
      if (!isTicket) {
        return message.reply(
          `Please create a ticket at ${TICKET_CREATE_CHANNEL} to proceed.`
        );
      }

      const kpData = loadKP();
      const ticketId = message.channel.id;

      if (kpData[ticketId]) {
        return message.reply(
          'This ticket has already been processed for Known Polls. Only one IGN can be submitted per ticket.'
        );
      }

      if (decision.expectIGN) {
        kpData[ticketId] = { awaitingIGN: true };
        saveKP(kpData);
        return message.reply(
          'Please provide your **Minecraft IGN** to proceed.'
        );
      }

      // Treat message as IGN
      kpData[ticketId] = { ign: content };
      saveKP(kpData);
      return message.reply(
        'Your IGN has been received.\nYou have been **added to the Known Polls list**.'
      );
    }

    /* ---- GENERAL ---- */
    return message.reply(decision.reply);

  } catch (err) {
    console.error(err);
    return message.reply('There was an issue processing your request.');
  }
});

/* =======================
   READY
======================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
