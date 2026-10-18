module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    const body = client.commands.map((c) => c.data.toJSON());
    if (process.env.GUILD_ID) {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      await guild.commands.set(body);
    } else {
      await client.application.commands.set(body);
    }
    client.user.setActivity('Tidal Client');
    console.log(`Tidal Bot online as ${client.user.tag} | ${body.length} commands`);
  },
};
