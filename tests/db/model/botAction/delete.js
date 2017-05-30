/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/delete.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const BotAction = tu.db.BotAction;
const constants = require('../../../../db/constants');

describe('db: bot action: delete: ', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Delete bot action', () => {
    it('ok, bot action deleted', (done) => {
      BotAction.destroy({ where: { name: u.name } })
      .then(() => BotAction.findAll())
      .then((o) => {
        expect(o.length).to.equal(0);
        done();
      })
      .catch(done);
    });
  });
});
