/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/auditevent/utils.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const auditEventObj = {
  loggedAt: new Date('2017-09-30'),
  resourceName: 'abc-collector',
  resourceType: 'Collector',
  isError: false,
  details: {
    detailOne: 'some details one',
    detailTwo: 1234,
  },
};

/**
 * Function to return a new copy of the auditEventObject.
 * @returns {Object} AuditEvent Object
 */
function getAuditEventObj() {
  return JSON.parse(JSON.stringify(auditEventObj));
} // getAuditEventObj

module.exports = {

  getAuditEventObj,

  forceDelete(done) {
    tu.db.AuditEvent.destroy({ where: {}, force: true })
    .then(() => done())
    .catch(done);
  },
};
