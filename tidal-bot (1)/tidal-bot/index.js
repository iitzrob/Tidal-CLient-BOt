require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,   // welcome (turn on in dev portal)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // quick answer (turn on in dev portal)
  ],
});

// load commands
client.commands = new Collection();
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter((f) => f.endsWith('.js'))) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

// load events
for (const file of fs.readdirSync(path.join(__dirname, 'events')).filter((f) => f.endsWith('.js'))) {
  const ev = require(`./events/${file}`);
  if (ev.once) client.once(ev.name, (...a) => ev.execute(...a, client));
  else client.on(ev.name, (...a) => ev.execute(...a, client));
}

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
client.login(process.env.TOKEN);
