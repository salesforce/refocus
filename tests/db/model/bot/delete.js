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

describe('tests/db/model/bot/delete.js >', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => u.createNonActive())
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, bot deleted', (done) => {
    const testStandard = u.getStandard();
    Bot.destroy({ where: { active: false } })
    .then(() => Bot.findAll())
    .then((o) => {
      expect(o.length).to.equal(1);
      expect(o[0].dataValues.name).to.equal(testStandard.name);
      expect(o[0].dataValues.url).to.equal(testStandard.url);
      expect(o[0].dataValues.active).to.equal(testStandard.active);
      done();
    })
    .catch(done);
  });
});
