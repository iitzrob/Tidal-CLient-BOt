const { SlashCommandBuilder } = require('discord.js');
const makeEmbed = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder().setName('download').setDescription('get the client'),
  async execute(i) {
    i.reply({ embeds: [makeEmbed().setTitle('Download').setDescription('Coming soon, Keep your eye out!')] });
  },
};
