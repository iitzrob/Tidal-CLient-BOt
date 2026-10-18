const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const makeEmbed = require('../utils/embed');
const { isStaff, isTicket } = require('../utils/checks');
const { panel } = require('../utils/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('ticket stuff')
    .addSubcommand((s) => s.setName('panel').setDescription('send ticket panel'))
    .addSubcommand((s) =>
      s.setName('rename').setDescription('rename the ticket')
        .addStringOption((o) => o.setName('name').setDescription('new name').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('add').setDescription('add a user to the ticket')
        .addUserOption((o) => o.setName('user').setDescription('who to add').setRequired(true))),

  async execute(i) {
    const sub = i.options.getSubcommand();

    if (sub === 'panel') {
      if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild) && !isStaff(i.member))
        return i.reply({ content: 'staff only', ephemeral: true });
      await i.channel.send(panel());
      return i.reply({ content: 'panel sent', ephemeral: true });
    }

    // rename + add: staff role only, inside a ticket
    if (!isStaff(i.member)) return i.reply({ content: 'staff only', ephemeral: true });
    if (!isTicket(i.channel)) return i.reply({ content: 'use this in a ticket', ephemeral: true });

    if (sub === 'rename') {
      const name = i.options.getString('name').toLowerCase()
        .replace(/[^a-z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').slice(0, 90);
      if (!name) return i.reply({ content: 'invalid name', ephemeral: true });
      await i.channel.setName(name);
      return i.reply({ embeds: [makeEmbed().setDescription(`Ticket renamed to **${name}**`)] });
    }

    if (sub === 'add') {
      const user = i.options.getUser('user');
      await i.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
      });
      return i.reply({ embeds: [makeEmbed().setDescription(`Added ${user} to the ticket`)] });
    }
  },
};
