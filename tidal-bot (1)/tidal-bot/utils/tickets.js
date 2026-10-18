const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits,
} = require('discord.js');
const { staffRole } = require('../config');
const makeEmbed = require('./embed');
const { isStaff } = require('./checks');

const TYPES = {
  general: { label: 'General Help', emoji: '🎫', prefix: 'help' },
  bug: { label: 'Report A Bug', emoji: '🐛', prefix: 'bug' },
  famous: { label: 'Famous Application', emoji: '⭐', prefix: 'famous' },
};

const P = PermissionFlagsBits;
const chatPerms = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles];

function panel() {
  const embed = makeEmbed()
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
  return { embeds: [embed], components: [row] };
}

async function openTicket(i, type) {
  // one ticket per user
  const existing = i.guild.channels.cache.find((c) => c.topic === `ticket:${i.user.id}`);
  if (existing) return i.reply({ content: `you already have a ticket: ${existing}`, ephemeral: true });

  await i.deferReply({ ephemeral: true });

  const name = `${type.prefix}-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 90);
  const channel = await i.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    topic: `ticket:${i.user.id}`,
    parent: process.env.TICKET_CATEGORY || null,
    permissionOverwrites: [
      { id: i.guild.id, deny: [P.ViewChannel] },
      { id: i.user.id, allow: chatPerms },
      { id: staffRole, allow: [...chatPerms, P.ManageChannels] },
      { id: i.client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ManageChannels] },
    ],
  });

  const embed = makeEmbed()
    .setTitle(`${type.emoji} ${type.label}`)
    .setDescription(`Hey ${i.user}, staff will be with you soon!\nTell us what you need in the meantime.`);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('t_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
  await channel.send({ content: `${i.user}`, embeds: [embed], components: [row] });
  await i.editReply({ content: `ticket opened: ${channel}` });
}

async function closeTicket(i) {
  const ownerId = i.channel.topic?.split(':')[1];
  if (!isStaff(i.member) && i.user.id !== ownerId)
    return i.reply({ content: 'only staff or the ticket owner can close this', ephemeral: true });
  await i.reply({ embeds: [makeEmbed().setDescription('Closing this ticket in 5 seconds...')] });
  setTimeout(() => i.channel.delete().catch(() => {}), 5000);
}

async function handleButton(i) {
  if (i.customId === 't_close') return closeTicket(i);
  if (!i.customId.startsWith('t_')) return;
  const type = TYPES[i.customId.slice(2)];
  if (type) return openTicket(i, type);
}

module.exports = { TYPES, panel, handleButton };
