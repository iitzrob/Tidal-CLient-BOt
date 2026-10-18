const { welcomeChannel } = require('../config');
const makeEmbed = require('../utils/embed');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const ch = member.guild.channels.cache.get(welcomeChannel);
    if (!ch) return;
    const embed = makeEmbed(' - Enjoy!')
      .setTitle('Welcome!')
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setDescription(`Welcome ${member} to ${member.guild.name}! You are member #${member.guild.memberCount}`);
    ch.send({ embeds: [embed] });
  },
};
