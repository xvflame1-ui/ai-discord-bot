/******************************************************************************************
 * SM HACKERS – Discord AI Manager
 * -----------------------------------------------------------------------------
 * This bot is NOT a generic chatbot.
 * It is a rule-driven assistant with limited AI classification.
 *
 * Purpose:
 *  - Handle Known Polls (KP)
 *  - Handle Clan Registration
 *  - Answer client/toolbox questions
 *  - Behave correctly in tickets vs non-tickets
 *  - Maintain professional, neutral tone
 *
 * NEVER:
 *  - Approves anything publicly
 *  - Removes users
 *  - Argues
 *  - Spams “please clarify”
 *  - Acts friendly or casual
 *
 * ALWAYS:
 *  - Follow SM HACKERS rules
 *  - Respect ticket boundaries
 *  - Be deterministic
 ******************************************************************************************/

/* ========================================================================================
 * IMPORTS
 * ====================================================================================== */

import { Client, GatewayIntentBits, Partials } from "discord.js";
import Groq from "groq-sdk";
import fs from "fs";

/* ========================================================================================
 * ENV CHECKS
 * ====================================================================================== */

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN missing");
  process.exit(1);
}

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY missing");
  process.exit(1);
}

/* ========================================================================================
 * CLIENT SETUP
 * ====================================================================================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* ========================================================================================
 * AI CLIENT (INTENT ONLY)
 * ====================================================================================== */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* ========================================================================================
 * FILE STORAGE
 * ====================================================================================== */

const KP_FILE = "./known_polls.json";

if (!fs.existsSync(KP_FILE)) {
  fs.writeFileSync(KP_FILE, JSON.stringify({}, null, 2));
}

let knownPolls = JSON.parse(fs.readFileSync(KP_FILE));

function saveKnownPolls() {
  fs.writeFileSync(KP_FILE, JSON.stringify(knownPolls, null, 2));
}

/* ========================================================================================
 * CHANNEL CONSTANTS (SM HACKERS)
 * ====================================================================================== */

const CLIENT_CHANNELS = {
  saberproxy: "1458751684032331787",
  metroproxy: "1458751743205707779",
  lumina: "1458766462713073696",
  lumine: "1458766504765165610",
  wclient: "1458766648608555029",
  lunar: "1458769266001182721",
  horion: "1458777115582533819",
  vortex: "1458777244913897595",
  boost: "1459180134895583333"
};

/* ========================================================================================
 * STATE MEMORY (PER TICKET)
 * ====================================================================================== */

const ticketState = new Map();

/*
 ticketState[channelId] = {
   flow: "KNOWN_POLLS" | "CLAN",
   step: "WAITING_IGN" | "WAITING_CLAN_INFO",
   completed: false
 }
*/

/* ========================================================================================
 * UTILITY FUNCTIONS
 * ====================================================================================== */

function isTicketChannel(channel) {
  return channel?.name?.startsWith("ticket-");
}

function normalize(text) {
  return text.toLowerCase().trim();
}

function isGreeting(text) {
  return /^(hi|hello|hey|yo|thanks|thank you|ok|okay|cool)$/i.test(text);
}

function mentionsBot(message) {
  return message.mentions.has(client.user);
}

function reply(message, content) {
  return message.reply({ content, allowedMentions: { repliedUser: false } });
}

/* ========================================================================================
 * INTENT DETECTION (RULE FIRST)
 * ====================================================================================== */

function ruleDetectIntent(text) {
  if (/known poll|kp/i.test(text)) return "KNOWN_POLLS";
  if (/register clan|clan registration/i.test(text)) return "CLAN";
  if (/client|proxy|toolbox|saber|lumina|lunar|horion|vortex|boost/i.test(text))
    return "CLIENT";
  return "UNKNOWN";
}

/* ========================================================================================
 * AI INTENT CLASSIFIER (FALLBACK ONLY)
 * ====================================================================================== */

async function aiClassifyIntent(text) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "Classify intent for SM HACKERS. Return ONE word only:\n" +
          "GREETING\nKNOWN_POLLS\nCLAN\nCLIENT\nIRRELEVANT"
      },
      { role: "user", content: text }
    ]
  });

  return completion.choices[0].message.content.trim();
}

