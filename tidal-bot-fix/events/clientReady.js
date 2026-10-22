const { startTempBanLoop } = require('../utils/modCommands');
const { homeGuild, globalCommands } = require('../config');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    const all = [...client.commands.values()];
    const global = all.filter((c) => globalCommands.includes(c.data.name)).map((c) => c.data.toJSON());
    const home = all.filter((c) => !globalCommands.includes(c.data.name)).map((c) => c.data.toJSON());

    // every server gets the global ones, only the Tidal Client server gets the rest
    await client.application.commands.set(global);
    const guild = await client.guilds.fetch(homeGuild).catch(() => null);
    if (guild) await guild.commands.set(home);
    else console.warn(`the bot is not in the home server (${homeGuild}), staff commands were not registered`);

    client.user.setActivity('Tidal Client');
    startTempBanLoop(client); // unbans temp bans when they run out
    console.log(`Tidal Bot online as ${client.user.tag} | ${global.length} global, ${home.length} home-only | ${client.guilds.cache.size} servers`);
  },
};
