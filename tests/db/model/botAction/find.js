/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/find.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const BotAction = tu.db.BotAction;
const constants = require('../../../../db/constants');

describe('db: bot action: find: ', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Find bot action', () => {
    it('ok, bot action', (done) => {
      BotAction.findOne({ where: { name: u.name } })
      .then((o) => {
        expect(o).to.have.property('name').to.equal(u.name);
        done();
      })
      .catch(done);
    });
  });
});
