import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import Groq from 'groq-sdk';

/* ---------------- CONFIG ---------------- */

const BOT_NAME = 'SMH Manager';
const TICKETS_CHANNEL_NAME = 'tickets';
const TICKET_PREFIX = 'ticket';

const CLIENT_CHANNELS = {
  saberproxy: '<#1458751684032331787>',
  metroproxy: '<#1458751743205707779>',
  luminaclient: '<#1458766462713073696>',
  lumineproxy: '<#1458766504765165610>',
  wclient: '<#1458766648608555029>',
  lunarproxy: '<#1458769266001182721>',
  horizonclient: '<#1458777115582533819>',
  vortexclient: '<#1458777244913897595>',
  boostclient: '<#1459180134895583333>'
};

/* ---------------- CLIENTS ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ---------------- HELPERS ---------------- */

function isTicketChannel(channel) {
  return channel.name.startsWith(TICKET_PREFIX);
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
}

/* ---------------- AI CLASSIFIER ---------------- */

async function classifyMessage(content) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `
You are SMH Manager, the official assistant for the SM HACKERS Discord (Minecraft hacking community).

Your job:
Decide whether the bot should reply and what the intent is.

Rules:
- Be strict.
- Do NOT ask follow-up questions.
- Greetings and thanks get short neutral replies.
- Random chat, confirmations, filler → no reply.
- Requests for Known Polls, roles, clan registration → tickets only.
- Toolbox / clients → reply with channel locations.

Intents:
GREETING
THANKS
KNOWN_POLLS
CLIENT_INFO
OTHER

Respond ONLY in JSON:
{
  "should_reply": true | false,
  "intent": "GREETING" | "THANKS" | "KNOWN_POLLS" | "CLIENT_INFO" | "OTHER"
}
        `
      },
      { role: 'user', content }
    ]
  });

  return JSON.parse(completion.choices[0].message.content);
}

/* ---------------- BOT LOGIC ---------------- */

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.guild === null) return;

  const content = message.content;
  const lower = normalize(content);
  const mentioned = message.mentions.has(client.user);
  const ticket = isTicketChannel(message.channel);

  // Outside tickets → only respond if mentioned
  if (!ticket && !mentioned) return;

  try {
    const decision = await classifyMessage(content);

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
    if (decision.intent === 'CLIENT_INFO') {
      for (const key in CLIENT_CHANNELS) {
        if (lower.includes(key.replace('client', '').replace('proxy', ''))) {
          return message.reply(
            `The requested resource is available in ${CLIENT_CHANNELS[key]}.`
          );
        }
      }

      return message.reply(
        `Available client channels:\n` +
        Object.values(CLIENT_CHANNELS).join(', ')
      );
    }

    /* ---- KNOWN POLLS ---- */
    if (decision.intent === 'KNOWN_POLLS') {
      if (!ticket) {
        return message.reply(
          'Requests for Known Polls must be submitted via a ticket. Please create one in <#🎟️tickets>.'
        );
      }

      // Ticket logic
      if (/^[a-zA-Z0-9_]{3,16}$/.test(content.trim())) {
        return message.reply(
          'Your IGN has been received. You have been added to the Known Polls list.'
        );
      }

      return message.reply(
        'Please provide your Minecraft IGN to proceed.'
      );
    }

    /* ---- FALLBACK ---- */
    if (decision.intent === 'OTHER') {
      return; // silence by design
    }

  } catch (err) {
    console.error(err);
  }
});

/* ---------------- READY ---------------- */

client.once('ready', () => {
  console.log(`Logged in as ${BOT_NAME}`);
});

client.login(process.env.DISCORD_TOKEN);
