import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

/* =========================
   BASIC CLIENT SETUP
========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN or CLIENT_ID missing');
  process.exit(1);
}

/* =========================
   SLASH COMMAND DEFINITION
========================= */

const pollCommand = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create official SM HACKERS polls')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  .addSubcommand(sub =>
    sub
      .setName('create')
      .setDescription('Create up to 10 official polls')

      // -------- POLL 1 --------
      .addStringOption(o =>
        o.setName('question_1').setDescription('Poll question 1').setRequired(true))
      .addStringOption(o =>
        o.setName('option1_1').setDescription('Option 1 (required)').setRequired(true))
      .addStringOption(o =>
        o.setName('option2_1').setDescription('Option 2 (required)').setRequired(true))
      .addStringOption(o =>
        o.setName('option3_1').setDescription('Option 3').setRequired(false))
      .addStringOption(o =>
        o.setName('option4_1').setDescription('Option 4').setRequired(false))
      .addStringOption(o =>
        o.setName('option5_1').setDescription('Option 5').setRequired(false))
      .addStringOption(o =>
        o.setName('option6_1').setDescription('Option 6').setRequired(false))
      .addStringOption(o =>
        o.setName('option7_1').setDescription('Option 7').setRequired(false))
      .addStringOption(o =>
        o.setName('option8_1').setDescription('Option 8').setRequired(false))
      .addStringOption(o =>
        o.setName('option9_1').setDescription('Option 9').setRequired(false))
      .addStringOption(o =>
        o.setName('option10_1').setDescription('Option 10').setRequired(false))

      // -------- POLL 2 (OPTIONAL) --------
      .addStringOption(o =>
        o.setName('question_2').setDescription('Poll question 2').setRequired(false))
      .addStringOption(o =>
        o.setName('option1_2').setDescription('Option 1 (required if Q2)').setRequired(false))
      .addStringOption(o =>
        o.setName('option2_2').setDescription('Option 2 (required if Q2)').setRequired(false))
  );

const commands = [pollCommand.toJSON()];

/* =========================
   REGISTER COMMAND
========================= */

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log('Slash command registered');
  } catch (err) {
    console.error('Command registration failed', err);
  }
})();

/* =========================
   INTERACTION HANDLER
========================= */

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'poll') return;

  if (interaction.options.getSubcommand() !== 'create') return;

  try {
    const createdPolls = [];

    for (let i = 1; i <= 10; i++) {
      const question = interaction.options.getString(`question_${i}`);
      if (!question) continue;

      const options = [];

      for (let j = 1; j <= 10; j++) {
        const opt = interaction.options.getString(`option${j}_${i}`);
        if (opt) options.push({ text: opt });
      }

      if (options.length < 2) {
        await interaction.reply({
          content: `Poll ${i} must have at least 2 options.`,
          ephemeral: true,
        });
        return;
      }

      createdPolls.push({ question, options });
    }

    if (createdPolls.length === 0) {
      await interaction.reply({
        content: 'No valid polls were created.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: `Creating ${createdPolls.length} official SM HACKERS poll(s)...`,
      ephemeral: true,
    });

    for (const poll of createdPolls) {
      await interaction.channel.send({
        poll: {
          question: { text: poll.question },
          answers: poll.options,
          duration: 24,
          allowMultiselect: false,
        },
      });
    }

  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      await interaction.reply({
        content: 'There was an issue processing the request.',
        ephemeral: true,
      });
    }
  }
});

/* =========================
   READY
========================= */

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
