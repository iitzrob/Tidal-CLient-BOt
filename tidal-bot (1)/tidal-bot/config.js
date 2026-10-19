module.exports = {
  staffRole: '1559179348303552533',
  welcomeChannel: '1559531843131412551',
  logChannel: '1559182425286909982',
  suggestionChannel: '1560443794594332672',
  applicationChannel: '1561609682332946472', // where finished applications go for staff to accept / deny
  color: 0x0077be, // ocean blue
  footer: 'Tidal Client',

  // AI checker
  aiCheckChannels: [],   // channel ids to scan, empty = scan every channel
  aiThreshold: 40,       // score above this = AI
  aiMinTextLength: 150,  // text shorter than this is skipped (too short to judge)
};
