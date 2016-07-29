/**
 * db/constants.js
 */

module.exports = {
  fieldlen: {
    email: 254,
    longish: 4096,
    normalName: 60,
    reallyShort: 5,
    shortish: 10,
    url: 2082, // sequelize validator default
  },
  nameRegex: /^[0-9a-z_-]+$/i,
  sampleNameSeparator: '|',
  defaultJsonArrayValue: [],
  statuses: {
    Critical: 'Critical',
    Invalid: 'Invalid',
    Timeout: 'Timeout',
    Warning: 'Warning',
    Info: 'Info',
    OK: 'OK',
  },
};
