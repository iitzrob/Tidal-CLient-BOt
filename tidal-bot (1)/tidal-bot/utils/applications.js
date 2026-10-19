const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { applicationChannel } = require('../config');
const makeEmbed = require('./embed');
const { isStaff } = require('./checks');

const TIME_LIMIT = 60 * 60 * 1000; // 1 hour to finish once you press Apply in the DM

// edit / add questions here
const QUESTIONS = [
  'How old are you?',
  'What country are you from / what is your timezone?',
  'Do you have prior staffing experience? If so, send links and vouches.',
  'Why do you want to be Discord Staff for Tidal Client?',
  'How many hours a day can you be active?',
  'How would you handle a member spamming or being toxic in chat?',
  'A member says they got scammed by another member. What do you do?',
  'Do you have any scam vouches or are you blacklisted anywhere? Be honest.',
  'Is there anything else you want staff to know?',
];

const sessions = new Map(); // userId -> { step, answers, msg, collector }

const btn = (id, label, style, disabled = false) =>
  new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);
const row = (...b) => new ActionRowBuilder().addComponents(...b);

// ---------- panel (goes in the server) ----------
function panel() {
  const embed = makeEmbed()
    .setTitle('Applications')
    .setDescription(
      'Apply for a role, the bot sends you a DM, you fill in the questions and we will review it!\n\n' +
      '**Discord Staff** - Help out with Discord moderation and promote the server\n' +
      '-# More coming\n\n' +
      '**Requirements**:\n' +
      '- Have prior staffing experience\n' +
      '- Must be active and willing to help\n' +
      '- Must not have scam vouches or be blacklisted'
    );
  return { embeds: [embed], components: [row(btn('app_open', 'Apply', ButtonStyle.Primary))] };
}

// ---------- step 1: panel button -> intro DM ----------
async function openApplication(i) {
  if (sessions.has(i.user.id))
    return i.reply({ content: 'you already have an application in progress, check your DMs', ephemeral: true });

  const embed = makeEmbed()
    .setTitle('Discord Staff Application')
    .setDescription(
      'Press **Apply** to start. Once you start you have **1 hour** to complete it.\n' +
      'Staff will review your application and you will get a DM when you are accepted or denied.'
    );
  try {
    await i.user.send({
      embeds: [embed],
      components: [row(btn('app_begin', 'Apply', ButtonStyle.Success), btn('app_cancel', 'Cancel', ButtonStyle.Danger))],
    });
  } catch {
    return i.reply({ content: 'i cant dm you, turn on dms from server members and try again', ephemeral: true });
  }
  i.reply({ content: 'check your dms', ephemeral: true });
}

// ---------- step 2: Apply in the DM -> questions ----------
async function begin(i) {
  if (sessions.has(i.user.id)) return i.deferUpdate().catch(() => {});
  await i.update({ components: [] }); // remove the intro buttons

  const dm = await i.user.createDM();
  const session = { step: 0, answers: [], msg: null, collector: null };
  sessions.set(i.user.id, session);

  session.collector = dm.createMessageCollector({
    filter: (m) => m.author.id === i.user.id,
    time: TIME_LIMIT,
  });

  session.collector.on('collect', async (m) => {
    let answer = m.content.trim();
    m.attachments.forEach((a) => (answer += `${answer ? '\n' : ''}${a.url}`));
    if (!answer) return;

    session.answers.push(answer.slice(0, 1000));
    if (session.msg) session.msg.edit({ components: [] }).catch(() => {}); // old cancel button gone
    session.step++;

    if (session.step < QUESTIONS.length) return ask(dm, session);
    session.collector.stop('done');
    await finish(i.client, i.user, dm, session);
  });

  session.collector.on('end', async (_c, reason) => {
    if (reason !== 'time' || sessions.get(i.user.id) !== session) return;
    sessions.delete(i.user.id);
    if (session.msg) session.msg.edit({ components: [] }).catch(() => {});
    dm.send({
      embeds: [makeEmbed().setTitle('Application Expired').setDescription('You ran out of time (1 hour). Press Apply in the server to start again.')],
    }).catch(() => {});
  });

  await ask(dm, session);
}

function ask(dm, session) {
  const embed = makeEmbed()
    .setTitle(`Question ${session.step + 1} of ${QUESTIONS.length}`)
    .setDescription(`${QUESTIONS[session.step]}\n\n-# Type your answer below. You have 1 hour in total.`);
  return dm
    .send({ embeds: [embed], components: [row(btn('app_cancel', 'Cancel', ButtonStyle.Danger))] })
    .then((m) => (session.msg = m));
}

