const { EmbedBuilder } = require('discord.js');
const { color, footer } = require('../config');

const today = () => new Date().toLocaleDateString('en-US'); // 9/1/2021

// every embed goes through here so they're all ocean blue + same footer
module.exports = (extra = '') =>
  new EmbedBuilder().setColor(color).setFooter({ text: `${footer} - ${today()}${extra}` });
