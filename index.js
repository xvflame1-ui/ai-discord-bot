import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';
import Groq from 'groq-sdk';

/* =========================================================
   ENV VALIDATION
========================================================= */
if (!process.env.DISCORD_TOKEN || !process.env.GROQ_API_KEY) {
  console.error('Missing DISCORD_TOKEN or GROQ_API_KEY');
  process.exit(1);
}

/* =========================================================
   DISCORD CLIENT
========================================================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =========================================================
   CONSTANTS & CONFIG
========================================================= */
const TICKET_PREFIX = 'ticket-';
const TICKET_CREATE_CHANNEL = '#🎟️tickets';
const KP_STORE = './known_polls.json';

/* =========================================================
   SM HACKERS CLIENT / PROXY CHANNELS (IDs)
========================================================= */
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

/* =========================================================
   STORAGE (Known Polls)
========================================================= */
if (!fs.existsSync(KP_STORE)) {
  fs.writeFileSync(KP_STORE, JSON.stringify({}));
}

function loadKP() {
  return JSON.parse(fs.readFileSync(KP_STORE, 'utf8'));
}

function saveKP(data) {
  fs.writeFileSync(KP_STORE, JSON.stringify(data, null, 2));
}

/* =========================================================
   MASSIVE SYSTEM PROMPT (GROUNDING)
========================================================= */
const SYSTEM_PROMPT = `
You are **SMH Manager**, the official automated community manager of the **SM HACKERS** Discord server.

SM HACKERS CONTEXT:
- SM HACKERS is a Minecraft hacking community.
- Focused on anarchy servers such as **2b2t**, **LBSM**, and similar environments.
- Members are hackers, developers, exploit users, PvP players, and clan members.
- The server hosts:
  - Client releases
  - Proxy tools
  - Tournaments
  - Giveaways
  - Known Polls
  - Clan registrations
  - Role verifications

YOUR ROLE:
- Act like a senior, professional staff member.
- Be neutral, calm, and direct.
- Do NOT be friendly, casual, or playful.
- Do NOT sound like a chatbot.
- Short, precise replies are preferred.

GLOBAL RULES:
- Never DM users.
- Never argue.
- Never speculate.
- Never reveal internal staff logic.
- Never approve or reject publicly.
- Silence is acceptable when no response is required.

CHANNEL CONTEXT:
- Ticket channels start with "ticket-".
- Inside tickets, you may respond automatically.
- Outside tickets, respond ONLY when mentioned.

KNOWN POLLS (KP):
- Known Polls requests are **ticket-only**.
- Inside a ticket:
  - Ask ONLY for the user's Minecraft IGN.
  - After IGN is provided, confirm they are added.
  - Only ONE IGN per ticket.
- Do NOT ask for server, clan, or proof.
- Do NOT discuss votes, popularity, or outcomes.

CLIENTS / TOOLBOX:
- If user asks for toolbox, clients, or proxies:
  - Direct them to the correct channels.
  - Use channel mentions.
  - Do NOT ask follow-up questions.

GREETINGS & THANKS:
- Greetings → brief acknowledgement.
- Thanks → brief acknowledgement.
- Confirmations ("ok", "cool") → silence.

OUTPUT FORMAT:
You MUST return JSON ONLY.

{
  "should_reply": true | false,
  "intent": "GREETING" | "THANKS" | "KNOWN_POLLS" | "CLIENT_INFO" | "IGNORE",
  "clientKey": null | string,
  "expectIGN": true | false,
  "reply": string | null
}
`;

/* =========================================================
   AI DECISION FUNCTION
========================================================= */
async function decide(content, isTicket) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    max_tokens: 500,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `
Message: "${content}"
Context:
- isTicket: ${isTicket}
`
      }
    ]
  });

  return JSON.parse(completion.choices[0].message.content);
}

/* =========================================================
   MESSAGE HANDLER
========================================================= */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const isTicket = message.channel.name.startsWith(TICKET_PREFIX);
  const mentioned = message.mentions.has(client.user);

  if (!isTicket && !mentioned) return;

  const content = message.content.replace(/<@!?(\d+)>/g, '').trim();
  const kpData = loadKP();
  const ticketId = message.channel.id;

  /* ===== ACTIVE KP FLOW ===== */
  if (isTicket && kpData[ticketId]?.awaitingIGN) {
    kpData[ticketId] = { ign: content };
    saveKP(kpData);

    return message.reply(
      'Your IGN has been received.\nYou have been **added to the Known Polls list**.'
    );
  }

  try {
    const decision = await decide(content, isTicket);

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

      if (kpData[ticketId]) {
        return message.reply(
          'This ticket has already been processed for Known Polls. Only one IGN can be submitted per ticket.'
        );
      }

      kpData[ticketId] = { awaitingIGN: true };
      saveKP(kpData);

      return message.reply(
        'Please provide your **Minecraft IGN** to proceed.'
      );
    }

    /* ---- CUSTOM AI REPLY ---- */
    if (decision.reply) {
      return message.reply(decision.reply);
    }

  } catch (err) {
    console.error(err);
    return message.reply('There was an issue processing your request.');
  }
});

/* =========================================================
   READY
========================================================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
