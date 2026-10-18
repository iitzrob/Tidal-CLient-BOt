const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  AttachmentBuilder, ChannelType, PermissionFlagsBits,
} = require('discord.js');
const { staffRole, logChannel } = require('../config');
const makeEmbed = require('./embed');
const { isStaff } = require('./checks');

const TYPES = {
  general: { label: 'General Help', desc: 'Get general help or ask a question', prefix: 'help' },
  bug: { label: 'Report A Bug', desc: 'Report a bug with the bot, server or client', prefix: 'bug' },
  famous: { label: 'Famous Application', desc: 'Apply to get the Famous role', prefix: 'famous' },
};

const P = PermissionFlagsBits;
const chatPerms = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles];
const closing = new Set(); // channels already being closed

// topic format: ticket:<ownerId>:<typeKey>
const ownerOf = (ch) => (ch.topic && ch.topic.startsWith('ticket:') ? ch.topic.split(':')[1] : null);
const typeOf = (ch) => (ch.topic && ch.topic.startsWith('ticket:') ? ch.topic.split(':')[2] : null);

// ---------- panel (dropdown) ----------
function panel() {
  const embed = makeEmbed()
    .setTitle('Tickets')
    .setDescription(
      'Opening a ticket makes a private channel only Tidal Staff can see to help you!\n\n' +
      '**General Help** - get general help or ask a question\n' +
      '**Report A Bug** - report a bug with the bot, server or client\n' +
      '**Famous Application** - open this to apply to get “Famous” role\n\n' +
      'One ticket per user!'
    );
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('Select a ticket type')
    .addOptions(Object.entries(TYPES).map(([value, t]) => ({ label: t.label, description: t.desc, value })));
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

// ---------- open ----------
async function openTicket(i, type, key) {
  // one ticket per user
  const existing = i.guild.channels.cache.find((c) => ownerOf(c) === i.user.id);
  if (existing) return i.reply({ content: `you already have a ticket: ${existing}`, ephemeral: true });

  await i.deferReply({ ephemeral: true });

  const name = `${type.prefix}-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 90);
  const channel = await i.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    topic: `ticket:${i.user.id}:${key}`,
    parent: process.env.TICKET_CATEGORY || null,
    permissionOverwrites: [
      { id: i.guild.id, deny: [P.ViewChannel] },
      { id: i.user.id, allow: chatPerms },
      { id: staffRole, allow: [...chatPerms, P.ManageChannels] },
      { id: i.client.user.id, allow: [...chatPerms, P.EmbedLinks, P.ManageChannels] },
    ],
  });

  const embed = makeEmbed()
    .setTitle(type.label)
    .setDescription(`Hey ${i.user}, staff will be with you soon!\nTell us what you need in the meantime.`);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('t_close').setLabel('Close').setStyle(ButtonStyle.Danger)
  );
  await channel.send({
    content: `${i.user} <@&${staffRole}>`,
    embeds: [embed],
    components: [row],
    allowedMentions: { users: [i.user.id], roles: [staffRole] },
  });
  await i.editReply({ content: `ticket opened: ${channel}` });
}

// ---------- transcript ----------
async function fetchAll(channel) {
  const all = [];
  let before;
  while (all.length < 2000) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
  }
  return all.reverse(); // oldest first
}

const stamp = (d) => d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

async function sendTranscript(i, ownerId) {
  const ch = i.channel;
  const typeLabel = TYPES[typeOf(ch)]?.label || 'Ticket';
  const messages = await fetchAll(ch);
  const owner = ownerId ? await i.client.users.fetch(ownerId).catch(() => null) : null;

  const lines = messages.map((m) => {
    let line = `[${stamp(m.createdAt)}] ${m.author.username}: ${m.content || ''}`.trimEnd();
    m.attachments.forEach((a) => (line += `\n    [file] ${a.url}`));
    m.embeds.forEach((e) => {
      const t = [e.title, e.description].filter(Boolean).join(' - ').replace(/\n/g, ' ');
      if (t) line += `\n    [embed] ${t}`;
    });
    return line;
  });

  const text = [
    `Transcript: #${ch.name}`,
    `Type: ${typeLabel}`,
    `Opened by: ${owner ? owner.username : 'unknown'} (${ownerId || 'unknown'})`,
    `Closed by: ${i.user.username} (${i.user.id})`,
    `Messages: ${messages.length}`,
    '------------------------------------------------',
    ...lines,
  ].join('\n');

  const file = () => new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: `transcript-${ch.name}.txt` });
  const embed = makeEmbed()
    .setTitle('Ticket Closed')
    .addFields(
      { name: 'Ticket', value: ch.name, inline: true },
      { name: 'Type', value: typeLabel, inline: true },
      { name: 'Messages', value: String(messages.length), inline: true },
      { name: 'Opened by', value: ownerId ? `<@${ownerId}>` : 'unknown', inline: true },
      { name: 'Closed by', value: `${i.user}`, inline: true }
    );

  // log channel
  const log = await i.client.channels.fetch(logChannel).catch(() => null);
  if (log) await log.send({ embeds: [embed], files: [file()] }).catch((e) => console.error('log send failed:', e.message));
  else console.error('log channel not found / no access');

  // dm to the person who opened it (fails quietly if their dms are closed)
  if (owner) await owner.send({ embeds: [embed], files: [file()] }).catch(() => {});
}

// ---------- close ----------
async function closeTicket(i) {
  const ownerId = ownerOf(i.channel);
  if (!isStaff(i.member) && i.user.id !== ownerId)
    return i.reply({ content: 'only staff or the ticket owner can close this', ephemeral: true });
  if (closing.has(i.channel.id)) return i.reply({ content: 'already closing', ephemeral: true });

  closing.add(i.channel.id);
  await i.reply({ embeds: [makeEmbed().setDescription('Saving transcript and closing this ticket in 5 seconds...')] });
  try {
    await sendTranscript(i, ownerId);
  } catch (e) {
    console.error('transcript failed:', e);
  }
  setTimeout(() => {
    closing.delete(i.channel.id);
    i.channel.delete().catch(() => {});
  }, 5000);
}

// ---------- router ----------
async function handleComponent(i) {
  // dropdown
  if (i.isStringSelectMenu() && i.customId === 'ticket_select') {
    const key = i.values[0];
    const type = TYPES[key];
    if (!type) return;
    await openTicket(i, type, key);
    i.message.edit(panel()).catch(() => {}); // reset the dropdown so it can be used again
    return;
  }
  if (!i.isButton()) return;
  if (i.customId === 't_close') return closeTicket(i);
  // old panel buttons (t_general etc) still work
  if (i.customId.startsWith('t_')) {
    const key = i.customId.slice(2);
    if (TYPES[key]) return openTicket(i, TYPES[key], key);
  }
}

module.exports = { TYPES, panel, handleComponent };
