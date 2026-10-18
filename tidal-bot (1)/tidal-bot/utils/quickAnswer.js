const makeEmbed = require('./embed');
const cooldown = require('./cooldown');

// "how do i get the launcher", "where is the mod download", etc
const target = /\b(mod|mods|launcher|client)\b/i;
const asking = /\b(how|where|link|download)\b/i;

module.exports = (msg) => {
  if (!target.test(msg.content) || !asking.test(msg.content)) return;
  if (cooldown(`qa:${msg.channel.id}`, 30000)) return; // dont spam the channel

  const embed = makeEmbed()
    .setTitle('Quick Answer')
    .setDescription('Run /download to get the most recent launcher download');
  msg.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
};
