import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  PollLayoutType
} from "discord.js";

/* ================================
   CONFIG
================================ */
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Discord Application ID
const GUILD_ID = process.env.GUILD_ID;   // Optional (recommended for fast updates)

/* ================================
   CLIENT
================================ */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================================
   SLASH COMMAND DEFINITION
================================ */
const pollCommand = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create official SM HACKERS polls")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub
      .setName("create")
      .setDescription("Create up to 10 official polls at once")
  );

// Add repeated fields (Q1–Q10)
for (let i = 1; i <= 10; i++) {
  pollCommand.options[0]
    .addStringOption(opt =>
      opt
        .setName(`question_${i}`)
        .setDescription(`Poll question ${i}`)
        .setRequired(i === 1)
    )
    .addStringOption(opt =>
      opt
        .setName(`options_${i}`)
        .setDescription(`Options for poll ${i} (one per line, max 10)`)
        .setRequired(i === 1)
    );
}

/* ================================
   REGISTER COMMAND
================================ */
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const commands = [pollCommand.toJSON()];

  if (GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash command registered (guild).");
  } else {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("Slash command registered (global).");
  }
}

/* ================================
   READY
================================ */
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

/* ================================
   INTERACTION HANDLER
================================ */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "poll") return;

  if (interaction.options.getSubcommand() !== "create") return;

  await interaction.deferReply({ ephemeral: true });

  let created = 0;

  for (let i = 1; i <= 10; i++) {
    const question = interaction.options.getString(`question_${i}`);
    const optionsRaw = interaction.options.getString(`options_${i}`);

    if (!question || !optionsRaw) continue;

    const options = optionsRaw
      .split("\n")
      .map(o => o.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (options.length < 2) continue;

    await interaction.channel.send({
      poll: {
        question: { text: question },
        answers: options.map(opt => ({ text: opt })),
        allowMultiselect: false,
        layoutType: PollLayoutType.Default,
        duration: 24 * 60 * 60 // 24 hours
      }
    });

    created++;
  }

  if (created === 0) {
    await interaction.editReply(
      "No valid polls were created. Ensure each poll has a question and at least two options."
    );
    return;
  }

  await interaction.editReply(
    `Successfully created ${created} official poll${created > 1 ? "s" : ""}.`
  );
});

/* ================================
   LOGIN
================================ */
client.login(TOKEN);
