const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const makeEmbed = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('download')
    .setDescription('get the client')
    .setContexts(InteractionContextType.Guild),
  async execute(i) {
    i.reply({ embeds: [makeEmbed().setTitle('Download').setDescription('Coming soon, Keep your eye out!')] });
  },
};
