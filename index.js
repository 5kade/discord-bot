const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs-extra');
require('dotenv').config();

const REMIND_FILE = './reminders.json';
const reminders = fs.pathExistsSync(REMIND_FILE) ? fs.readJsonSync(REMIND_FILE) : [];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

function saveReminders() {
  fs.writeJsonSync(REMIND_FILE, reminders, { spaces: 2 });
}

function scheduleReminder(rem) {
  if (rem._timer) clearInterval(rem._timer);
  rem._timer = setInterval(async () => {
    try {
      const channel = await client.channels.fetch(rem.channelId);
      if (channel) channel.send(rem.word).catch(() => {});
    } catch {}
  }, rem.intervalMinutes * 60 * 1000);
}

function stopAllReminders(channelId) {
  // stop and remove reminders from this channel
  for (let i = reminders.length - 1; i >= 0; i--) {
    const r = reminders[i];
    if (r._timer) clearInterval(r._timer);
    if (r.channelId === channelId) reminders.splice(i, 1);
  }

  // brute-force cleanup of any hidden intervals (safety)
  for (let i = 1; i < 99999; i++) clearInterval(i);

  saveReminders();
}

client.once(Events.ClientReady, () => {
  for (const r of reminders) scheduleReminder(r);
  console.log(`Ready as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // /remind
  if (interaction.commandName === 'remind') {
    const word = interaction.options.getString('word', true);
    const minutes = interaction.options.getInteger('minutes') || 0;
    const hours = interaction.options.getInteger('hours') || 0;
    const days = interaction.options.getInteger('days') || 0;

    const totalMinutes = minutes + (hours * 60) + (days * 24 * 60);

    if (totalMinutes < 1)
      return interaction.reply({ content: 'Time must be at least 1 minute.' });

    const rem = {
      id: Date.now().toString(),
      channelId: interaction.channelId,
      word,
      intervalMinutes: totalMinutes
    };

    reminders.push(rem);
    saveReminders();
    scheduleReminder(rem);

    return interaction.reply({
      content: `Reminder set: **${word}** every **${days}d ${hours}h ${minutes}m**.`
    });
  }

  // /stopremind
  if (interaction.commandName === 'stopremind') {
    const before = reminders.length;

    // stop and remove all reminders for this channel
    for (let i = reminders.length - 1; i >= 0; i--) {
      const r = reminders[i];
      if (r.channelId === interaction.channelId) {
        if (r._timer) clearInterval(r._timer);
        reminders.splice(i, 1);
      }
    }

    // brute-force kill any leftover intervals
    for (let i = 1; i < 99999; i++) clearInterval(i);

    saveReminders();

    const removed = before - reminders.length;
    return interaction.reply({
      content: removed
        ? `Stopped **${removed}** reminder(s) in this channel and cleared all background timers.`
        : `No active reminders found in this channel.`
    });
  }

  // /join
  if (interaction.commandName === 'join') {
    const channel = interaction.member.voice.channel;
    if (!channel)
      return interaction.reply({ content: 'Join a voice channel first.' });

    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    return interaction.reply({
      content: `Joined voice channel: **${channel.name}**.`
    });
  }

  // /userinfo
  if (interaction.commandName === 'userinfo') {
    let user = interaction.options.getUser('user') || interaction.user;
    let member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const banner = await user
      .fetch(true)
      .then(u => u.bannerURL({ size: 1024 }))
      .catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Info`)
      .setThumbnail(user.displayAvatarURL({ size: 1024 }))
      .setColor(0x2b2d31)
      .addFields(
        { name: 'User ID', value: user.id, inline: false },
        {
          name: 'Joined Server',
          value: member
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : 'Unknown',
          inline: false
        }
      )
      .setImage(banner)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

process.on('SIGINT', () => {
  for (const r of reminders) if (r._timer) clearInterval(r._timer);
  process.exit();
});

client.login(process.env.DISCORD_TOKEN);
