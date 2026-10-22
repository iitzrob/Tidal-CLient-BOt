const { suggestionChannel, homeGuild } = require('../config');
const makeEmbed = require('../utils/embed');

module.exports = {
  name: 'threadCreate',
  async execute(thread, newlyCreated) {
    // only new posts in the suggestion forum
    if (thread.guildId !== homeGuild || !newlyCreated || thread.parentId !== suggestionChannel) return;

    await new Promise((r) => setTimeout(r, 1500)); // let the post finish creating

    const embed = makeEmbed()
      .setTitle('Suggestion Received')
      .setDescription(
        'Thanks for sharing your idea, we really appreciate it. Our staff will read through it soon.\n\n' +
        'While you wait, feel free to add more details or examples to your post. Other members can add their thoughts too.'
      );

    await thread
      .send({
        content: `<@${thread.ownerId}>`,
        embeds: [embed],
        allowedMentions: { users: [thread.ownerId] },
      })
      .catch((e) => console.error('suggestion reply failed:', e.message));
  },
};
