const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { modal } = require('../utils/updates');

// home server only (see config.js globalCommands), admins only. Opens a form, then every server that used /updates gets it.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('send an update to every server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setContexts(InteractionContextType.Guild),
  async execute(i) {
    if (!i.memberPermissions.has(PermissionFlagsBits.Administrator))
      return i.reply({ content: 'admins only', ephemeral: true });
    await i.showModal(modal());
  },
};
