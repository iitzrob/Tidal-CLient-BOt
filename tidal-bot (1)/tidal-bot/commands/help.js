const { SlashCommandBuilder } = require('discord.js');
const makeEmbed = require('../utils/embed');
const cooldown = require('../utils/cooldown');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('need help?'),
  async execute(i) {
    const left = cooldown(`help:${i.user.id}`, 10000); // 10s cd
    if (left) return i.reply({ content: `wait ${left}s before using /help again`, ephemeral: true });

    const embed = makeEmbed().setDescription(
      `# Hey ${i.user} i see you need help\n` +
      `\`-\` If you're having trouble launching report it to development team! ASAP\n` +
      `\`-\` If you have a question make sure to ask in support channels first!\n` +
      `\`-\` If you are having trouble uploading or importing ping a support staff\n` +
      `\`-\` Anything else just ask in support channels or make a ticket`
    );
    i.reply({ embeds: [embed] });
  },
};
