const quickAnswer = require('../utils/quickAnswer');

module.exports = {
  name: 'messageCreate',
  execute(msg) {
    if (msg.author.bot || !msg.guild || !msg.content) return;
    quickAnswer(msg);
  },
};
