const updates = require('../utils/updates');

// the bot was removed from a server: forget its update channel
module.exports = {
  name: 'guildDelete',
  execute(guild) {
    if (!guild.available) return; // just a Discord outage
    updates.remove(guild.id);
  },
};
