import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import Groq from 'groq-sdk';

/* =======================
   ENV VALIDATION
======================= */
if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN missing');
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY missing');
  process.exit(1);
}

/* =======================
   CLIENT SETUP
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
const BOT_NAME = 'SMH Manager';
const TICKET_CHANNEL_PREFIX = 'ticket-';
const TICKET_CREATE_CHANNEL = '#🎟️tickets';

/* =======================
   CLIENT / PROXY CHANNEL IDS
======================= */
const CLIENT_CHANNELS = {
  saber: ['<#1458751684032331787>'],
  saberproxy: ['<#1458751684032331787>'],

  metro: ['<#1458751743205707779>'],
  metroproxy: ['<#1458751743205707779>'],

  lumina: ['<#1458766462713073696>'],
  luminaclient: ['<#1458766462713073696>'],

  lumine: ['<#1458766504765165610>'],
  lumineproxy: ['<#1458766504765165610>'],

  wclient: ['<#1458766648608555029>'],

  lunar: ['<#1458769266001182721>'],
  lunarproxy: ['<#1458769266001182721>'],

  horion: ['<#1458777115582533819>'],
  horizon: ['<#1458777115582533819>'],

  vortex: ['<#1458777244913897595>'],

  boost: ['<#1459180134895583333>'],

  toolbox: [
    '<#1458751684032331787>, <#1458766462713073696>'
  ]
};

/* =======================
   TICKET-ONLY REQUESTS
======================= */
const TICKET_ONLY_KEYWORDS = [
  'known poll',
  'known polls',
  'kp',
  'clan register',
  'register clan',
  'clan registration',
  'youtube role',
  'youtuber role',
  'role verification',
  'verify role'
];

/* =======================
   HELPERS
======================= */
function isTicketChannel(name) {
  return name.startsWith(TICKET_CHANNEL_PREFIX);
}

function containsKeyword(msg, list) {
  return list.some(k => msg.includes(k));
}

function detectClient(msg) {
  for (const key of Object.keys(CLIENT_CHANNELS)) {
    if (msg.includes(key)) return key;
  }
  return null;
}

/* =======================
   AI RESPONSE
======================= */
async function aiReply(prompt) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.15,
    max_tokens: 350,
    messages: [
      {
        role: 'system',
        content:
          'You are SMH Manager, the official Discord assistant for the SM HACKERS Minecraft hacking community. ' +
          'Respond professionally, neutrally, and directly. ' +
          'Do not be friendly. Do not use emojis. ' +
          'Do not invent rules. Do not acknowledge tickets unless inside a ticket channel. ' +
          'If a request requires a ticket, instruct the user to create one in #🎟️tickets.'
      },
      { role: 'user', content: prompt }
    ]
  });

  return completion.choices[0].message.content;
}

/* =======================
   MESSAGE HANDLER
======================= */
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const content = message.content
    .toLowerCase()
    .replace(/<@!?(\d+)>/g, '')
    .trim();

  const channelName = message.channel.name;

  /* ---- CLIENT / TOOLBOX HANDLING ---- */
  const clientKey = detectClient(content);
  if (clientKey) {
    const channels = CLIENT_CHANNELS[clientKey].join(', ');
    return message.reply(
      `The requested resource is available in ${channels}.`
    );
  }

  /* ---- TICKET ENFORCEMENT ---- */
  if (containsKeyword(content, TICKET_ONLY_KEYWORDS)) {
    if (!isTicketChannel(channelName)) {
      return message.reply(
        `This request must be handled through a ticket. Please create one in ${TICKET_CREATE_CHANNEL}.`
      );
    }

    return message.reply(
      'Your request has been received in this ticket. Please provide the required details for review.'
    );
  }

  /* ---- GENERAL AI ---- */
  try {
    const response = await aiReply(content);
    return message.reply(response);
  } catch (err) {
    console.error(err);
    return message.reply(
      'There was an issue processing your request.'
    );
  }
});

/* =======================
   READY
======================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
