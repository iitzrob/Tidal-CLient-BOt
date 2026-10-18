require('dotenv').config();
const {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, ChannelType,
} = require('discord.js');

const STAFF_ROLE = '1559179348303552533';
const WELCOME_CHANNEL = '1559531843131412551';
const BLUE = 0x0077be; // ocean blue

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,    // welcome (turn on in dev portal)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,  // quick answer (turn on in dev portal)
  ],
});

// ---------- helpers ----------
const today = () => new Date().toLocaleDateString('en-US'); // 9/1/2021

const embed = (extra = '') =>
  new EmbedBuilder()
    .setColor(BLUE)
    .setFooter({ text: `Tidal Client - ${today()}${extra}` });

const isStaff = (m) => m.roles.cache.has(STAFF_ROLE);
const isTicket = (ch) => ch.topic && ch.topic.startsWith('ticket:');

const TYPES = {
  general: { label: 'General Help', emoji: '🎫', prefix: 'help' },
  bug: { label: 'Report A Bug', emoji: '🐛', prefix: 'bug' },
  famous: { label: 'Famous Application', emoji: '⭐', prefix: 'famous' },
};

// ---------- commands ----------
const commands = [
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('ticket stuff')
    .addSubcommand((s) => s.setName('panel').setDescription('send ticket panel'))
    .addSubcommand((s) =>
      s.setName('rename').setDescription('rename the ticket')
        .addStringOption((o) => o.setName('name').setDescription('new name').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('add').setDescription('add a user to the ticket')
        .addUserOption((o) => o.setName('user').setDescription('who to add').setRequired(true))),
  new SlashCommandBuilder().setName('help').setDescription('need help?'),
  new SlashCommandBuilder().setName('download').setDescription('get the client'),
  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('send an embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('title').setDescription('title').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('description').setRequired(true)),
].map((c) => c.toJSON());

client.once('clientReady', async () => {
  if (process.env.GUILD_ID) {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.commands.set(commands);
  } else {
    await client.application.commands.set(commands);
  }
  client.user.setActivity('Tidal Client');
  console.log(`Tidal Bot online as ${client.user.tag}`);
});

// ---------- interactions ----------
const helpCd = new Map();

client.on('interactionCreate', async (i) => {
  try {
    if (i.isChatInputCommand()) return await onCommand(i);
    if (i.isButton()) return await onButton(i);
  } catch (err) {
    console.error(err);
    const msg = { content: 'something went wrong', ephemeral: true };
    if (i.replied || i.deferred) i.followUp(msg).catch(() => {});
    else i.reply(msg).catch(() => {});
  }
});

async function onCommand(i) {
  // /help (10s cooldown)
  if (i.commandName === 'help') {
    const last = helpCd.get(i.user.id) || 0;
    const left = 10000 - (Date.now() - last);
    if (left > 0)
      return i.reply({ content: `wait ${Math.ceil(left / 1000)}s before using /help again`, ephemeral: true });
    helpCd.set(i.user.id, Date.now());

    const e = embed().setDescription(
      `# Hey ${i.user} i see you need help\n` +
      `\`-\` If you're having trouble launching report it to development team! ASAP\n` +
      `\`-\` If you have a question make sure to ask in support channels first!\n` +
      `\`-\` If you are having trouble uploading or importing ping a support staff\n` +
      `\`-\` Anything else just ask in support channels or make a ticket`
    );
    return i.reply({ embeds: [e] });
  }

  // /download
  if (i.commandName === 'download') {
    return i.reply({ embeds: [embed().setTitle('Download').setDescription('Coming soon, Keep your eye out!')] });
  }

  // /embed
  if (i.commandName === 'embed') {
    const e = embed()
      .setTitle(i.options.getString('title'))
      .setDescription(i.options.getString('description').replace(/\\n/g, '\n'));
    await i.channel.send({ embeds: [e] });
    return i.reply({ content: 'sent', ephemeral: true });
  }

  // /ticket ...
  if (i.commandName === 'ticket') {
    const sub = i.options.getSubcommand();

    if (sub === 'panel') {
      if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild) && !isStaff(i.member))
        return i.reply({ content: 'staff only', ephemeral: true });

      const e = embed()
        .setTitle('Tickets')
        .setDescription(
          'Opening a ticket makes a private channel only Tidal Staff can see to help you!\n\n' +
          '🎫 **General Help** - get general help or ask a question\n' +
          '🐛 **Report A Bug** - report a bug with the bot, server or client\n' +
          '⭐ **Famous Application** - open this to apply to get “Famous” role\n\n' +
          'One ticket per user!'
        );
      const row = new ActionRowBuilder().addComponents(
        ...Object.entries(TYPES).map(([id, t]) =>
          new ButtonBuilder().setCustomId(`t_${id}`).setLabel(t.label).setEmoji(t.emoji).setStyle(ButtonStyle.Primary)
        )
      );
      await i.channel.send({ embeds: [e], components: [row] });
      return i.reply({ content: 'panel sent', ephemeral: true });
    }

    // rename + add need staff + a ticket channel
    if (!isStaff(i.member)) return i.reply({ content: 'staff only', ephemeral: true });
    if (!isTicket(i.channel)) return i.reply({ content: 'use this in a ticket', ephemeral: true });

    if (sub === 'rename') {
      const name = i.options.getString('name').toLowerCase().replace(/[^a-z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').slice(0, 90);
      if (!name) return i.reply({ content: 'invalid name', ephemeral: true });
      await i.channel.setName(name);
      return i.reply({ embeds: [embed().setDescription(`Ticket renamed to **${name}**`)] });
    }

    if (sub === 'add') {
      const user = i.options.getUser('user');
      await i.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
      });
      return i.reply({ embeds: [embed().setDescription(`Added ${user} to the ticket`)] });
    }
  }
}

