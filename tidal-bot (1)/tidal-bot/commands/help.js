const { SlashCommandBuilder } = require('discord.js');
const makeEmbed = require('../utils/embed');
const cooldown = require('../utils/cooldown');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('need help?'),
  async execute(i) {
    const left = cooldown(`help:${i.user.id}`, 10000); // 10s cd
    if (left) return i.reply({ content: `wait ${left}s before using /help again`, ephemeral: true });

    const embed = makeEmbed().setDescription(
      `# Hey ${i.user}, need help?\n` +
      `**Won't launch** - Sign in first (Settings > Accounts), pick a version on Home, then hit Launch. Java installs itself. Check the Game log on Home for the error.\n` +
      `**Sign in** - Settings > Accounts > Sign in with Microsoft and enter the code on the page. You need Minecraft: Java Edition. No Xbox profile? Log in at minecraft.net once. Offline accounts are singleplayer only.\n` +
      `**Mods** - Mods need Fabric (pick Fabric (mods) on Home). Browse or upload on the Mods page, every file gets scanned.\n` +
      `**In-game menu** - Press Right Shift on Fabric 1.21 - 1.21.11. Change the key in Mods > Menu key.\n` +
      `**Low FPS / crashes** - Settings > turn on FPS boost and Performance mods, and set Memory to 4 GB (more for big packs).\n` +
      `**Skins & capes** - Use the Skins and Capes pages (64x64 PNG). Offline accounts need CustomSkinLoader, there's a button on the Skins page.\n` +
      `**Updates** - Click Restart to update in the launcher sidebar.\n\n` +
      `Still stuck? **Make a ticket** and send your Game log so staff can help.`
    );
    i.reply({ embeds: [embed] });
  },
};
