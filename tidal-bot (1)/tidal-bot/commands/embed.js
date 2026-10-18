const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const makeEmbed = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('send an embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('title').setDescription('title').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('description').setRequired(true)),
  async execute(i) {
    const embed = makeEmbed()
      .setTitle(i.options.getString('title'))
      .setDescription(i.options.getString('description').replace(/\\n/g, '\n')); // \n = new line
    await i.channel.send({ embeds: [embed] });
    i.reply({ content: 'sent', ephemeral: true });
  },
};
