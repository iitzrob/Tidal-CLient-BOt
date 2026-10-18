TIDAL BOT SETUP
1. npm install
2. copy .env.example to .env and paste your bot token
3. Discord dev portal > Bot > turn on SERVER MEMBERS INTENT and MESSAGE CONTENT INTENT
4. invite the bot with scopes: bot + applications.commands
   permissions: Manage Channels, View Channels, Send Messages, Embed Links, Read Message History
5. node index.js   (or: pm2 start index.js --name tidalbot)
6. in your ticket channel run /ticket panel