async function onButton(i) {
  // close
  if (i.customId === 't_close') {
    const ownerId = i.channel.topic?.split(':')[1];
    if (!isStaff(i.member) && i.user.id !== ownerId)
      return i.reply({ content: 'only staff or the ticket owner can close this', ephemeral: true });
    await i.reply({ embeds: [embed().setDescription('Closing this ticket in 5 seconds...')] });
    return setTimeout(() => i.channel.delete().catch(() => {}), 5000);
  }

  // open
  if (!i.customId.startsWith('t_')) return;
  const type = TYPES[i.customId.slice(2)];
  if (!type) return;

  // one ticket per user
  const existing = i.guild.channels.cache.find((c) => c.topic === `ticket:${i.user.id}`);
  if (existing)
    return i.reply({ content: `you already have a ticket: ${existing}`, ephemeral: true });

  await i.deferReply({ ephemeral: true });

  const name = `${type.prefix}-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 90);
  const channel = await i.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    topic: `ticket:${i.user.id}`,
    parent: process.env.TICKET_CATEGORY || null,
    permissionOverwrites: [
      { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
      { id: STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageChannels] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
    ],
  });

  const e = embed()
    .setTitle(`${type.emoji} ${type.label}`)
    .setDescription(`Hey ${i.user}, staff will be with you soon!\nTell us what you need in the meantime.`);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('t_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
  await channel.send({ content: `${i.user}`, embeds: [e], components: [row] });
  await i.editReply({ content: `ticket opened: ${channel}` });
}

// ---------- welcome ----------
client.on('guildMemberAdd', async (m) => {
  const ch = m.guild.channels.cache.get(WELCOME_CHANNEL);
  if (!ch) return;
  const e = embed(' - Enjoy!')
    .setTitle('Welcome!')
    .setThumbnail(m.user.displayAvatarURL({ size: 256 }))
    .setDescription(`Welcome ${m} to ${m.guild.name}! You are member #${m.guild.memberCount}`);
  ch.send({ embeds: [e] });
});

// ---------- quick answer ----------
const quickRe = /\b(how|where|link|download|get|find)\b.*\b(mod|mods|launcher|client)\b|\b(mod|mods|launcher|client)\b.*\b(download|link)\b/i;
const quickCd = new Map();

client.on('messageCreate', (msg) => {
  if (msg.author.bot || !msg.guild || !msg.content) return;
  if (!quickRe.test(msg.content)) return;
  if (!/\b(how|where|link|download)\b/i.test(msg.content)) return;
  if (Date.now() - (quickCd.get(msg.channel.id) || 0) < 30000) return; // dont spam
  quickCd.set(msg.channel.id, Date.now());

  const e = embed().setTitle('Quick Answer').setDescription('Run /download to get the most recent launcher download');
  msg.reply({ embeds: [e], allowedMentions: { repliedUser: false } });
});

client.login(process.env.TOKEN);
