TIDAL BOT
  index.js        loads commands + events
  config.js       staff role, welcome channel, color, footer
  commands/       ticket, help, download, embed  (one file each)
  events/         clientReady, interactionCreate, guildMemberAdd, messageCreate
  utils/          embed (blue + footer), checks, cooldown, tickets, quickAnswer

SETUP
1. npm install
2. copy .env.example to .env, add TOKEN and GUILD_ID
3. dev portal > Bot > turn on SERVER MEMBERS + MESSAGE CONTENT intents
4. node index.js  (or pm2 start index.js --name tidalbot)
5. run /ticket panel in your ticket channel

Add a command: drop a new file in commands/ exporting { data, execute }.
