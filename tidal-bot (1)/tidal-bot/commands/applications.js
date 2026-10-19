const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../utils/checks');
const { panel } = require('../utils/applications');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('applications')
    .setDescription('send the applications panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(i) {
    if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild) && !isStaff(i.member))
      return i.reply({ content: 'staff only', ephemeral: true });
    await i.channel.send(panel());
    i.reply({ content: 'panel sent', ephemeral: true });
  },
};
