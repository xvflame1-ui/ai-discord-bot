/*****************************************************************************************
 * SM HACKERS – AI DISCORD MANAGER
 * ---------------------------------------------------------------------------------------
 * This bot is a professional, policy-driven assistant for the SM HACKERS Discord server.
 * It is NOT a generic chatbot.
 *
 * CORE PRINCIPLES:
 * - Deterministic rules > AI guessing
 * - AI only classifies intent, never decides outcomes
 * - Tickets are sacred: no confusion, no spam
 * - Professional, neutral tone
 * - Zero DM usage
 * - Zero random replies
 *****************************************************************************************/

import { Client, GatewayIntentBits, Partials } from "discord.js";
import Groq from "groq-sdk";
import fs from "fs-extra";
import path from "path";

/* =======================================================================================
   ENVIRONMENT
======================================================================================= */

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN missing");
  process.exit(1);
}
if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY missing");
  process.exit(1);
}

/* =======================================================================================
   CLIENT
======================================================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const groq = new Groq({ apiKey: GROQ_API_KEY });

/* =======================================================================================
   CONSTANTS – SM HACKERS KNOWLEDGE
======================================================================================= */

const TICKETS_CHANNEL_NAME = "🎟️tickets";

const CLIENT_CHANNELS = {
  saberproxy: "<#1458751684032331787>",
  metroproxy: "<#1458751743205707779>",
  luminaclient: "<#1458766462713073696>",
  lumineproxy: "<#1458766504765165610>",
  wclient: "<#1458766648608555029>",
  lunarproxy: "<#1458769266001182721>",
  horionclient: "<#1458777115582533819>",
  vortexclient: "<#1458777244913897595>",
  boostclient: "<#1459180134895583333>"
};

const GREETINGS = ["hi", "hello", "hey"];
const THANK_YOU = ["thank you", "thanks", "thx", "ty"];

const KNOWN_POLLS_FILE = path.resolve("./known_polls.json");

/* =======================================================================================
   STORAGE
======================================================================================= */

let knownPolls = {};
let ticketState = {}; // per-channel state

if (fs.existsSync(KNOWN_POLLS_FILE)) {
  knownPolls = fs.readJsonSync(KNOWN_POLLS_FILE);
} else {
  fs.writeJsonSync(KNOWN_POLLS_FILE, {});
}

/* =======================================================================================
   HELPERS
======================================================================================= */

function isTicketChannel(channel) {
  return channel.name.startsWith("ticket-");
}

function normalize(text) {
  return text.toLowerCase().trim();
}

function saveKnownPolls() {
  fs.writeJsonSync(KNOWN_POLLS_FILE, knownPolls, { spaces: 2 });
}

function firstMessageInChannel(channelId) {
  if (!ticketState[channelId]) {
    ticketState[channelId] = {
      greeted: false,
      knownPollHandled: false
    };
    return true;
  }
  return false;
}

/* =======================================================================================
   AI – INTENT CLASSIFIER ONLY
======================================================================================= */

async function classifyIntent(message) {
  const prompt = `
You are a classifier for a Discord bot.
Return ONE word only.

Possible intents:
GREETING
THANKS
KNOWN_POLLS_REQUEST
CLAN_REGISTRATION
CLIENT_TOOLBOX
IRRELEVANT

Message:
"${message}"
`;

  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    return res.choices[0].message.content.trim();
  } catch {
    return "IRRELEVANT";
  }
}

/* =======================================================================================
   MAIN MESSAGE HANDLER
======================================================================================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = normalize(message.content);
  const channel = message.channel;
  const channelId = channel.id;
  const inTicket = isTicketChannel(channel);

  /* --------------------------------------------------
     THANK YOU – ALWAYS RESPOND
  -------------------------------------------------- */
  if (THANK_YOU.some(t => content.includes(t))) {
    await channel.send("You’re welcome.");
    return;
  }

  /* --------------------------------------------------
     GREETING – ONLY ON FIRST MESSAGE
  -------------------------------------------------- */
  if (GREETINGS.includes(content)) {
    if (firstMessageInChannel(channelId)) {
      await channel.send("Hello.");
    }
    return;
  }

  /* --------------------------------------------------
     AI INTENT
  -------------------------------------------------- */
  const intent = await classifyIntent(message.content);

  /* --------------------------------------------------
     NON-TICKET ENFORCEMENT
  -------------------------------------------------- */
  if (!inTicket) {
    if (intent === "KNOWN_POLLS_REQUEST" || intent === "CLAN_REGISTRATION") {
      await channel.send(`Please create a ticket at <#${TICKETS_CHANNEL_NAME}>.`);
    }
    return;
  }

  /* --------------------------------------------------
     TICKET HANDLING
  -------------------------------------------------- */

  // Known Polls
  if (intent === "KNOWN_POLLS_REQUEST") {
    if (ticketState[channelId]?.knownPollHandled) return;

    ticketState[channelId].knownPollHandled = true;
    ticketState[channelId].awaitingIGN = true;

    await channel.send("Please provide your Minecraft IGN.");
    return;
  }

  // IGN capture
  if (ticketState[channelId]?.awaitingIGN) {
    const ign = message.content.trim();

    knownPolls[ign] = {
      userId: message.author.id,
      addedAt: new Date().toISOString()
    };
    saveKnownPolls();

    ticketState[channelId].awaitingIGN = false;

    await channel.send(
      "Your IGN has been received.\nYou have been added to the Known Polls list."
    );
    return;
  }

  // Toolbox / client lookup
  if (intent === "CLIENT_TOOLBOX") {
    const mentions = [];

    if (content.includes("saber")) mentions.push(CLIENT_CHANNELS.saberproxy);
    if (content.includes("lumina")) mentions.push(CLIENT_CHANNELS.luminaclient);

    if (mentions.length > 0) {
      await channel.send(
        `The requested resources are available in ${mentions.join(", ")}.`
      );
    }
    return;
  }

  // Clan registration
  if (intent === "CLAN_REGISTRATION") {
    await channel.send(
      "Clan registration is handled via tickets only.\n" +
      "Requirements:\n" +
      "• Minimum 6 active members\n" +
      "• Clan Discord server\n" +
      "• Screenshot proof\n" +
      "• Server invite link"
    );
    return;
  }

  // Ignore irrelevant
});

/* =======================================================================================
   READY
======================================================================================= */

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
