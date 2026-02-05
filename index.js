import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  PollLayoutType
} from "discord.js";

/* =====================
   ENV
===================== */
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

/* =====================
   CLIENT
===================== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =====================
   COMMAND
===================== */
const pollCommand = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create official SM HACKERS polls")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub
      .setName("create")
      .setDescription("Create up to 5 polls (2 options each)")

      // REQUIRED FIRST POLL
      .addStringOption(o => o.setName("q1").setDescription("Question 1").setRequired(true))
      .addStringOption(o => o.setName("q1a").setDescription("Option A (Q1)").setRequired(true))
      .addStringOption(o => o.setName("q1b").setDescription("Option B (Q1)").setRequired(true))

      // OPTIONAL POLLS (ALL OPTIONAL AFTER THIS POINT)
      .addStringOption(o => o.setName("q2").setDescription("Question 2").setRequired(false))
      .addStringOption(o => o.setName("q2a").setDescription("Option A (Q2)").setRequired(false))
      .addStringOption(o => o.setName("q2b").setDescription("Option B (Q2)").setRequired(false))

      .addStringOption(o => o.setName("q3").setDescription("Question 3").setRequired(false))
      .addStringOption(o => o.setName("q3a").setDescription("Option A (Q3)").setRequired(false))
      .addStringOption(o => o.setName("q3b").setDescription("Option B (Q3)").setRequired(false))

      .addStringOption(o => o.setName("q4").setDescription("Question 4").setRequired(false))
      .addStringOption(o => o.setName("q4a").setDescription("Option A (Q4)").setRequired(false))
      .addStringOption(o => o.setName("q4b").setDescription("Option B (Q4)").setRequired(false))

      .addStringOption(o => o.setName("q5").setDescription("Question 5").setRequired(false))
      .addStringOption(o => o.setName("q5a").setDescription("Option A (Q5)").setRequired(false))
      .addStringOption(o => o.setName("q5b").setDescription("Option B (Q5)").setRequired(false))
  );

/* =====================
   REGISTER
===================== */
const rest = new REST({ version: "10" }).setToken(TOKEN);

await rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: [pollCommand.toJSON()] }
);

/* =====================
   EVENTS
===================== */
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "poll") return;

  const polls = [];

  for (let i = 1; i <= 5; i++) {
    const q = interaction.options.getString(`q${i}`);
    const a = interaction.options.getString(`q${i}a`);
    const b = interaction.options.getString(`q${i}b`);

    if (q && a && b) {
      polls.push({ q, options: [a, b] });
    }
  }

  if (!polls.length) {
    await interaction.reply({ content: "No valid polls provided.", ephemeral: true });
    return;
  }

  for (const poll of polls) {
    await interaction.channel.send({
      poll: {
        question: { text: poll.q },
        answers: poll.options.map(o => ({ text: o })),
        allowMultiselect: false,
        layoutType: PollLayoutType.Default
      }
    });
  }

  await interaction.reply({
    content: `Created ${polls.length} poll(s).`,
    ephemeral: true
  });
});

/* =====================
   START
===================== */
client.login(TOKEN);
