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
const constants = require('../constants');

module.exports = function auditevent(seq, dataTypes) {
  const AuditEvent = seq.define('AuditEvent', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    loggedAt: {
      type: dataTypes.DATE,
      defaultValue: Date.now(),
    },
    resourceName: {
      type: dataTypes.STRING(constants.fieldlen.longish),
      allowNull: false,
    },
    resourceType: {
      type: dataTypes.STRING(constants.fieldlen.longish),
      allowNull: false,
    },
    isError: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
    },
    details: {
      type: dataTypes.JSONB,
      defaultValue: constants.defaultJSONValue,
      allowNull: false,
    },
  }, {
    defaultScope: {
      order: ['AuditEvent.loggedAt'],
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
