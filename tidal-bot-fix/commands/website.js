const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const makeEmbed = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('website')
    .setDescription('get the Tidal Client website')
    .setContexts(InteractionContextType.Guild),
  async execute(i) {
    i.reply({ embeds: [makeEmbed().setTitle('Website').setURL('https://tidalclient.xyz/').setDescription('https://tidalclient.xyz/')] });
  },
};
