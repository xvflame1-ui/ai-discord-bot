import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';
import Groq from 'groq-sdk';

/* ================= ENV ================= */
if (!process.env.DISCORD_TOKEN || !process.env.GROQ_API_KEY) {
  console.error('Missing env vars');
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

/* ================= CLIENT CHANNELS ================= */
const CLIENT_CHANNELS = {
  saber: '<#1458751684032331787>',
  metro: '<#1458751743205707779>',
  lumina: '<#1458766462713073696>',
  lumine: '<#1458766504765165610>',
  wclient: '<#1458766648608555029>',
  lunar: '<#1458769266001182721>',
  horizon: '<#1458777115582533819>',
  vortex: '<#1458777244913897595>',
  boost: '<#1459180134895583333>',
  toolbox: '<#1458751684032331787>, <#1458766462713073696>'
};

/* ================= STORAGE ================= */
if (!fs.existsSync(KP_FILE)) fs.writeFileSync(KP_FILE, JSON.stringify({}));

const kpData = JSON.parse(fs.readFileSync(KP_FILE));
const ticketState = new Map();

/* ================= HELPERS ================= */
const isTicket = (c) => c.name.startsWith(TICKET_PREFIX);

const normalize = (t) =>
  t.toLowerCase().replace(/<@!?(\d+)>/g, '').trim();

const isGreeting = (t) => ['hi', 'hello', 'hey'].includes(t);
const isThanks = (t) =>
  t.includes('thank') || t === 'thanks' || t === 'ty';

/* ================= AI (LANGUAGE BOSS) ================= */
async function aiReply(context) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You are SMH Manager, a professional Discord staff assistant for SM HACKERS. ' +
          'Keep replies neutral, calm, and concise. Do not approve or deny requests.'
      },
      { role: 'user', content: context }
    ]
  });

  return res.choices[0].message.content.trim();
}

/* ================= AI INTENT ================= */
async function classify(text) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'Classify intent for SM HACKERS. Return ONLY one:\n' +
          'KNOWN_POLLS\nCLIENT\nCLAN\nROLE_YOUTUBE\nIRRELEVANT'
      },
      { role: 'user', content: text }
    ]
  });

  return res.choices[0].message.content.trim();
}

/* ================= HANDLER ================= */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const content = normalize(message.content);
  const inTicket = isTicket(message.channel);
  const mentioned = message.mentions.has(client.user);
  const channelId = message.channel.id;

  if (!inTicket && !mentioned) return;

  /* THANK YOU */
  if (isThanks(content)) {
    return message.reply('You’re welcome.');
  }

  /* GREETING – FIRST ONLY */
  if (isGreeting(content)) {
    if (!ticketState.has(channelId)) {
      ticketState.set(channelId, { greeted: true });
      return message.reply('Hi.');
    }
    return;
  }

  /* ACTIVE KP FLOW */
  if (inTicket && ticketState.get(channelId)?.awaitingIGN) {
    kpData[channelId] = { ign: content };
    fs.writeFileSync(KP_FILE, JSON.stringify(kpData, null, 2));
    ticketState.set(channelId, { kpDone: true });

    return message.reply(
      'Your IGN has been received.\nYou have been **added to the Known Polls list**.'
    );
  }

  const intent = await classify(content);

  /* CLIENT / TOOLBOX */
  if (intent === 'CLIENT') {
    for (const key of Object.keys(CLIENT_CHANNELS)) {
      if (content.includes(key)) {
        return message.reply(
          `The requested resource is available in ${CLIENT_CHANNELS[key]}.`
        );
      }
    }
    return message.reply(`Relevant channels: ${CLIENT_CHANNELS.toolbox}.`);
  }

  /* KNOWN POLLS */
  if (intent === 'KNOWN_POLLS') {
    if (!inTicket) {
      return message.reply(
        `Please create a ticket at ${TICKET_CHANNEL} to proceed.`
      );
    }
    if (ticketState.get(channelId)?.kpDone) return;

    ticketState.set(channelId, { awaitingIGN: true });
    return message.reply(
      'Please provide your **Minecraft IGN** to proceed.'
    );
  }

  /* YOUTUBE ROLE */
  if (intent === 'ROLE_YOUTUBE') {
    if (!inTicket) {
      return message.reply(
        `Role applications must be submitted via a ticket. Please create one at ${TICKET_CHANNEL}.`
      );
    }

    if (ticketState.get(channelId)?.ytSubmitted) return;

    ticketState.set(channelId, { ytSubmitted: true });

    const response = await aiReply(
      'User is applying for YouTube role. Ask for channel link, subscriber count, and proof.'
    );

    return message.reply(response);
  }

  /* CLAN / OTHER ROLES */
  if (intent === 'CLAN') {
    if (!inTicket) {
      return message.reply(
        `Please create a ticket at ${TICKET_CHANNEL} to proceed.`
      );
    }

    const response = await aiReply(
      'User is asking about clan registration. Explain requirements and that approval is handled by staff.'
    );

    return message.reply(response);
  }

  /* IRRELEVANT → SILENCE */
});

/* ================= READY ================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
