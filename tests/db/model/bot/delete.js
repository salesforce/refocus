/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/bot/delete.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Bot = tu.db.Bot;
const constants = require('../../../../db/constants');

describe('db: bot: delete: ', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => u.createNonActive())
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Delete bot', () => {
    it('ok, bot deleted', (done) => {
      Bot.destroy({ where: { active: true } })
      .then(() => Bot.findAll())
      .then((o) => {
        expect(o.length).to.equal(1);
        expect(o[0]).to.equal(u.getStandard());
        done();
      })
      .catch(done);
    });
  });
});
