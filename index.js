import { Client, GatewayIntentBits } from "discord.js";
import OpenAI from "openai";

if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_API_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are the AI assistant of the SM HACKERS Discord server.

SM HACKERS is a Minecraft hacking community (2b2t, LBSM, anarchy).
You talk like ChatGPT: natural, clear, professional, human.
No scripts. No rules. Just talk.
`;

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message.content }
      ]
    });

    const reply = completion.choices[0].message.content;
    await message.reply(reply);
  } catch (e) {
    console.error("OpenAI error:", e);
  }
});

client.once("ready", () => {
  console.log(`Online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
