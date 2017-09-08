/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/bot/find.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Bot = tu.db.Bot;
const constants = require('../../../../db/constants');

describe('tests/db/model/bot/find.js >', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => u.createNonActive())
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, bot active', (done) => {
    Bot.findOne({ where: { active: true } })
    .then((o) => {
      expect(o).to.have.property('name').to.equal(u.name);
      done();
    })
    .catch(done);
  });

  it('ok, bot non active', (done) => {
    Bot.findOne({ where: { active: false } })
    .then((o) => {
      expect(o).to.have.property('name').to.equal(u.nameNonActive);
      done();
    })
    .catch(done);
  });

  it('returns correct profile access field name', (done) => {
    expect(Bot.getProfileAccessField()).to.equal('botAccess');
    done();
  });
});
