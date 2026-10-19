const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('./checks');

const REACT = '<:tidaldo:1559349185554153564>';
const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000; // discord limit
const FILE = path.join(__dirname, '..', 'tempbans.json');

const UNITS = { s: 1000, m: 60e3, h: 3600e3, d: 86400e3, w: 604800e3 };
const NAMES = [['week', 604800e3], ['day', 86400e3], ['hour', 3600e3], ['minute', 60e3], ['second', 1000]];

// "1s" "30m" "2h" "7d" "1w" "1h30m"
const isDuration = (t) => /^(\d+[smhdw])+$/i.test(t);
function parseDuration(t) {
  let ms = 0;
  for (const [, n, u] of t.matchAll(/(\d+)([smhdw])/gi)) ms += Number(n) * UNITS[u.toLowerCase()];
  return ms;
}
function formatDuration(ms) {
  const out = [];
  for (const [name, size] of NAMES) {
    const n = Math.floor(ms / size);
    if (n) { out.push(`${n} ${name}${n === 1 ? '' : 's'}`); ms -= n * size; }
  }
  return out.join(' ') || '0 seconds';
}

const userId = (t) => (t.match(/^<@!?(\d{17,20})>$/) || t.match(/^(\d{17,20})$/) || [])[1];

// accepts "[time] @user reason" or "@user [time] reason"
function parseArgs(tokens) {
  let id = null, duration = null, i = 0;
  for (; i < Math.min(2, tokens.length); i++) {
    if (!duration && isDuration(tokens[i])) duration = tokens[i];
    else if (!id && userId(tokens[i])) id = userId(tokens[i]);
    else break;
  }
  return { id, duration, reason: tokens.slice(i).join(' ').trim() };
}

// ---------- temp bans (survive restarts) ----------
const loadBans = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } };
const saveBans = (l) => fs.writeFileSync(FILE, JSON.stringify(l));

function startTempBanLoop(client) {
  const tick = async () => {
    const list = loadBans();
    const now = Date.now();
    const keep = [];
    for (const b of list) {
      if (b.expires > now) { keep.push(b); continue; }
      try {
        const guild = await client.guilds.fetch(b.guildId);
        await guild.members.unban(b.userId, 'Temp ban expired');
      } catch (e) {
        if (e.code !== 10026) console.error('unban failed:', e.message); // 10026 = already unbanned
      }
    }
    if (keep.length !== list.length) saveBans(keep);
  };
  tick();
  setInterval(tick, 30 * 1000);
}

// ---------- commands ----------
const COMMANDS = {
  ban:     { perm: PermissionFlagsBits.BanMembers,      usage: '!ban [time] @user [reason]' },
  timeout: { perm: PermissionFlagsBits.ModerateMembers, usage: '!timeout <time> @user [reason]' },
  kick:    { perm: PermissionFlagsBits.KickMembers,     usage: '!kick @user [reason]' },
  unban:     { perm: PermissionFlagsBits.BanMembers,      usage: '!unban @user [reason]' },
  untimeout: { perm: PermissionFlagsBits.ModerateMembers, usage: '!untimeout @user [reason]' },
  unmute:    { perm: PermissionFlagsBits.ModerateMembers, usage: '!untimeout @user [reason]' }, // same as untimeout
};
const ALIAS = { unmute: 'untimeout' };

const isCommand = (msg) => {
  if (!msg.content.startsWith('!')) return false;
  return Object.hasOwn(COMMANDS, msg.content.slice(1).split(/\s+/)[0].toLowerCase());
};

const say = (msg, text) => msg.reply({ content: text, allowedMentions: { parse: [], repliedUser: false } });

async function run(msg) {
  const [first, ...tokens] = msg.content.trim().split(/\s+/);
  const typed = first.slice(1).toLowerCase();
  const name = ALIAS[typed] || typed;
  const cmd = COMMANDS[typed];

  if (!(isStaff(msg.member) || msg.member.permissions.has(cmd.perm)))
    return say(msg, 'you do not have permission to do that');

  const { id, duration, reason: rawReason } = parseArgs(tokens);
  if (!id) return say(msg, `usage: \`${cmd.usage}\``);
  if (name === 'timeout' && !duration) return say(msg, `usage: \`${cmd.usage}\``);
  if (['kick', 'unban', 'untimeout'].includes(name) && duration) return say(msg, `usage: \`${cmd.usage}\``);

  const ms = duration ? parseDuration(duration) : 0;
  if (duration && ms <= 0) return say(msg, 'that is not a valid time, use something like 30s, 10m, 2h, 7d');
  if (name === 'timeout' && ms > MAX_TIMEOUT) return say(msg, 'timeouts can be 28 days at most');

  const me = msg.guild.members.me;
  if (id === msg.author.id) return say(msg, 'you cant do that to yourself');
  if (id === msg.client.user.id) return say(msg, 'nice try');
  if (id === msg.guild.ownerId) return say(msg, 'you cant do that to the server owner');

  const target = name === 'unban' ? null : await msg.guild.members.fetch(id).catch(() => null);
  if (target) {
    const isOwner = msg.author.id === msg.guild.ownerId;
    if (!isOwner && target.roles.highest.position >= msg.member.roles.highest.position)
      return say(msg, 'that person has the same or a higher role than you');
    if (target.roles.highest.position >= me.roles.highest.position)
      return say(msg, 'that person has a higher role than me, move my role up');
  } else if (name !== 'ban' && name !== 'unban') {
    return say(msg, 'i cant find that user in this server');
  }

  const reason = rawReason || 'No reason provided';
  const audit = `${reason} | by ${msg.author.tag}`.slice(0, 512);

  try {
    if (name === 'ban') {
      await msg.guild.members.ban(id, { reason: audit });
      if (ms) {
        const list = loadBans().filter((b) => !(b.guildId === msg.guild.id && b.userId === id));
        list.push({ guildId: msg.guild.id, userId: id, expires: Date.now() + ms });
        saveBans(list);
      }
    } else if (name === 'kick') {
      await target.kick(audit);
    } else if (name === 'unban') {
      await msg.guild.members.unban(id, audit);
      saveBans(loadBans().filter((b) => !(b.guildId === msg.guild.id && b.userId === id))); // drop any pending temp ban
    } else if (name === 'untimeout') {
      if (!target.communicationDisabledUntilTimestamp || target.communicationDisabledUntilTimestamp < Date.now())
        return say(msg, 'that user is not timed out');
      await target.timeout(null, audit);
    } else {
      await target.timeout(ms, audit);
    }
  } catch (e) {
    if (name === 'unban' && e.code === 10026) return say(msg, 'that user is not banned');
    console.error(`!${name} failed:`, e.message);
    return say(msg, `i could not do that (${e.message})`);
  }

  msg.react(REACT).catch(() => {});

  const verb = { ban: 'banned', timeout: 'muted', kick: 'kicked', unban: 'unbanned', untimeout: 'unmuted' }[name];
  let text = `<@${id}> ${verb}\n> Reason: ${reason}`;
  if (ms) text += `\n> Duration: ${formatDuration(ms)}`;
  return say(msg, text);
}

module.exports = { isCommand, run, startTempBanLoop };
