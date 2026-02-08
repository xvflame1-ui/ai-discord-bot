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
const KP_FILE = './known_polls.json';

/* ================= CHANNEL DATA ================= */
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
if (!fs.existsSync(KP_FILE)) fs.writeFileSync(KP_FILE, JSON.stringify({}));
const kpData = JSON.parse(fs.readFileSync(KP_FILE));

const ticketState = new Map();

/* ================= HELPERS ================= */
const isTicket = (c) => c.name.startsWith(TICKET_PREFIX);
const normalize = (t) =>
  t.replace(/<@!?(\d+)>/g, '').trim();

/* ================= SYSTEM PROMPT ================= */
function buildSystemPrompt(context) {
  return `
You are the official AI community manager of **SM HACKERS**.

SM HACKERS is a Minecraft hacking community (2b2t, LBSM, anarchy servers).
Members are experienced. Do not act like tech support.

TONE:
- Professional
- Neutral
- Direct
- Calm

GLOBAL RULES:
- Never DM users
- Never approve or deny applications
- Never discuss votes or internal reviews
- Do not argue
- Do not overexplain

KNOWN POLLS:
- Ticket-only
- Ask ONLY for Minecraft IGN
- One IGN per ticket
- After IGN: confirm added

YOUTUBE ROLE:
- Ticket-only
- Requirements:
  - 100+ subscribers
  - Channel link
  - Proof of ownership
- Do NOT assign roles

CLIENT / TOOLBOX:
Use these channels when relevant:
${Object.entries(CLIENT_CHANNELS)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}

CONTEXT:
- isTicket: ${context.isTicket}
- kpDone: ${context.kpDone || false}
- awaitingIGN: ${context.awaitingIGN || false}

DECISION:
- If reply is appropriate → respond professionally
- If not → respond with EXACTLY "__IGNORE__"
`;
}

/* ================= AI CALL ================= */
async function aiRespond(message, context) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.4,
    messages: [
      { role: 'system', content: buildSystemPrompt(context) },
      { role: 'user', content: message }
    ]
  });

  return res.choices[0].message.content.trim();
}

/* ================= HANDLER ================= */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const inTicket = isTicket(message.channel);
  const mentioned = message.mentions.has(client.user);

  // HARD GATE
  if (!inTicket && !mentioned) return;

  const channelId = message.channel.id;
  const content = normalize(message.content);

  const state = ticketState.get(channelId) || {};

  // Handle IGN capture (code-level)
  if (inTicket && state.awaitingIGN) {
    kpData[channelId] = { ign: content };
    fs.writeFileSync(KP_FILE, JSON.stringify(kpData, null, 2));
    ticketState.set(channelId, { kpDone: true });

    return message.reply(
      'Your IGN has been received.\nYou have been **added to the Known Polls list**.'
    );
  }

  const aiReply = await aiRespond(content, {
    isTicket: inTicket,
    kpDone: state.kpDone,
    awaitingIGN: state.awaitingIGN
  });

  if (aiReply === '__IGNORE__') return;

  // Detect KP trigger from AI reply intent
  if (aiReply.includes('__ASK_IGN__')) {
    ticketState.set(channelId, { awaitingIGN: true });
    return message.reply('Please provide your **Minecraft IGN** to proceed.');
  }

  return message.reply(aiReply);
});

/* ================= READY ================= */
client.once('ready', () => {
  console.log(`SM HACKERS AI Manager online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
