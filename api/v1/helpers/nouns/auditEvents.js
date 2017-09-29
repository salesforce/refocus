/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/auditEvents.js
 */
'use strict';

const AuditEvent = require('../../../../db/index').AuditEvent;
const m = 'auditevent';

module.exports = {
  apiLinks: {
    POST: `Update selected attributes of this ${m}`,
  },
  baseUrl: '/v1/AuditEvents',
  model: AuditEvent,
  modelName: 'AuditEvent',
}; // exports
