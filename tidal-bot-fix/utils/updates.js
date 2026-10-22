const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits,
} = require('discord.js');
const makeEmbed = require('./embed');
const { homeGuild } = require('../config');

const FILE = path.join(__dirname, '..', 'updatechannels.json'); // { guildId: channelId }, survives restarts
const MODAL_ID = 'update_modal';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const save = (m) => fs.writeFileSync(FILE, JSON.stringify(m, null, 2));
const setChannel = (guildId, channelId) => { const m = load(); m[guildId] = channelId; save(m); };
const remove = (guildId) => { const m = load(); if (m[guildId]) { delete m[guildId]; save(m); } };
const get = (guildId) => load()[guildId] || null;

// the form /update opens
function modal() {
  return new ModalBuilder()
    .setCustomId(MODAL_ID)
    .setTitle('Send an update')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short)
          .setMaxLength(100).setRequired(true)),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('body').setLabel('Update').setStyle(TextInputStyle.Paragraph)
          .setMaxLength(3500).setRequired(true)),
    );
}

// sends to every server that picked a channel with /updates
async function broadcast(client, payload) {
  const map = load();
  let sent = 0, failed = 0;
  for (const [guildId, channelId] of Object.entries(map)) {
    try {
      const ch = await client.channels.fetch(channelId);
      await ch.send(payload);
      sent++;
    } catch (e) {
      failed++;
      if (e.code === 10003 || e.code === 10004) remove(guildId); // channel / server is gone
      else console.error(`update to ${guildId} failed:`, e.message);
    }
    await sleep(500); // gentle on rate limits
  }
  return { sent, failed };
}

async function handleModal(i) {
  // checked again here, the form itself is not a permission check
  if (i.guildId !== homeGuild || !i.memberPermissions.has(PermissionFlagsBits.Administrator))
    return i.reply({ content: 'only admins in the Tidal Client server can send updates', ephemeral: true });

  const title = i.fields.getTextInputValue('title').trim();
  const body = i.fields.getTextInputValue('body').trim().replace(/\\n/g, '\n');
  await i.deferReply({ ephemeral: true });

  const embed = makeEmbed().setTitle(title).setDescription(body);
  const { sent, failed } = await broadcast(i.client, { embeds: [embed], allowedMentions: { parse: [] } });
  await i.editReply(
    `update sent to ${sent} server${sent === 1 ? '' : 's'}` + (failed ? `, ${failed} failed (see the bot log)` : '')
  );
}

module.exports = { MODAL_ID, modal, handleModal, setChannel, remove, get, load };
