const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, InteractionContextType,
} = require('discord.js');
const makeEmbed = require('../utils/embed');
const store = require('../utils/updates');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('updates')
    .setDescription('choose the channel Tidal Client updates are posted in')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((s) =>
      s.setName('set').setDescription('pick the update channel')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('where updates go').setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('off').setDescription('stop getting updates')),

  async execute(i) {
    // Manage Server or Administrator
    if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild))
      return i.reply({ content: 'you need the Manage Server permission to do that', ephemeral: true });

    if (i.options.getSubcommand() === 'off') {
      store.remove(i.guildId);
      return i.reply({ embeds: [makeEmbed().setDescription('Updates are off for this server. Use `/updates set` to turn them back on.')], ephemeral: true });
    }

    const picked = i.options.getChannel('channel');
    const channel = await i.guild.channels.fetch(picked.id).catch(() => null);
    const me = await i.guild.members.fetchMe();
    const need = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks];
    if (!channel || !channel.permissionsFor(me)?.has(need))
      return i.reply({ content: `i cant post in ${picked}, give me View Channel, Send Messages and Embed Links there first`, ephemeral: true });

    store.setChannel(i.guildId, channel.id);
    i.reply({ embeds: [makeEmbed().setDescription(`Tidal Client updates will be posted in ${channel}`)], ephemeral: true });
  },
};
