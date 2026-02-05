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
   ENV
================================ */
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

/* ================================
   CLIENT
================================ */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================================
   SLASH COMMAND
================================ */
const pollCommand = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create official SM HACKERS polls")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName("create").setDescription("Create up to 10 polls (2 options each)")
  );

for (let i = 1; i <= 10; i++) {
  pollCommand.options[0]
    .addStringOption(o =>
      o.setName(`question_${i}`).setDescription(`Question ${i}`).setRequired(i === 1)
    )
    .addStringOption(o =>
      o.setName(`option1_${i}`).setDescription(`Option A for Q${i}`).setRequired(i === 1)
    )
    .addStringOption(o =>
      o.setName(`option2_${i}`).setDescription(`Option B for Q${i}`).setRequired(i === 1)
    );
}

/* ================================
   REGISTER COMMAND
================================ */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const body = [pollCommand.toJSON()];
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body });
  console.log("Poll command registered.");
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
    const opt1 = interaction.options.getString(`option1_${i}`);
    const opt2 = interaction.options.getString(`option2_${i}`);

    if (!question || !opt1 || !opt2) continue;

    await interaction.channel.send({
      poll: {
        question: { text: question },
        answers: [
          { text: opt1 },
          { text: opt2 }
        ],
        allowMultiselect: false,
        layoutType: PollLayoutType.Default,
        duration: 24 * 60 * 60
      }
    });

    created++;
  }

  await interaction.editReply(
    created
      ? `Created ${created} official poll(s).`
      : "No valid polls were created."
  );
});

/* ================================
   LOGIN
================================ */
client.login(TOKEN);
