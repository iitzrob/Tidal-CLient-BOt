const { handleButton } = require('../utils/tickets');

module.exports = {
  name: 'interactionCreate',
  async execute(i, client) {
    try {
      if (i.isChatInputCommand()) {
        const cmd = client.commands.get(i.commandName);
        if (cmd) await cmd.execute(i);
      } else if (i.isButton()) {
        await handleButton(i);
      }
    } catch (err) {
      console.error(err);
      const msg = { content: 'something went wrong', ephemeral: true };
      if (i.replied || i.deferred) i.followUp(msg).catch(() => {});
      else i.reply(msg).catch(() => {});
    }
  },
};
