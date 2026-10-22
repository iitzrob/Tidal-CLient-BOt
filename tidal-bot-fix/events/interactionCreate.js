const { handleComponent } = require('../utils/tickets');
const apps = require('../utils/applications');
const updates = require('../utils/updates');
const { homeGuild, globalCommands } = require('../config');

// null guildId = a DM (applications are answered there), anything else must be the home server
const outsideHome = (i) => !!i.guildId && i.guildId !== homeGuild;

module.exports = {
  name: 'interactionCreate',
  async execute(i, client) {
    try {
      if (i.isChatInputCommand()) {
        const cmd = client.commands.get(i.commandName);
        if (!cmd) return;
        if (!globalCommands.includes(i.commandName) && i.guildId !== homeGuild)
          return i.reply({ content: 'that command only works in the Tidal Client server', ephemeral: true });
        await cmd.execute(i);
      } else if (i.isModalSubmit()) {
        if (i.customId === updates.MODAL_ID) await updates.handleModal(i);
        else if (!outsideHome(i) && apps.owns(i)) await apps.handleModal(i);
      } else if (i.isButton() || i.isStringSelectMenu()) {
        if (outsideHome(i)) return;
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
