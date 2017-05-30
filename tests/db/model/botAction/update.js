/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/update.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const BotAction = tu.db.BotAction;
const constants = require('../../../../db/constants');

describe('db: bot action: update: ', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Update bot action', () => {
    it('ok, bot action name', (done) => {
      BotAction.findOne({ where: { name: u.name } })
      .then((o) => o.update({ name: 'name2' }))
      .then(() => BotAction.findOne({ where: { name: 'name2' } }))
      .then((o) => {
        expect(o).to.have.property('name').to.equal('name2');
        done();
      })
      .catch(done);
    });

    it('fail, bot action bad name', (done) => {
      BotAction.findOne({ where: { name: u.name } })
      .then((o) => o.update({ name: '@!#!#@' }))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });
  });
});
