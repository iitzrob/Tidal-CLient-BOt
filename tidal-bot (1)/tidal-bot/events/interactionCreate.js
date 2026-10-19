const { handleComponent } = require('../utils/tickets');
const apps = require('../utils/applications');

module.exports = {
  name: 'interactionCreate',
  async execute(i, client) {
    try {
      if (i.isChatInputCommand()) {
        const cmd = client.commands.get(i.commandName);
        if (cmd) await cmd.execute(i);
      } else if (i.isModalSubmit()) {
        if (apps.owns(i)) await apps.handleModal(i);
      } else if (i.isButton() || i.isStringSelectMenu()) {
        if (apps.owns(i)) await apps.handle(i);
        else await handleComponent(i);
      }
    } catch (err) {
      console.error(err);
      const msg = { content: 'something went wrong', ephemeral: true };
      if (i.replied || i.deferred) i.followUp(msg).catch(() => {});
      else i.reply(msg).catch(() => {});
    }
  },
};
