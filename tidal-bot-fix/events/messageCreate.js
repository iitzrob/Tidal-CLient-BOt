const { homeGuild } = require('../config');
const quickAnswer = require('../utils/quickAnswer');
const aiCheck = require('../utils/aiCheck');
const mod = require('../utils/modCommands');

module.exports = {
  name: 'messageCreate',
  execute(msg) {
    if (msg.author.bot || !msg.guild || msg.guildId !== homeGuild) return; // staff stuff is for the Tidal Client server only
    if (mod.isCommand(msg)) {
      mod.run(msg).catch((e) => console.error('mod command failed:', e));
      return;
    }
    aiCheck(msg).catch((e) => console.error('ai check failed:', e.message));
    if (msg.content) quickAnswer(msg);
  },
};