// ---------- cancel (intro + every question) ----------
async function cancel(i) {
  const session = sessions.get(i.user.id);
  if (session) {
    sessions.delete(i.user.id);
    session.collector.stop('cancel');
  }
  await i.update({
    embeds: [makeEmbed().setTitle('Application Cancelled').setDescription('Your application was cancelled. You can apply again any time.')],
    components: [],
  });
}

// ---------- finished: send to staff ----------
async function finish(client, user, dm, session) {
  sessions.delete(user.id);

  const review = makeEmbed()
    .setTitle('New Staff Application')
    .setDescription(`**Applicant:** ${user} (${user.username} - ${user.id})`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(QUESTIONS.map((q, n) => ({ name: `${n + 1}. ${q}`.slice(0, 256), value: session.answers[n] || 'no answer' })));

  try {
    const ch = await client.channels.fetch(applicationChannel);
    await ch.send({
      embeds: [review],
      components: [row(
        btn(`app_accept:${user.id}`, 'Accept', ButtonStyle.Success),
        btn(`app_deny:${user.id}`, 'Deny', ButtonStyle.Danger)
      )],
    });
  } catch (e) {
    console.error('application send failed:', e);
    return dm.send({ embeds: [makeEmbed().setTitle('Something went wrong').setDescription('Your application could not be sent. Please open a ticket and tell staff.')] }).catch(() => {});
  }

  await dm.send({
    embeds: [makeEmbed().setTitle('Application Submitted').setDescription('Your application was sent to staff. You will get a DM when it has been reviewed.')],
    components: [row(btn('app_wait', 'Wait patiently for staff to review', ButtonStyle.Secondary, true))],
  }).catch(() => {});
}

// ---------- staff: accept / deny ----------
async function decideButton(i, accept, userId) {
  if (!i.inGuild() || !isStaff(i.member)) return i.reply({ content: 'staff only', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId(`app_modal:${accept ? 'accept' : 'deny'}:${userId}`)
    .setTitle(accept ? 'Accept application' : 'Deny application')
    .addComponents(row(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Optional, the applicant will see this')
        .setRequired(false)
        .setMaxLength(1000)
    ));
  await i.showModal(modal);
}

async function handleModal(i) {
  const [, decision, userId] = i.customId.split(':');
  if (!i.inGuild() || !isStaff(i.member)) return i.reply({ content: 'staff only', ephemeral: true });

  const accepted = decision === 'accept';
  const reason = i.fields.getTextInputValue('reason').trim() || 'No reason given';

  const embed = EmbedBuilder.from(i.message.embeds[0])
    .setColor(accepted ? 0x57f287 : 0xed4245)
    .addFields(
      { name: accepted ? 'Accepted by' : 'Denied by', value: `${i.user}`, inline: true },
      { name: 'Reason', value: reason.slice(0, 1024), inline: true }
    );
  await i.update({
    embeds: [embed],
    components: [row(
      btn('app_done_a', 'Accept', ButtonStyle.Success, true),
      btn('app_done_d', 'Deny', ButtonStyle.Danger, true)
    )],
  });

  // dm the applicant
  const user = await i.client.users.fetch(userId).catch(() => null);
  const dmEmbed = makeEmbed()
    .setTitle(accepted ? 'Application Accepted' : 'Application Denied')
    .setDescription(
      accepted
        ? 'Your Discord Staff application for Tidal Client was **accepted**. Welcome to the team, staff will contact you soon!'
        : 'Your Discord Staff application for Tidal Client was **denied**. You can apply again later.'
    )
    .addFields({ name: 'Reason', value: reason.slice(0, 1024) });
  const sent = user ? await user.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false) : false;
  if (!sent) i.followUp({ content: 'could not dm the applicant (dms closed)', ephemeral: true }).catch(() => {});
}

// ---------- router ----------
const owns = (i) => i.customId.startsWith('app_');

async function handle(i) {
  const [action, arg] = i.customId.split(':');
  if (action === 'app_open') return openApplication(i);
  if (action === 'app_begin') return begin(i);
  if (action === 'app_cancel') return cancel(i);
  if (action === 'app_accept') return decideButton(i, true, arg);
  if (action === 'app_deny') return decideButton(i, false, arg);
}

module.exports = { panel, owns, handle, handleModal };
