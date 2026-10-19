const quickAnswer = require('../utils/quickAnswer');
const aiCheck = require('../utils/aiCheck');

module.exports = {
  name: 'messageCreate',
  execute(msg) {
    if (msg.author.bot || !msg.guild) return;
    aiCheck(msg).catch((e) => console.error('ai check failed:', e.message));
    if (msg.content) quickAnswer(msg);
  },
};
