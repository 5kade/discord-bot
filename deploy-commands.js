const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a recurring reminder in this channel')
    .addStringOption(opt =>
      opt.setName('word')
        .setDescription('Word or phrase to remind')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('minutes')
        .setDescription('Repeat interval in minutes'))
    .addIntegerOption(opt =>
      opt.setName('hours')
        .setDescription('Repeat interval in hours'))
    .addIntegerOption(opt =>
      opt.setName('days')
        .setDescription('Repeat interval in days')),

  new SlashCommandBuilder()
    .setName('stopremind')
    .setDescription('Stop all reminders in this channel'),

  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the voice channel you are currently in'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display avatar and banner of a user')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Select a user')
        .setRequired(false))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('All commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();
