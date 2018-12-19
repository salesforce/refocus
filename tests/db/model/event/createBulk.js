/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/event/createBulk.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Event = tu.db.Event;

const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/db/model/event/createBulk.js >', () => {
  afterEach(u.forceDelete);

  it('OK, Events were created successfully', (done) => {
    const testEvent1 = u.getStandard();
    const testEvent2 = u.getStandard();
    testEvent2.log = 'Very Important Event';

    Event.bulkCreate([
      testEvent1,
      testEvent2,
    ])
    .then((res) => {
      expect(res.length).to.equal(TWO);
      expect(res[ONE].log).to.equal('Very Important Event');
      return res;
    })
    .each((event) => {
      expect(event).to.have.property('log');
    })
    .then(() => done())
    .catch((err) => done(err));
  });

  it('Fail, Second event did not have a log', (done) => {
    const testEvent1 = u.getStandard();
    const testEvent2 = u.getStandard();
    delete testEvent2.log;

    Event.bulkCreate([
      testEvent1,
      testEvent2,
    ])
    .catch((err) => {
      expect(err.message)
        .to.equal('notNull Violation: Event.log cannot be null');
      done();
    });
  });
});
