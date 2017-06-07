/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/bot/update.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Bot = tu.db.Bot;

describe('db: bot: update: ', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Update bot', () => {
    it('ok, bot active updated', (done) => {
      Bot.findOne({ where: { name: u.name } })
      .then((o) => o.update({ active: false }))
      .then(() => Bot.findOne({ where: { name: u.name } }))
      .then((o) => {
        expect(o).to.have.property('active').to.equal(false);
        done();
      })
      .catch(done);
    });

    it('ok, bot url updated', (done) => {
      Bot.findOne({ where: { name: u.name } })
      .then((o) => o.update({ url: 'http://www.test.com' }))
      .then(() => Bot.findOne({ where: { name: u.name } }))
      .then((o) => {
        expect(o).to.have.property('url').to.equal('http://www.test.com');
        done();
      })
      .catch(done);
    });

    it('fail, bot url bad', (done) => {
      Bot.findOne({ where: { name: u.name } })
      .then((o) => o.update({ url: 'noURL' }))
      .then(() => Bot.findOne({ where: { name: u.name } }))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });
  });
});
