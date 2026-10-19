require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Options, Partials } = require('discord.js');

const client = new Client({
  // keep the memory cache small (the bot never needs old messages, presences, emojis, etc)
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 0,
    PresenceManager: 0,
    VoiceStateManager: 0,
    ReactionManager: 0,
    ReactionUserManager: 0,
    GuildEmojiManager: 0,
    GuildStickerManager: 0,
    GuildScheduledEventManager: 0,
    StageInstanceManager: 0,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    ThreadMemberManager: 0,
    UserManager: 20,
    GuildMemberManager: { maxSize: 20, keepOverLimit: (m) => m.id === m.client.user.id },
  }),
  partials: [Partials.Channel], // needed to receive DMs
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,   // welcome (turn on in dev portal)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // quick answer (turn on in dev portal)
    GatewayIntentBits.DirectMessages, // application answers in DMs
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
