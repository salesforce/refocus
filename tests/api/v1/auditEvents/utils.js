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
  loggedAt: '2017-09-22',
  resourceName: 'abc-collector',
  resourceType: 'Collector',
  isError: false,
  details: {
    detailOne: 'some details one',
    detailTwo: 1234,
  },
};

/**
 * Creates an auditEvent object and returns it to the caller.
 * @param  {String} resourceType - Type of the resource that is sending in the
 * audit logs. Example: "Refocus" or "Collector"
 * @param  {String} resourceName - Name of the resource that is being audited,
 * i.e. table name in refocus(Sample, Subject..) or
 * @param  {String} loggedAt - The time at which this audit was created
 * @param {Boolen} isError - True when the audit event is an error
 * @param  {Object} details  - Optional description about the aduit log
 * @returns {Object}  - a complete auditevent object.
 */
function createAuditEventObject(resourceType,  // eslint-disable-line max-params
  resourceName, loggedAt, isError, details) {
  return {
    resourceName,
    resourceType,
    loggedAt: new Date(loggedAt),
    isError: isError || false,
    details: details || {},
  };
}

/**
 * Function to return a new copy of the auditEventObject.
 * @returns {Object} AuditEvent Object
 */
function getAuditEventObject() {
  return JSON.parse(JSON.stringify(auditEventObj));
} // getAuditEventObject

module.exports = {
  createAuditEventObject,

  getAuditEventObject,

  forceDelete(done) {
    tu.db.AuditEvent.destroy({ where: {}, force: true })
    .then(() => done())
    .catch(done);
  },
};