/* ========================================================================================
 * CLIENT HANDLER
 * ====================================================================================== */

async function handleClientQuery(message) {
  let matched = false;

  for (const [key, id] of Object.entries(CLIENT_CHANNELS)) {
    if (normalize(message.content).includes(key)) {
      await reply(message, `Please refer to <#${id}>.`);
      matched = true;
      break;
    }
  }

  if (!matched) {
    await reply(
      message,
      `Relevant channels: <#${CLIENT_CHANNELS.saberproxy}>, <#${CLIENT_CHANNELS.lumina}>.`
    );
  }
}

/* ========================================================================================
 * KNOWN POLLS FLOW
 * ====================================================================================== */

async function startKnownPollsFlow(message) {
  ticketState.set(message.channel.id, {
    flow: "KNOWN_POLLS",
    step: "WAITING_IGN",
    completed: false
  });

  await reply(message, "Please provide your Minecraft IGN.");
}

async function processKnownPollsIGN(message, state) {
  const ign = message.content.trim();

  knownPolls[message.author.id] = {
    ign,
    discordId: message.author.id,
    addedAt: new Date().toISOString()
  };

  saveKnownPolls();

  state.completed = true;
  ticketState.delete(message.channel.id);

  await reply(
    message,
    "Your IGN has been received. You have been added to the Known Polls list."
  );
}

/* ========================================================================================
 * CLAN REGISTRATION FLOW
 * ====================================================================================== */

async function startClanFlow(message) {
  ticketState.set(message.channel.id, {
    flow: "CLAN",
    step: "WAITING_CLAN_INFO",
    completed: false
  });

  await reply(
    message,
    "Please provide:\n1. Clan name\n2. Discord server invite\n3. Screenshot proof"
  );
}

async function processClanInfo(message, state) {
  state.completed = true;
  ticketState.delete(message.channel.id);

  await reply(
    message,
    "Your clan registration details have been received and forwarded for review."
  );
}

/* ========================================================================================
 * MAIN MESSAGE HANDLER
 * ====================================================================================== */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const text = message.content.trim();
  const inTicket = isTicketChannel(message.channel);

  /* ---------------- GREETINGS ---------------- */
  if (isGreeting(text)) {
    if (inTicket) {
      await reply(message, "Acknowledged.");
    }
    return;
  }

  /* ---------------- CLIENT QUESTIONS ---------------- */
  if (ruleDetectIntent(text) === "CLIENT") {
    await handleClientQuery(message);
    return;
  }

  /* ---------------- KNOWN POLLS ---------------- */
  if (ruleDetectIntent(text) === "KNOWN_POLLS") {
    if (!inTicket) {
      await reply(message, "Please create a ticket at #🎟️tickets to proceed.");
      return;
    }
    await startKnownPollsFlow(message);
    return;
  }

  /* ---------------- CLAN REG ---------------- */
  if (ruleDetectIntent(text) === "CLAN") {
    if (!inTicket) {
      await reply(message, "Please create a ticket at #🎟️tickets to register a clan.");
      return;
    }
    await startClanFlow(message);
    return;
  }

  /* ---------------- ACTIVE TICKET STATE ---------------- */
  if (inTicket && ticketState.has(message.channel.id)) {
    const state = ticketState.get(message.channel.id);

    if (state.flow === "KNOWN_POLLS" && state.step === "WAITING_IGN") {
      await processKnownPollsIGN(message, state);
      return;
    }

    if (state.flow === "CLAN") {
      await processClanInfo(message, state);
      return;
    }
  }

  /* ---------------- AI FALLBACK ---------------- */
  try {
    const aiIntent = await aiClassifyIntent(text);

    if (aiIntent === "IRRELEVANT") return;

    if (aiIntent === "KNOWN_POLLS" && !inTicket) {
      await reply(message, "Please create a ticket at #🎟️tickets to proceed.");
      return;
    }

    if (aiIntent === "CLIENT") {
      await handleClientQuery(message);
      return;
    }

  } catch {
    // silent failure – never spam
  }
});

/* ========================================================================================
 * READY
 * ====================================================================================== */

client.once("ready", () => {
  console.log(`SM HACKERS Manager online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
