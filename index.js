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

const BOT_NAME = 'SMH Manager';
const TICKET_CHANNEL_PREFIX = 'ticket-';
const TICKET_CREATE_CHANNEL = '#🎟️tickets';

/* =======================
   TOOLBOX / CLIENT CHANNELS
======================= */
const TOOLBOX_MAP = {
  toolbox: ['#saber-proxy', '#lumina-client'],
  saber: ['#saber-proxy'],
  saberproxy: ['#saber-proxy'],
  lumina: ['#lumina-client'],
  metro: ['#metro-proxy'],
  horion: ['#horion-client'],
  lunar: ['#lunar-proxy'],
  vortex: ['#vortex-client'],
  boost: ['#boost-client'],
  'w-client': ['#w-client']
};

/* =======================
   TICKET-ONLY TOPICS
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

function detectToolbox(msg) {
  for (const key of Object.keys(TOOLBOX_MAP)) {
    if (msg.includes(key)) return key;
  }
  return null;
}

/* =======================
   AI RESPONSE (FIXED MODEL)
======================= */
async function aiReply(prompt) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.15,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content:
          'You are SMH Manager, a professional Discord assistant for the SM HACKERS Minecraft hacking community. ' +
          'Use professional, neutral English. No emojis. No friendliness. No assumptions. ' +
          'Never invent rules. Never acknowledge tickets unless in ticket channels.'
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

  /* ---- TOOLBOX HANDLING ---- */
  const toolboxKey = detectToolbox(content);
  if (toolboxKey) {
    const channels = TOOLBOX_MAP[toolboxKey].join(', ');
    return message.reply(
      `The requested resource is available in ${channels}.`
    );
  }

  /* ---- TICKET-ONLY ENFORCEMENT ---- */
  if (containsKeyword(content, TICKET_ONLY_KEYWORDS)) {
    if (!isTicketChannel(channelName)) {
      return message.reply(
        `Please create a ticket in ${TICKET_CREATE_CHANNEL} to proceed with this request.`
      );
    }

    return message.reply(
      'Your request has been received in this ticket. Please provide all required details for review.'
    );
  }

  /* ---- GENERAL AI RESPONSE ---- */
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
