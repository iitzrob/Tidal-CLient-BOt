const { staffRole } = require('../config');

module.exports = {
  isStaff: (member) => member.roles.cache.has(staffRole),
  isTicket: (channel) => !!channel.topic && channel.topic.startsWith('ticket:'),
};
