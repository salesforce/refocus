/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/auditevent.js
 *
 */

const u = require('../helpers/auditEventUtils');
const assoc = {};

module.exports = function bot(seq, dataTypes) {
  const AuditEvent = seq.define('AuditEvent', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    loggedAt: {
      type: dataTypes.BIGINT,
      allowNull: false,
    },
    eventLog: {
      type: dataTypes.JSONB,
      allowNull: false,
      validate: {
        contains: u.validateEventLog,
      },
    },
  }, {
    classMethods: {
      getTagAssociations() {
        return assoc;
      },
    },
    indexes: [
      {
        name: 'loggedAtNotUnique',
        fields: [
          'loggedAt',
        ],
      },
    ],
    paranoid: true,
  });
  return AuditEvent;
};
